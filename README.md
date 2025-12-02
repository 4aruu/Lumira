LUMIRA — AI Project Expo Assistant

LUMIRA is your smart, context-aware AI-powered project assistant.
Give it a PDF → It studies it → Vectorizes your content → Answers expo questions like a pro.
Zero hallucinations. Zero confusion. Pure contextual accuracy.

🚀 What Lumira Does

📄 Reads & extracts your project PDF

🧠 Breaks it into clean sections

🔍 Converts it into vector embeddings using mxbai-embed-large

🗂 Stores everything inside ChromaDB

🤖 Answers questions using Llama 3.2 with context-only responses

🎤 Perfect for project expos, viva, presentations & documentation

🧩 Tech Stack

Python

LangChain

Ollama (Llama 3.2)

Chroma Vector DB

mxbai-embed-large embeddings

PyPDFLoader for PDF parsing

📂 Folder Structure
/Lumira
│── Dataset/
│   └── InfoBotDataset.pdf
│── Database/
│── Utils/
│   └── pdfvectorising.py
│── bot.py
│── README.md

⚙️ How It Works
1️⃣ Vectorizer — pdfvectorising.py

Loads the PDF

Extracts sections (Executive Summary, Intro, Methodology, etc.)

Embeds the cleaned content

Saves everything to ChromaDB

2️⃣ Bot — bot.py

Loads your vector store

Retrieves context relevant to your question

Feeds it to Llama 3.2

Responds only based on your project PDF

▶️ Quick Start
Install dependencies
pip install langchain-community langchain-chroma langchain-ollama chromadb pypdf

Start Ollama
ollama run llama3.2

Create the vector database
python Utils/pdfvectorising.py

Run the bot
python bot.py

💬 Sample Interaction
Ask question: What technologies are used in this project?

→ LUMIRA answers based strictly on your PDF data.

🌟 Why LUMIRA?

Expo students stop panicking

Answers are crisp and contextual

No hallucinations

Reusable for any project — just replace the PDF

Lightweight, local, private

📜 License

This project is open-source under MIT.
Feel free to improve it, remix it, or build bigger things on top. 💚
