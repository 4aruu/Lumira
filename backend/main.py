from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import shutil
import os
import sys

# Add current directory to path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the refactored function from bot.py
# If this line fails, ensure bot.py is saved correctly!
from bot import ask_lumira

app = FastAPI()

# --- Security: Allow Frontend to Connect ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Data Models ---
class ChatRequest(BaseModel):
    message: str


# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "Lumira AI Backend is Online"}


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Receives text from React, sends to LangChain/Ollama, returns answer.
    """
    try:
        user_query = request.message
        # Call the function we created in bot.py
        ai_response = ask_lumira(user_query)
        return {"response": ai_response}
    except Exception as e:
        print(f"Error processing query: {e}")
        return {"response": "I'm having trouble accessing my knowledge base right now."}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Saves uploaded PDF to the Dataset folder for vectorization.
    """
    # Define path to your Dataset folder
    # Based on your pdfvectorising.py logic, it expects 'Dataset' in the root/backend folder
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Dataset")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"File saved to: {file_path}")
    return {"filename": file.filename, "status": "File uploaded. Please restart server to re-index."}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)