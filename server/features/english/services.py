import os
import json
import google.generativeai as genai

API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

def generate_word_info(word):
    if not API_KEY:
        return {
            "error": "API key not found. Please set GEMINI_API_KEY environment variable."
        }

    model = genai.GenerativeModel('gemini-2.0-flash-lite')
    
    prompt = f"""
    You are a strict JSON generator. Provide detailed information for the English word: "{word}".
    
    Response MUST be valid JSON with these exact keys:
    {{
      "word": "The word itself (corrected)",
      "meaning": "Japanese meaning. MUST use format: 【Part of Speech】Meaning. Example: 【名】本 【動】予約する",
      "pronunciation": "IPA ONLY. Example: /rʌn/",
      "example_en": "Simple English example sentence",
      "example_jp": "Japanese translation (No Romaji)"
    }}
    
    Rules:
    1. NO Katakana in pronunciation.
    2. NO Romaji in example_jp.
    3. Meaning MUST have 【】 tags.
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"LLM Error: {e}")
        return {
            "error": "Failed to generate content",
            "details": str(e)
        }
