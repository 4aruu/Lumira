import sys
import os
import re
from collections import defaultdict

# --- PATH SETUP ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

try:
    from Utils.pdfvectorising import vectorstore
except ImportError:
    from Utils.pdfvectorising import vectorstore

# --- MODEL (single shared instance, keep_alive prevents cold-starts) ---
# temperature=0.2 keeps the model factual and grounded in the dataset.
# Higher values (0.5+) cause hallucination of terms that don't exist in context.
model = OllamaLLM(model="llama3.2", temperature=0.2, keep_alive="30m")

# --- RETRIEVER CACHE (avoids rebuilding ChromaDB connections every query) ---
_retriever_cache: dict = {}

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


def _memory_key(session_id: str | None, filter_filename: str | None) -> str:
    """
    Determine the memory key for this request.
    Priority: session_id > filename > '__global__'
    Using session_id ensures each visitor gets isolated history.
    """
    if session_id:
        return session_id
    return filter_filename or "__global__"

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
• Use ONLY the Context above as your source. If the answer is NOT in the Context, say "I don't have that information right now" — do NOT guess or make things up.
• NEVER invent names, terms, acronyms, or features that are not explicitly written in the Context. If a word does not appear in Context, do not use it.
• Write the way people TALK: use contractions (it's, doesn't, you'll), vary sentence length, be conversational.
• NEVER use headers, bullet points, "Overview:", labels, or structured formats.
• NEVER say "Based on the context", "As an AI", or "According to the documents".
• NEVER start your answer with a greeting (Hello, Hi, Hey, Good morning, etc.).
• Jump straight into the answer.

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
• ONLY use names, terms, and facts that appear in the Context. Do NOT invent anything.
• If the Context doesn't have more detail, say so honestly rather than fabricating.
• NEVER start with a greeting (Hello, Hi, Hey, etc.). Jump straight into the elaboration.

Answer:
"""

deep_template = """
You are Lumira, a technical AI guide. The visitor explicitly asked for a detailed explanation.

{history}

Context: {context}

Question: {question}

Rules:
• Give a thorough but focused explanation — 4-6 sentences MAX.
• Structure it naturally: what it is → how it works → why it matters.
• Use technical terms from the Context but explain them clearly.
• Don't repeat prior conversation. Go deeper.
• Base everything STRICTLY on the Context. NEVER invent technical terms, names, or features.
• If the Context doesn't cover something, say "I don't have details on that" — never guess.
• Keep it under 40 seconds of spoken word. People lose attention after that.
• NEVER start with a greeting (Hello, Hi, Hey, etc.). Start directly with the explanation.

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
• Base on Context ONLY. Do NOT invent names, terms, or facts not found in the Context.
• If a comparison cannot be made from the Context, say so.
• NEVER start with a greeting (Hello, Hi, Hey, etc.).

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
• Base on Context ONLY. Every name, feature, and term you mention must appear in the Context.
• Do NOT fabricate or hallucinate any information. If it's not in the Context, leave it out.
• NEVER start with a greeting (Hello, Hi, Hey, Welcome, Good morning, etc.). Start directly with the summary.

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
#   GIBBERISH / UNINTELLIGIBLE INPUT DETECTION
# ============================================================================

# Common English words for a quick dictionary check (top ~200 function words)
_COMMON_WORDS = frozenset([
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their",
    "what", "so", "up", "out", "if", "about", "who", "get", "which",
    "go", "me", "when", "make", "can", "like", "time", "no", "just",
    "him", "know", "take", "people", "into", "year", "your", "good",
    "some", "could", "them", "see", "other", "than", "then", "now",
    "look", "only", "come", "its", "over", "think", "also", "back",
    "after", "use", "two", "how", "our", "work", "first", "well",
    "way", "even", "new", "want", "because", "any", "these", "give",
    "day", "most", "us", "is", "are", "was", "were", "been", "has",
    "had", "did", "does", "doing", "am", "being", "here", "where",
    "why", "how", "much", "many", "very", "too", "more", "yes",
    "tell", "explain", "show", "help", "please", "project", "data",
    "system", "software", "app", "feature", "code", "model", "algorithm",
    "database", "server", "client", "user", "api", "function", "class",
    "method", "test", "build", "run", "deploy", "machine", "learning",
    "deep", "neural", "network", "train", "input", "output", "process",
    "detail", "compare", "difference", "between", "summary", "overview",
])


def is_gibberish(text: str) -> bool:
    """Detect unintelligible / gibberish input.

    Returns True if the input appears to be random characters,
    keyboard mashing, or otherwise nonsensical.
    """
    clean = re.sub(r'[^a-zA-Z\s]', '', text).strip().lower()

    # Empty after stripping non-alpha
    if not clean:
        return True

    words = clean.split()
    if not words:
        return True

    # --- Check 1: Excessive consonant clusters ---
    # Real English rarely has 5+ consonants in a row
    if re.search(r'[^aeiou\s]{5,}', clean):
        return True

    # --- Check 2: Repeated characters (3+ of the same in a row) ---
    if re.search(r'(.)(\1){2,}', clean):
        return True

    # --- Check 3: Words with no vowels (for words > 2 chars) ---
    no_vowel_count = sum(1 for w in words if len(w) > 2 and not re.search(r'[aeiou]', w))
    if len(words) > 0 and no_vowel_count / len(words) > 0.5:
        return True

    # --- Check 4: Dictionary word ratio ---
    # If fewer than 30% of words are recognizable, it's gibberish
    if len(words) >= 2:
        known = sum(1 for w in words if w in _COMMON_WORDS or len(w) <= 2)
        ratio = known / len(words)
        if ratio < 0.25:
            return True

    # --- Check 5: Single word that's just random chars (> 6 chars, not a real word) ---
    if len(words) == 1 and len(words[0]) > 6 and words[0] not in _COMMON_WORDS:
        vowel_count = sum(1 for c in words[0] if c in 'aeiou')
        if vowel_count / len(words[0]) < 0.2:
            return True

    return False


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

# --- PRE-BUILT CHAIN CACHE (avoids re-creating chains every query) ---
_chain_cache = {
    "normal":     normal_prompt | model,
    "elaborate":  elaborate_prompt | model,
    "deep":       deep_prompt | model,
    "comparison": comparison_prompt | model,
    "summary":    summary_prompt | model,
}


def _get_retriever(filter_filename: str | None, mode: str):
    """
    Return a cached retriever for the given (filename, mode) pair.
    Building a retriever is cheap but calling vectorstore.as_retriever()
    repeatedly inside a hot loop accumulates objects and slows down ChromaDB.
    """
    k_values = {"deep": 8, "comparison": 10, "summary": 14, "elaborate": 10, "normal": 8}
    k = k_values.get(mode, 8)

    cache_key = (filter_filename, mode)
    if cache_key in _retriever_cache:
        return _retriever_cache[cache_key]

    search_kwargs: dict = {"k": k}
    if filter_filename:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(base_dir, "Dataset", filter_filename)
        search_kwargs["filter"] = {"source": full_path}
        print(f"🔒 Locking search to: {filter_filename}")

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs=search_kwargs
    )
    # Cache up to 20 unique (file, mode) combos; evict oldest when full
    if len(_retriever_cache) >= 20:
        oldest_key = next(iter(_retriever_cache))
        del _retriever_cache[oldest_key]
    _retriever_cache[cache_key] = retriever
    return retriever


def ask_lumira(question, filter_filename=None, session_id=None):
    print(f"🤖 Processing: {question} | Filter: {filter_filename} | Session: {session_id}")

    mem_key = _memory_key(session_id, filter_filename)

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

    # 3. Check for Gibberish / unintelligible input
    if is_gibberish(question):
        print(f"🚫 Gibberish detected: {question}")
        yield "I didn't quite understand that. Could you rephrase your question?"
        return

    try:
        # 4. CLASSIFY QUESTION
        mode = classify_question(question)
        print(f"🎯 Mode: {mode.upper()}")

        # 5. BUILD SEARCH QUERY
        # For elaborations, enhance the search query with prior context
        search_query = question
        if mode == "elaborate":
            last_answer = memory.get_last_answer(mem_key)
            if last_answer:
                search_query = f"{last_answer[:200]} {question}"
                print(f"🔗 Enhanced search with prior context")

        # 6. GET CACHED RETRIEVER (avoids per-query ChromaDB overhead)
        print(f"📊 Retrieving with mode={mode}")
        retriever = _get_retriever(filter_filename, mode)

        # 7. RETRIEVE CONTEXT
        context_docs = retriever.invoke(search_query)

        print(f"🔎 Found {len(context_docs)} relevant chunks.")
        if context_docs:
            print(f"📄 Top Context: {context_docs[0].page_content[:200]}...")
        else:
            print("⚠️ NO CONTEXT FOUND!")

        # 8. FORMAT CONTEXT (cap total to ~3000 chars to avoid prompt bloat)
        raw_context = "\n\n".join([doc.page_content for doc in context_docs])
        formatted_context = raw_context[:3000]

        # 8b. CONTEXT QUALITY GATE — if retrieval returned nothing useful,
        # give a polite fallback instead of letting the LLM hallucinate.
        if not formatted_context.strip():
            yield "I don't have enough information to answer that right now. Could you try rephrasing?"
            memory.add(mem_key, "user", question)
            memory.add(mem_key, "ai", "I don't have enough information to answer that.")
            return

        # 9. GET CONVERSATION HISTORY (scoped to this session)
        history = memory.get_formatted(mem_key)
        if not history:
            history = "(No prior conversation)"

        # 10. GET CACHED CHAIN
        chain = _chain_cache.get(mode, _chain_cache["normal"])

        # 11. STORE USER MESSAGE IN MEMORY (session-scoped)
        memory.add(mem_key, "user", question)

        # 12. GENERATE & STREAM ANSWER
        full_response = ""
        for chunk in chain.stream({
            "context": formatted_context,
            "question": question,
            "history": history
        }):
            full_response += chunk
            yield chunk

        # 13. STORE AI RESPONSE IN MEMORY (session-scoped)
        memory.add(mem_key, "ai", full_response)


    except ConnectionError as e:
        print(f"❌ Connection error in ask_lumira: {e}")
        # Prefix with ERROR_NOTIFICATION: so the frontend shows a toast, not chat text
        yield f"ERROR_NOTIFICATION: Connection lost. Please check the server."
    except TimeoutError as e:
        print(f"❌ Timeout in ask_lumira: {e}")
        yield f"ERROR_NOTIFICATION: Request timed out. Please try again."
    except Exception as e:
        err_str = str(e)
        print(f"❌ Error in ask_lumira: {err_str}")
        # Ollama not running / refused connection
        if "10061" in err_str or "refused" in err_str.lower() or "connection" in err_str.lower():
            yield f"ERROR_NOTIFICATION: Cannot reach the AI model. Make sure Ollama is running."
        else:
            yield f"ERROR_NOTIFICATION: Something went wrong. Please try again."


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