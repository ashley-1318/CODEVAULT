import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.neo4j_client import run_query
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/logs",
    tags=["logs"],
)

class SMFLogEntry(BaseModel):
    program_name: str
    paragraph_name: str
    execution_timestamp: str | None = None
    cpu_time_ms: float | None = 0.0

@router.post("/ingest", status_code=202)
async def ingest_smf_log(entries: list[SMFLogEntry]):
    """
    Webhook endpoint to ingest real-time SMF logs from the mainframe.
    Updates paragraph execution counts in Neo4j to refine Dead Code analysis.
    """
    logger.info(f"[logs] Received {len(entries)} SMF log entries")
    
    try:
        for entry in entries:
            # Update Paragraph execution metrics in Neo4j
            run_query(
                """
                MATCH (p:Program {name: $prog_name})-[:CONTAINS]->(para:Paragraph {name: $para_name})
                SET para.last_executed = $timestamp,
                    para.execution_count = coalesce(para.execution_count, 0) + 1,
                    para.avg_cpu_ms = coalesce(para.avg_cpu_ms, 0) + $cpu_ms
                RETURN para
                """,
                {
                    "prog_name": entry.program_name.upper(),
                    "para_name": entry.paragraph_name.upper(),
                    "timestamp": entry.execution_timestamp or datetime.now().isoformat(),
                    "cpu_ms": entry.cpu_time_ms or 0.0
                }
            )
            
        return {"status": "accepted", "ingested": len(entries)}
    except Exception as e:
        logger.error(f"[logs] Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trace/{program_name}")
async def get_log_traces(program_name: str):
    """
    Fetch the last 50 execution logs for a program from the graph.
    """
    try:
        results = run_query(
            """
            MATCH (p:Program {name: $name})-[:CONTAINS]->(para:Paragraph)
            WHERE para.last_executed IS NOT NULL
            RETURN para.name AS paragraph, para.last_executed AS timestamp, 
                   para.execution_count AS count
            ORDER BY para.last_executed DESC
            LIMIT 50
            """,
            {"name": program_name.upper()}
        )
        return {"traces": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
