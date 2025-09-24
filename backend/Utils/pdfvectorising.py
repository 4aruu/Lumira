import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
import re


root_folder = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))#goes to the root directory (Main Project)
pdf_path = os.path.join(root_folder,"Dataset","InfoBotDataset.pdf")
# print(os.path.exists(pdf_path)) to check whether pdf in path
loader = PyPDFLoader(pdf_path)
pages = loader.load()

full_text = "\n".join([page.page_content for page in pages])



def split_sections(text):
    headings = [
        "Executive Summary", "Introduction", "Project Objectives ",
        "Project Scope", "Methodology", "Technology Stack",
        "Detailed Description", "Resources Used", "Implementation Plan",
        "Results and Deliverables", "Challenges and Risks", "Lessons Learned",
        "Recommendations", "Conclusion", "References"
    ]
    pattern = r"\d+\.\s(" + "|".join(headings) + r")\s"
    matches = list(re.finditer(pattern, text))
    sections = {}
    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        key = match.group(1).strip()
        sections[key] = text[start:end].strip()
    return sections

sections = split_sections(full_text)
if sections :
    print("Sections created successfully")
# Combine sections into one string for semantic search
content_text = "\n\n".join([f"{sec}: {txt}" for sec, txt in sections.items()])
print(content_text)

# Metadata example
metadata = {
    "project_title": "InfoBot Academic Assistant",
    "tech_stack": sections.get("Technology Stack", ""),
    "objectives": sections.get("Project Objectives", ""),
}

# Create Document object from LangChai
project_document = Document(page_content=content_text, metadata=metadata, id="InfoBot_2025")


embeddings = OllamaEmbeddings(model= "mxbai-embed-large")


vector_db_path = os.path.join(root_folder, "Database")

if not os.path.exists(vector_db_path):
    print("Creating database directory")
    os.makedirs(vector_db_path)

vector_store = Chroma(
    collection_name = "InfobotData",
    persist_directory=vector_db_path,
    embedding_function=embeddings
)
vector_store.add_documents([project_document])
print("Vectorised")
retriever = vector_store.as_retriever(search_kwargs={"k": 3})