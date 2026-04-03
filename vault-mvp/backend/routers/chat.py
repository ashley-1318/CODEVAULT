import logging
import psycopg2
import ollama
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
from backend.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
)

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    query: str
    program_id: str | None = None
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]

@router.post("", response_model=ChatResponse)
async def chat_with_codebase(request: ChatRequest):
    """
    Agentic RAG endpoint:
    1. Embeds the user query.
    2. Searches PostgeSQL pgvector for the top 5 most relevant paragraphs.
    3. Passes context + query to Groq LLM for synthesis.
    """
    logger.info(f"[chat] Received query: {request.query}")
    try:
        from ollama import Client
        ollama_client = Client(host=settings.OLLAMA_BASE_URL)
        
        # 1. Embed Query
        emb_res = ollama_client.embeddings(
            model=settings.OLLAMA_EMBED_MODEL, 
            prompt=request.query
        )
        query_embedding = emb_res["embedding"]

        # 2. Vector Search
        conn = psycopg2.connect(settings.POSTGRES_URL.replace("+asyncpg", ""))
        cursor = conn.cursor()
        
        if request.program_id:
            cursor.execute(
                """
                SELECT paragraph_name, classification, embedding <-> %s::vector AS distance
                FROM paragraph_embeddings
                WHERE program_id = %s
                ORDER BY distance ASC
                LIMIT 5;
                """,
                (str(query_embedding), request.program_id)
            )
        else:
            cursor.execute(
                """
                SELECT paragraph_name, classification, embedding <-> %s::vector AS distance, program_id
                FROM paragraph_embeddings
                ORDER BY distance ASC
                LIMIT 5;
                """,
                (str(query_embedding),)
            )
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        if not results:
            return ChatResponse(
                answer="I couldn't find any code context in the database to answer your question.", 
                sources=[]
            )

        # 3. Format Context
        sources = []
        context_blocks = []
        for row in results:
            para_name = row[0]
            classification = row[1]
            dist = row[2]
            prog_id = row[3] if len(row) > 3 else request.program_id
            
            sources.append({
                "paragraph_name": para_name,
                "classification": classification,
                "distance": dist,
                "program_id": prog_id
            })
            context_blocks.append(f"[{para_name} | {classification}]\n(Match Distance: {dist:.2f})")
            
        context_str = "\n\n".join(context_blocks)
        
        # 4. Synthesize with LLM
        messages = [
            {
                "role": "system", 
                "content": f"""You are an advanced COBOL AI modernization agent. 
You are answering a user's question based on the semantic search of their codebase.
Always cite the specific paragraph name.

CONTEXT (Top relevant paragraphs):
{context_str}
"""
            }
        ]

        # Add conversation history
        for msg in request.history[-6:]:  # last 6 messages
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message
        messages.append({
            "role": "user",
            "content": request.query
        })

        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )
        
        answer = response.choices[0].message.content.strip()

        
        return ChatResponse(answer=answer, sources=sources)
        
    except Exception as e:
        logger.error(f"[chat] Error processing RAG query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
