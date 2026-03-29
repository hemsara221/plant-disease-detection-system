from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
import json

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_plant_advisory(disease_name):
    """Generates a detailed advisory using Gemini based on disease name."""
    try:
        prompt = f"""
                    You are a professional plant disease advisor. Provide a guide for "{disease_name}". 
                    
                    Return ONLY a JSON object with this exact structure:
                    {{
                        "explanation": "string",
                        "causes": "string",
                        "treatment": "string",
                        "prevention": "string"
                    }}

                    Guide for healthy plant:
                    If it is a healthy plant say that it is healthy and provide a guide for healthy plant.Generate only the "explanation": "string" value for healthy plant. Don't generate "causes", "treatment", "prevention" values for healthy plant in JSON.


                    CRITICAL CONSTRAINTS:
                    1. Response must be ONLY the raw JSON string. No markdown blocks.
                    2. Format the text values as HTML-ready strings.
                    3. Use <b>bold</b> for key terms and <i>italics</i> for scientific names (e.g., <i>Passalora fulva</i>).
                    4. For lists (causes, prevention, etc.), use <br><b>1.</b> for numbered items or <br>• for bullets.
                    5. Do not use Markdown (no **, no \n, no \\n,no *, no n4). Use HTML tags instead.
                    6. No source tags or conversational filler.
                """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        # print(response.text)
        return response.text
    except Exception as e:
        return f'{{"error": "{str(e)}"}}'

def get_plant_chat_response(message, history=None):
    """Generates a text-based response for general plant-related queries."""
    try:
        
        system_instruction = (
            "You are a professional plant care assistant. You ONLY answer questions related to plants, gardening, "
            "plant diseases, agriculture, and botany. If the user asks about anything else (e.g., coding, history, politics, "
            "general knowledge not related to plants), politely decline and steer the conversation back to plants. "
            "Format the text values as HTML-ready strings."
            "Use <b>bold</b> for key terms and <i>italics</i> for scientific names (e.g., <i>Passalora fulva</i>)."
            "For lists (causes, prevention, etc.), use <br><b>1.</b> for numbered items or <br>• for bullets."
            "Do not use Markdown (no **, no \n, no \\n,no *, no n4). Use HTML tags instead."
            "No source tags or conversational filler."

        )
        
        # Simple prompt joining for history, or just use the system instruction
        full_prompt = f"{system_instruction}\n\n"
        if history:
            for entry in history:
                role = "User" if entry['role'] == 'user' else "Assistant"
                full_prompt += f"{role}: {entry['content']}\n"
        
        full_prompt += f"User: {message}"
        
        response = client.models.generate_content(
            model='gemini-2.5-flash', # Use flash for faster results
            contents=full_prompt
        )
        return response.text
    except Exception as e:
        return f"Error communicating with AI: {str(e)}"
