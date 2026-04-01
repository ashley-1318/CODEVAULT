import logging
import psycopg2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
from backend.config import settings
from backend.minio_client import download_file
from backend.parsers.cobol_parser import COBOLParser

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/translate",
    tags=["translate"],
)

class TranslateRequest(BaseModel):
    program_name: str
    paragraph_name: str
    target_language: str = "python"

class TranslateResponse(BaseModel):
    original_cobol: str
    translated_code: str

@router.post("", response_model=TranslateResponse)
async def translate_paragraph(request: TranslateRequest):
    """
    Translates a specific COBOL paragraph to modern Python/Java.
    Fetches the source code from MinIO via Postgres lookup.
    """
    try:
        # 1. Lookup MinIO path in Postgres
        conn = psycopg2.connect(settings.POSTGRES_URL.replace("+asyncpg", ""))
        cursor = conn.cursor()
        cursor.execute(
            "SELECT minio_path FROM programs WHERE program_name = %s LIMIT 1",
            (request.program_name,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Program not found in registry")
            
        minio_path = row[0]
        logger.info(f"Downloading {minio_path} for translation...")

        # 2. Download from MinIO
        parts = minio_path.split("/", 1)
        object_name = parts[1] if len(parts) > 1 else minio_path
        
        try:
            raw_bytes = download_file(object_name=object_name)
            raw_cobol = raw_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch from Object Vault: {e}")

        # 3. Parse COBOL to isolate paragraph
        parser = COBOLParser(raw_cobol)
        parsed = parser.parse()
        
        target_paragraph_text = None
        for p in parsed.get("paragraphs", []):
            if p.get("name") == request.paragraph_name:
                target_paragraph_text = p.get("text")
                break
                
        if not target_paragraph_text:
            raise HTTPException(status_code=404, detail=f"Paragraph '{request.paragraph_name}' not found in source.")

        # 4. Translate using Groq
        prompt = f"""You are an advanced legacy-to-modern code translator.
Translate the following COBOL abstract logic into clean, production-ready, typed {request.target_language.capitalize()}.

Rules:
1. Provide only the {request.target_language.capitalize()} code inside a single markdown code block. Do not provide explanations.
2. Use modern best practices (type hints, clean variable names instead of PIC X).

COBOL PARAGRAPH ({request.paragraph_name}):
```cobol
{target_paragraph_text}
```
"""     
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000
        )
        
        raw_translation = response.choices[0].message.content.strip()
        
        # Strip markdown fences
        if "```" in raw_translation:
            lines = raw_translation.split("```")
            raw_translation = lines[1] if len(lines) > 1 else raw_translation
            if raw_translation.startswith(request.target_language.lower()):
                raw_translation = raw_translation[len(request.target_language):].strip()
        
        return TranslateResponse(
            original_cobol=target_paragraph_text,
            translated_code=raw_translation.strip()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[translate] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
