import sys
import os
from collections import defaultdict

# --- PATH SETUP ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

try:
    from Utils.pdfvectorising import vectorstore
except ImportError:
    from Utils.pdfvectorising import vectorstore

# --- MODEL ---
model = OllamaLLM(model="llama3.2", temperature=0.7)

# ============================================================================
#   CONVERSATION MEMORY (per-file sessions)
# ============================================================================
class ConversationMemory:
    """Maintains recent conversation history per project file."""

    def __init__(self, max_turns=3):
        self.max_turns = max_turns
        # {filter_filename: [(role, text), ...]}
        self.history = defaultdict(list)

    def add(self, filter_key, role, text):
        key = filter_key or "__global__"
        self.history[key].append((role, text[:500]))  # cap length
        # Keep only recent turns
        if len(self.history[key]) > self.max_turns * 2:
            self.history[key] = self.history[key][-self.max_turns * 2:]

    def get_formatted(self, filter_key):
        key = filter_key or "__global__"
        turns = self.history[key]
        if not turns:
            return ""
        lines = []
        for role, text in turns[-self.max_turns * 2:]:
            prefix = "User" if role == "user" else "Lumira"
            lines.append(f"{prefix}: {text}")
        return "\n".join(lines)

    def get_last_answer(self, filter_key):
        key = filter_key or "__global__"
        for role, text in reversed(self.history[key]):
            if role == "ai":
                return text
        return ""

    def clear(self, filter_key=None):
        if filter_key:
            self.history[filter_key or "__global__"] = []
        else:
            self.history.clear()


memory = ConversationMemory(max_turns=3)

# ============================================================================
#   PROMPT TEMPLATES (Context-Aware + Memory-Aware)
# ============================================================================

normal_template = """
You are Lumira, an AI guide at a project exhibition booth.

{history}

Context: {context}

Question: {question}

Rules:
• Answer in 2-3 sentences MAX. Be direct — the visitor is standing at a booth.
• Answer ONLY what was asked. Don't volunteer extra info.
• Use Context as your source. If it's not there, say "I don't have that info" in one line.
• Write the way people TALK: use contractions (it's, doesn't, you'll), vary sentence length, be conversational.
• NEVER use headers, bullet points, "Overview:", labels, or structured formats.
• NEVER say "Based on the context", "As an AI", or "According to the documents".

Answer:
"""

elaborate_template = """
You are Lumira, an AI guide. The visitor just asked you to elaborate or tell them more.

{history}

Context: {context}

Question: {question}

Rules:
• They already got a short answer. Now go DEEPER — 4-8 sentences.
• Don't repeat what you already said. Build on it with new details from Context.
• Explain the "how" and "why" behind what you mentioned before.
• Still conversational — no headers or bullet points.
• If Context has technical details, include them naturally.

Answer:
"""

deep_template = """
You are Lumira, a technical AI guide. The visitor explicitly asked for a detailed explanation.

{history}

Context: {context}

Question: {question}

Rules:
• Give a thorough technical explanation — 6-10 sentences.
• Structure it naturally: what it is → how it works → why it matters.
• Use technical terms from the Context but explain them clearly.
• Don't repeat prior conversation. Go deeper.
• Base everything on the Context.

Detailed Answer:
"""

comparison_template = """
You are Lumira at a project exhibition.

{history}

Context: {context}

Question: {question}

• The visitor wants a comparison. Identify what's being compared.
• State 2-3 key differences or similarities clearly.
• Keep it concise — 3-5 sentences total.
• Base on Context only.

Answer:
"""

summary_template = """
You are Lumira at a project exhibition.

{history}

Context: {context}

Question: {question}

• Give a clear overview in 4-6 sentences.
• Cover: what it is, what problem it solves, how it works, what makes it special.
• Conversational tone, no headers or bullet points.
• Base on Context only.

Summary:
"""

normal_prompt = ChatPromptTemplate.from_template(normal_template)
elaborate_prompt = ChatPromptTemplate.from_template(elaborate_template)
deep_prompt = ChatPromptTemplate.from_template(deep_template)
comparison_prompt = ChatPromptTemplate.from_template(comparison_template)
summary_prompt = ChatPromptTemplate.from_template(summary_template)

# ============================================================================
#   QUESTION CLASSIFICATION
# ============================================================================

def classify_question(question: str) -> str:
    """Classify how a real exhibition visitor would expect an answer."""
    q = question.lower().strip()

    # --- ELABORATE / FOLLOW-UP: they want MORE on what was just said ---
    elaborate_patterns = [
        "tell me more", "more about", "elaborate", "go on",
        "what else", "expand on", "can you elaborate",
        "more detail", "go deeper", "keep going",
        "explain more", "continue", "and then",
        "what do you mean", "why is that", "how so",
        "explain that", "more on that", "dig deeper",
    ]
    if any(p in q for p in elaborate_patterns):
        return "elaborate"

    # --- COMPARISON: "difference between", "vs", etc. ---
    comparison_patterns = [
        "difference between", "compare", "vs", "versus",
        "compared to", "similarities", "distinguish", "contrast",
        "how is it different", "what sets it apart",
    ]
    if any(p in q for p in comparison_patterns):
        return "comparison"

    # --- SUMMARY: wants a project overview ---
    summary_patterns = [
        "summarize", "summary", "overview", "what is this project",
        "tell me about", "describe the project", "what does this do",
        "main features", "key points", "in brief", "briefly explain",
        "give me an overview", "what's it about", "what is it about",
        "what is this", "what's this",
    ]
    if any(p in q for p in summary_patterns):
        return "summary"

    # --- DEEP: they EXPLICITLY ask for detail ---
    deep_patterns = [
        "explain in detail", "in detail", "detailed explanation",
        "technical details", "under the hood", "step by step",
        "breakdown", "comprehensive", "thorough explanation",
        "deep dive", "walk me through",
    ]
    if any(p in q for p in deep_patterns):
        return "deep"

    # --- DEFAULT: quick, direct answer ---
    return "normal"


# ============================================================================
#   FUZZY SMALL TALK
# ============================================================================

SMALL_TALK_RESPONSES = {
    "greetings": [
        "hi", "hello", "hey", "greetings", "good morning",
        "good afternoon", "good evening", "howdy", "sup",
        "what's up", "yo", "hi there", "hello there",
    ],
    "thanks": [
        "thanks", "thank you", "thx", "ty", "appreciated",
        "thank u", "thanks a lot", "much appreciated",
    ],
    "farewell": [
        "bye", "goodbye", "see you", "later", "cya",
        "take care", "see ya", "gotta go",
    ],
    "affirmation": [
        "okay", "ok", "sure", "cool", "nice", "great",
        "got it", "alright", "understood", "perfect", "awesome",
    ],
    "noise": [
        "hmm", "um", "uh", "huh", "err", "ah",
    ],
    "identity": [
        "who are you", "what is your name", "what's your name",
        "are you real", "are you ai", "are you a bot",
        "what can you do", "what do you do",
    ],
}

SMALL_TALK_REPLIES = {
    "greetings": [
        "Hi there! Ask me about anything on display.",
        "Hello! Welcome to the exhibition. What would you like to know?",
        "Hey! I'm ready to answer your questions about the project.",
    ],
    "thanks": [
        "You're welcome!",
        "Happy to help!",
        "No problem at all. Ask me anything else!",
    ],
    "farewell": [
        "Goodbye! Enjoy the rest of the exhibition.",
        "See you later! Hope I was helpful.",
        "Take care! Come back if you have more questions.",
    ],
    "affirmation": [
        "Is there anything else you'd like to know?",
        "Great! What's your next question?",
        "I'm ready when you are.",
    ],
    "noise": [
        "Take your time. I'm here when you're ready.",
        "I'm still listening.",
    ],
    "identity": [
        "I'm Lumira, your AI guide for this exhibition. I can answer questions about the projects on display.",
    ],
}


def match_small_talk(text: str):
    """Fuzzy match small talk using substring containment."""
    clean = text.strip().lower().replace('.', '').replace('!', '').replace('?', '').replace(',', '')

    for category, patterns in SMALL_TALK_RESPONSES.items():
        for pattern in patterns:
            if clean == pattern or (len(clean) < 25 and pattern in clean):
                import random
                replies = SMALL_TALK_REPLIES[category]
                return random.choice(replies)
    return None


# ============================================================================
#   MAIN FUNCTION
# ============================================================================

def ask_lumira(question, filter_filename=None):
    print(f"🤖 Processing: {question} | Filter: {filter_filename}")

    # 1. Check Small Talk (fuzzy)
    small_talk_reply = match_small_talk(question)
    if small_talk_reply:
        yield small_talk_reply
        return

    # 2. Check for Noise (very short inputs)
    clean_q = question.strip().lower().replace('.', '').replace('!', '').replace('?', '')
    if len(clean_q) < 2 and clean_q not in ["ai", "ui", "ux"]:
        yield "I didn't quite catch that. Could you rephrase?"
        return

    try:
        # 3. CLASSIFY QUESTION
        mode = classify_question(question)
        print(f"🎯 Mode: {mode.upper()}")

        # 4. BUILD SEARCH QUERY
        # For elaborations, enhance the search query with prior context
        search_query = question
        if mode == "elaborate":
            last_answer = memory.get_last_answer(filter_filename)
            if last_answer:
                search_query = f"{last_answer[:200]} {question}"
                print(f"🔗 Enhanced search with prior context")

        # 5. CONFIGURE RETRIEVER
        k_values = {"deep": 12, "comparison": 10, "summary": 14, "elaborate": 10, "normal": 8}
        search_kwargs = {"k": k_values.get(mode, 8)}

        if filter_filename:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            full_path = os.path.join(base_dir, "Dataset", filter_filename)
            search_kwargs["filter"] = {"source": full_path}
            print(f"🔒 Locking search to: {filter_filename}")

        print(f"📊 Retrieving {search_kwargs['k']} chunks")

        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs=search_kwargs
        )

        # 6. RETRIEVE CONTEXT
        context_docs = retriever.invoke(search_query)

        print(f"🔎 Found {len(context_docs)} relevant chunks.")
        if context_docs:
            print(f"📄 Top Context: {context_docs[0].page_content[:200]}...")
        else:
            print("⚠️ NO CONTEXT FOUND!")

        # 7. FORMAT CONTEXT
        formatted_context = "\n\n".join([doc.page_content for doc in context_docs])

        # 8. GET CONVERSATION HISTORY
        history = memory.get_formatted(filter_filename)
        if not history:
            history = "(No prior conversation)"

        # 9. SELECT PROMPT
        prompt_map = {
            "normal": normal_prompt,
            "elaborate": elaborate_prompt,
            "deep": deep_prompt,
            "comparison": comparison_prompt,
            "summary": summary_prompt,
        }
        selected_prompt = prompt_map.get(mode, normal_prompt)
        chain = selected_prompt | model

        # 10. STORE USER MESSAGE IN MEMORY
        memory.add(filter_filename, "user", question)

        # 11. GENERATE & STREAM ANSWER
        full_response = ""
        for chunk in chain.stream({
            "context": formatted_context,
            "question": question,
            "history": history
        }):
            full_response += chunk
            yield chunk

        # 12. STORE AI RESPONSE IN MEMORY
        memory.add(filter_filename, "ai", full_response)

    except Exception as e:
        print(f"❌ Error in ask_lumira: {e}")
        yield f"System Error: {e}"


# --- CLI LOOP (For testing without Frontend) ---
if __name__ == "__main__":
    print("--- CLI Mode (Type 'q' to quit) ---")
    while True:
        qn = input("\nAsk: ")
        if qn.lower() == "q": break

        print("Lumira: ", end="")
        for chunk in ask_lumira(qn, None):
            print(chunk, end="", flush=True)
        print()