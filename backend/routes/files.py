import os
import re
import shutil
import json
import tempfile

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from langchain_chroma import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

from ingest import ingest_document

router = APIRouter()

# --- Constants ---
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf"}
CONVERT_ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx"}


def _get_upload_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


# ── QR Lifecycle State ────────────────────────────────────────────────────────
# Persisted as JSON mapping {filename: "inactive"|"active"|"destroyed"}
#   - inactive  : QR generated but event hasn't started (default for new uploads)
#   - active    : Event is live, visitors can chat
#   - destroyed : Event is over, QR is permanently dead — nobody can access
#
# Backwards-compat: old boolean entries (True/False) are migrated on read.

_VALID_STATES = {"inactive", "active", "destroyed"}


def _qr_status_path() -> str:
    return os.path.join(_get_upload_dir(), ".qr_status.json")


def _load_qr_status() -> dict:
    path = _qr_status_path()
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            # Migrate old boolean entries → string states
            migrated = {}
            for k, v in raw.items():
                if v is True:
                    migrated[k] = "active"
                elif v is False:
                    migrated[k] = "inactive"
                elif v in _VALID_STATES:
                    migrated[k] = v
                else:
                    migrated[k] = "inactive"
            return migrated
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _save_qr_status(status: dict):
    path = _qr_status_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(status, f, indent=2)


def _get_qr_state(filename: str) -> str:
    """Return the QR lifecycle state for a file. Default: 'inactive' for new files."""
    status = _load_qr_status()
    return status.get(filename, "inactive")


def _is_qr_active(filename: str) -> bool:
    """Return True only if the file's QR is in 'active' state."""
    return _get_qr_state(filename) == "active"


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal characters and dangerous patterns."""
    # Strip directory components
    filename = os.path.basename(filename)
    # Remove any non-alphanumeric chars except dots, dashes, underscores, spaces
    filename = re.sub(r'[^\w\s\-.]', '', filename)
    # Collapse multiple dots/spaces
    filename = re.sub(r'\.{2,}', '.', filename)
    filename = filename.strip('. ')
    return filename if filename else "unnamed.pdf"


@router.get("/api/files/{filename}/exists")
def check_file_exists(filename: str):
    """Check if a dataset file exists and return its QR lifecycle state."""
    upload_dir = _get_upload_dir()
    safe_name = _sanitize_filename(filename)
    file_path = os.path.join(upload_dir, safe_name)
    exists = os.path.isfile(file_path)
    qr_state = _get_qr_state(safe_name) if exists else "destroyed"
    return {
        "exists": exists,
        "filename": safe_name,
        "qr_active": qr_state == "active",   # backwards-compat for frontend
        "qr_state": qr_state,                 # full lifecycle state
    }


@router.post("/api/files/{filename}/toggle-qr")
def toggle_qr_status(filename: str):
    """Toggle a file's QR between active and inactive. Cannot toggle destroyed QRs."""
    upload_dir = _get_upload_dir()
    safe_name = _sanitize_filename(filename)
    file_path = os.path.join(upload_dir, safe_name)

    if not os.path.isfile(file_path):
        raise HTTPException(404, f"File \"{safe_name}\" not found.")

    status = _load_qr_status()
    current = status.get(safe_name, "inactive")

    if current == "destroyed":
        raise HTTPException(400, "This QR has been permanently destroyed and cannot be reactivated.")

    new_state = "active" if current == "inactive" else "inactive"
    status[safe_name] = new_state
    _save_qr_status(status)
    print(f"{'🟢' if new_state == 'active' else '🔴'} QR for {safe_name}: {new_state.upper()}")
    return {"filename": safe_name, "qr_active": new_state == "active", "qr_state": new_state}


@router.post("/api/files/{filename}/destroy-qr")
def destroy_qr(filename: str):
    """Permanently destroy a QR. This is irreversible — the QR link becomes permanently dead."""
    upload_dir = _get_upload_dir()
    safe_name = _sanitize_filename(filename)
    file_path = os.path.join(upload_dir, safe_name)

    if not os.path.isfile(file_path):
        raise HTTPException(404, f"File \"{safe_name}\" not found.")

    status = _load_qr_status()
    status[safe_name] = "destroyed"
    _save_qr_status(status)
    print(f"💀 QR DESTROYED for {safe_name} — permanently inaccessible")
    return {"filename": safe_name, "qr_active": False, "qr_state": "destroyed"}


@router.post("/api/files/{filename}/regenerate-qr")
def regenerate_qr(filename: str):
    """Regenerate a destroyed QR — resets it to 'inactive' for a fresh event cycle.
    The dataset and analytics are preserved; only the QR access state is reset."""
    upload_dir = _get_upload_dir()
    safe_name = _sanitize_filename(filename)
    file_path = os.path.join(upload_dir, safe_name)

    if not os.path.isfile(file_path):
        raise HTTPException(404, f"File \"{safe_name}\" not found.")

    status = _load_qr_status()
    current = status.get(safe_name, "inactive")
    if current != "destroyed":
        raise HTTPException(400, "Only destroyed QRs can be regenerated.")

    status[safe_name] = "inactive"
    _save_qr_status(status)
    print(f"♻️ QR REGENERATED for {safe_name} → inactive (ready for next event)")
    return {"filename": safe_name, "qr_active": False, "qr_state": "inactive"}


@router.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # --- Validate file extension ---
    if not file.filename:
        raise HTTPException(400, "No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Invalid file type '{ext}'. Only PDF files are allowed."
        )

    safe_name = _sanitize_filename(file.filename)
    upload_dir = _get_upload_dir()
    file_path = os.path.join(upload_dir, safe_name)

    # --- Check for duplicates ---
    if os.path.exists(file_path):
        raise HTTPException(
            409,
            f"A file named \"{safe_name}\" already exists. Delete it first or rename your file."
        )

    # --- Read and validate file size ---
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            413,
            f"File too large ({len(content) / (1024 * 1024):.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB."
        )

    if len(content) == 0:
        raise HTTPException(400, "File is empty.")

    # --- Save file ---
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    background_tasks.add_task(ingest_document, file_path)
    return {"status": "File uploaded successfully", "filename": safe_name}


@router.get("/api/files")
def list_files():
    upload_dir = _get_upload_dir()
    qr_status = _load_qr_status()
    try:
        file_list = []
        for f in os.listdir(upload_dir):
            full_path = os.path.join(upload_dir, f)
            if not os.path.isfile(full_path):
                continue
            if f.startswith("."):      # hide .qr_status.json and other dot-files
                continue
            file_list.append({
                "name": f,
                "size": f"{os.path.getsize(full_path) / 1024:.1f} KB",
                "status": "Active",
                "qr_active": qr_status.get(f, "inactive") == "active",
                "qr_state": qr_status.get(f, "inactive"),
            })
        return {"files": file_list}
    except Exception as e:
        print(f"❌ Error listing files: {e}")
        return {"files": []}


@router.delete("/api/files/{filename}")
def delete_file(filename: str):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    safe_name = _sanitize_filename(filename)
    file_path = os.path.join(base_dir, "Dataset", safe_name)
    db_path = os.path.join(base_dir, "chroma_db")

    # --- Check file exists ---
    if not os.path.exists(file_path):
        raise HTTPException(404, f"File \"{safe_name}\" not found.")

    # --- Delete physical file ---
    try:
        os.remove(file_path)
    except OSError as e:
        print(f"❌ Failed to delete file: {e}")
        raise HTTPException(500, f"Failed to delete file: {e}")

    # --- Clean up vector store ---
    try:
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        vector_store = Chroma(persist_directory=db_path, embedding_function=embeddings)
        vector_store.delete(where={"source": file_path})
        print(f"✅ Deleted vectors for: {safe_name}")
    except Exception as e:
        # Vector cleanup is non-critical — file is already deleted
        print(f"⚠️ Vector cleanup failed for {safe_name}: {e}")

    return {"status": "Deleted", "filename": safe_name}


# ─────────────────────────────────────────────────────────────────────────────
#   DOCUMENT → DATASET CONVERTER
# ─────────────────────────────────────────────────────────────────────────────

def _extract_text_from_file(file_path: str, ext: str) -> str:
    """Extract plain text from PDF, DOCX, or TXT."""
    if ext == ".pdf":
        from langchain_community.document_loaders import PyPDFLoader
        docs = PyPDFLoader(file_path).load()
        return "\n\n".join(d.page_content for d in docs)
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    elif ext == ".docx":
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(file_path)
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError:
            raise HTTPException(422, "python-docx not installed. Install it with: pip install python-docx")
    else:
        raise HTTPException(400, f"Unsupported file type: {ext}")


def _convert_text_to_dataset_pdf(text: str, output_path: str, original_name: str):
    """Write extracted text content into a clean, ingest-ready PDF."""
    try:
        from fpdf import FPDF
    except ImportError:
        raise HTTPException(422, "fpdf2 not installed. Run: pip install fpdf2")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, f"Knowledge Dataset: {original_name}", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.ln(4)

    # Split into paragraphs and write
    for para in text.split("\n"):
        para = para.strip()
        if not para:
            pdf.ln(4)
            continue
        # encode to latin-1 dropping chars that can't be encoded
        try:
            pdf.multi_cell(0, 7, para)
        except Exception:
            safe_para = para.encode("latin-1", errors="replace").decode("latin-1")
            pdf.multi_cell(0, 7, safe_para)

    pdf.output(output_path)


@router.post("/api/convert")
async def convert_document_to_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload any PDF / TXT / DOCX document.
    The backend extracts all text, wraps it into a clean PDF, saves it as a
    new dataset, and triggers ingestion into the vector store.
    The resulting dataset is immediately available in the dashboard.
    """
    if not file.filename:
        raise HTTPException(400, "No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in CONVERT_ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Unsupported file type '{ext}'. Allowed: PDF, TXT, DOCX."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(400, "File is empty.")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            413,
            f"File too large ({len(content) / (1024 * 1024):.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB."
        )

    # Build output dataset name (always a .pdf in the Dataset dir)
    base_name = re.sub(r'\.[^.]+$', '', _sanitize_filename(file.filename))
    dataset_filename = f"{base_name}_converted.pdf"
    upload_dir = _get_upload_dir()
    output_path = os.path.join(upload_dir, dataset_filename)

    if os.path.exists(output_path):
        raise HTTPException(
            409,
            f'"{dataset_filename}" already exists. Delete it first or rename the source file.'
        )

    # Save original temporarily so we can extract text
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 1. Extract raw text
        print(f"📄 Converting: {file.filename} → {dataset_filename}")
        raw_text = _extract_text_from_file(tmp_path, ext)
        if not raw_text.strip():
            raise HTTPException(422, "Could not extract any text from the document.")

        # 2. Write clean dataset PDF
        _convert_text_to_dataset_pdf(raw_text, output_path, base_name)
        print(f"✅ Dataset PDF written: {output_path}")

        # 3. Ingest into Chroma in the background
        background_tasks.add_task(ingest_document, output_path)

        return {
            "status": "converted",
            "dataset_filename": dataset_filename,
            "characters_extracted": len(raw_text),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Conversion error: {e}")
        # Clean up partial output if any
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(500, f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
