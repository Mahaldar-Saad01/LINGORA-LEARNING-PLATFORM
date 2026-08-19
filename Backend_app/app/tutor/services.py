import importlib
import json
import logging
import os
import time
from typing import Generator, List, Dict

logger = logging.getLogger(__name__)

# Safe module-level import for Google Generative AI SDK
genai_module = None
SDK_TYPE = None  # 'legacy' (google.generativeai) or 'new' (google.genai)

try:
    genai_legacy = importlib.import_module('google.generativeai')
    genai_module = genai_legacy
    SDK_TYPE = 'legacy'
except Exception as e_legacy:
    try:
        genai_new = importlib.import_module('google.genai')
        genai_module = genai_new
        SDK_TYPE = 'new'
    except Exception as e_new:
        logger.warning(
            f"Google Generative AI SDK is not available in the current environment: legacy error ({e_legacy}), new SDK error ({e_new})"
        )
        genai_module = None
        SDK_TYPE = None


def build_system_instruction(user) -> str:
    """
    Construct system prompt configuring Gemini as Lingora's AI Language Tutor.
    """
    user_name = getattr(user, 'name', 'Learner')
    target_lang = getattr(user, 'target_language', 'English') or 'English'
    preferred_lang = getattr(user, 'preferred_language', 'English') or 'English'
    level = getattr(user, 'language_level', 'intermediate') or 'intermediate'

    return (
        f"You are Lingora's AI Language Tutor, a friendly, encouraging, and highly structured personal language teacher.\n"
        f"Student Context:\n"
        f"- Name: {user_name}\n"
        f"- Target Language: {target_lang}\n"
        f"- Explanation/Native Language: {preferred_lang}\n"
        f"- Proficiency Level: {level}\n\n"
        f"RESPONSE FORMATTING MANDATE:\n"
        f"Always structure your answers into distinct, visually organized sections using Markdown format with emojis:\n\n"
        f"### 💡 Direct Answer & Concept\n"
        f"Provide a clear, simple explanation tailored for a {level} learner.\n\n"
        f"### 📝 Key Example Sentences\n"
        f"Provide 2 practical example sentences in {target_lang} with translations in {preferred_lang}.\n\n"
        f"### 🎯 Pro Tip & Practice\n"
        f"Share 1 useful tip and ask 1 quick practice question in {target_lang} for the student to attempt.\n\n"
        f"Rules:\n"
        f"1. Highlight key vocabulary and terms using **bold** text.\n"
        f"2. Keep paragraphs concise and easy to read.\n"
        f"3. Clearly highlight any grammar corrections if the student made a mistake.\n"
    )


def mock_stream_response(user_message: str, user) -> Generator[str, None, None]:
    """
    Intelligent fallback streaming generator for doubt clarification.
    """
    target_lang = getattr(user, 'target_language', 'English') or 'English'
    user_name = getattr(user, 'name', 'Learner')
    msg_lower = user_message.lower()

    if 'explain' in msg_lower or 'rule' in msg_lower or 'grammar' in msg_lower:
        explanation = (
            f"Here is a quick doubt clarification for **{user_name}** regarding **{target_lang}** grammar:\n\n"
            f"1. **Core Concept**: Sentences in {target_lang} follow structured word order to connect subject, verb, and object clearly.\n"
            f"2. **Rule Tip**: Notice how agreement rules apply to gender and number across words.\n"
            f"3. **Example**: *\"La casa grande\"* (The big house) - the adjective comes after the noun!\n\n"
            f"Keep practicing! Ask me any follow-up question."
        )
    elif 'example' in msg_lower or 'sentence' in msg_lower:
        explanation = (
            f"Here are practical example sentences in **{target_lang}**:\n\n"
            f"- 🌟 **Basic**: *\"Hola, ¿cómo estás hoy?\"* (Hello, how are you today?)\n"
            f"- 🚀 **Intermediate**: *\"Estoy aprendiendo un nuevo idioma con Lingora.\"* (I am learning a new language with Lingora.)\n"
            f"- 💡 **Tip**: Try reading these aloud to build muscle memory!"
        )
    elif 'pronounc' in msg_lower or 'speak' in msg_lower:
        explanation = (
            f"Here is a pronunciation guide for **{target_lang}**:\n\n"
            f"- 🗣️ **Vowels**: Pure and crisp (A, E, I, O, U).\n"
            f"- 🎵 **Rhythm**: Syllable-timed. Give equal stress to each syllable!\n"
            f"- 💡 **Practice**: Break words into chunks and repeat 3 times."
        )
    elif 'translate' in msg_lower:
        explanation = (
            f"Translation Help for **{target_lang}**:\n\n"
            f"You asked: *\"{user_message}\"*\n\n"
            f"Translation into {target_lang}:\n"
            f"> *\"Practicar todos los días te ayuda a mejorar rápidamente.\"*\n\n"
            f"Let me know if you want me to break down any specific word!"
        )
    else:
        explanation = (
            f"Hello {user_name}! I'm your **Lingora AI Doubt Clarifier**.\n\n"
            f"Regarding your query: *\"{user_message}\"*\n\n"
            f"• **Key Takeaway**: Practice actively in {target_lang} by forming short sentences.\n"
            f"• **Recommendation**: Review vocabulary from your current lesson to reinforce memory.\n\n"
            f"Feel free to ask another doubt anytime!"
        )

    chunks = [explanation[i:i+30] for i in range(0, len(explanation), 30)]
    for chunk in chunks:
        time.sleep(0.04)
        yield chunk


def generate_gemini_rest_stream(history: List[Dict[str, str]], user_message: str, user) -> Generator[str, None, None]:
    """
    Direct REST API stream for Google Gemini when SDK package is not installed.
    Uses Python's standard urllib.request with zero dependencies!
    """
    import urllib.request
    import urllib.error

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        yield from mock_stream_response(user_message, user)
        return

    system_instruction = build_system_instruction(user)
    model_name = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?key={api_key}&alt=sse"

    contents = []
    for msg in history:
        role = "user" if msg.get("sender") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("content", "")}]
        })
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        }
    }

    try:
        req_data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            has_yielded = False
            for line_bytes in response:
                line = line_bytes.decode('utf-8', errors='ignore')
                if line.startswith("data:"):
                    json_str = line[5:].strip()
                    if not json_str:
                        continue
                    try:
                        data = json.loads(json_str)
                        candidates = data.get("candidates", [])
                        for candidate in candidates:
                            parts = candidate.get("content", {}).get("parts", [])
                            for part in parts:
                                text_chunk = part.get("text", "")
                                if text_chunk:
                                    has_yielded = True
                                    yield text_chunk
                    except Exception:
                        pass
            if not has_yielded:
                yield from mock_stream_response(user_message, user)
    except Exception as e:
        logger.error(f"Direct Gemini REST API stream failed ({e}). Using mock stream.")
        yield from mock_stream_response(user_message, user)


def generate_gemini_stream(history: List[Dict[str, str]], user_message: str, user) -> Generator[str, None, None]:
    """
    Stream responses using Google Generative AI SDK or direct REST fallback.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key:
        logger.info("GEMINI_API_KEY not set. Using fallback mock stream.")
        yield from mock_stream_response(user_message, user)
        return

    if not genai_module:
        logger.info("Google Generative AI SDK not installed. Falling back to direct Gemini REST API stream.")
        yield from generate_gemini_rest_stream(history, user_message, user)
        return

    try:
        system_instruction = build_system_instruction(user)
        model_name = os.getenv('GEMINI_MODEL', 'gemini-3.5-flash-lite')

        if SDK_TYPE == 'legacy':
            genai_module.configure(api_key=api_key)
            model = genai_module.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
            )
            
            # Format chat history for Gemini
            formatted_history = []
            for msg in history:
                role = "user" if msg.get("sender") == "user" else "model"
                formatted_history.append({
                    "role": role,
                    "parts": [msg.get("content", "")]
                })
                
            chat = model.start_chat(history=formatted_history)
            response = chat.send_message(user_message, stream=True)
            
            has_yielded = False
            for chunk in response:
                if getattr(chunk, 'text', None):
                    has_yielded = True
                    yield chunk.text
                    
            if not has_yielded:
                yield "I'm ready to help! Could you please repeat or expand on your question?"

        elif SDK_TYPE == 'new':
            client = genai_module.Client(api_key=api_key)
            formatted_contents = []
            for msg in history:
                role = "user" if msg.get("sender") == "user" else "model"
                formatted_contents.append(
                    genai_module.types.Content(
                        role=role,
                        parts=[genai_module.types.Part.from_text(text=msg.get("content", ""))]
                    )
                )
            formatted_contents.append(
                genai_module.types.Content(
                    role="user",
                    parts=[genai_module.types.Part.from_text(text=user_message)]
                )
            )

            config = genai_module.types.GenerateContentConfig(
                system_instruction=system_instruction
            )

            response = client.models.generate_content_stream(
                model=model_name,
                contents=formatted_contents,
                config=config,
            )

            has_yielded = False
            for chunk in response:
                if getattr(chunk, 'text', None):
                    has_yielded = True
                    yield chunk.text

            if not has_yielded:
                yield "I'm ready to help! Could you please repeat or expand on your question?"

    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        yield f"*(Note: Gemini service encountered an issue: {str(e)}).*\n\n"
        yield from mock_stream_response(user_message, user)

