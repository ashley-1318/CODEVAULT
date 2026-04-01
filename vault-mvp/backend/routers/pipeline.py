"""
Router: /api/pipeline
Three endpoints: run, approve, status for the CHRONICLE pipeline.
"""
import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks
from backend.minio_client import download_file
from backend.agents.chronicle_agent import run_pipeline, resume_pipeline, get_pipeline_status
from backend.models.program import (
    PipelineRunResponse,
    ApproveRequest,
    PipelineResumeResponse,
    PipelineStatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# In-memory store: program_id -> {thread_id, minio_path}
# In production this would be persisted in PostgreSQL
_program_registry: dict[str, dict] = {}


@router.post("/run/{program_id}", response_model=PipelineRunResponse)
async def run_pipeline_endpoint(program_id: str):
    """
    POST /api/pipeline/run/{program_id}

    Starts the CHRONICLE pipeline for a previously uploaded program.
    The pipeline runs until the human approval checkpoint and returns
    partial classification results for review.
    """
    # Look up program in registry
    program_info = _program_registry.get(program_id)
    if not program_info:
        raise HTTPException(
            status_code=404,
            detail=f"Program '{program_id}' not found. Please upload first.",
        )

    minio_path = program_info.get("minio_path", "")

    # Download COBOL source from MinIO
    try:
        # minio_path is "bucket/object_name"
        parts = minio_path.split("/", 1)
        object_name = parts[1] if len(parts) > 1 else minio_path
        raw_bytes = download_file(object_name=object_name)
        raw_cobol = raw_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        logger.exception(f"[pipeline] Failed to download COBOL from MinIO: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve COBOL source: {str(e)}",
        )

    # Run pipeline
    try:
        result = run_pipeline(program_id=program_id, raw_cobol=raw_cobol)
    except Exception as e:
        logger.exception(f"[pipeline] Pipeline run error: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

    # Store thread_id for later resume
    _program_registry[program_id]["thread_id"] = result.get("thread_id")

    return PipelineRunResponse(
        status=result.get("status", "awaiting_human_approval"),
        thread_id=result.get("thread_id", ""),
        program_name=result.get("program_name", ""),
        regulatory_risk_score=result.get("regulatory_risk_score", 0.0),
        current_phase=result.get("current_phase", ""),
        preview=result.get("preview", []),
        dead_code_flags=result.get("dead_code_flags", []),
        errors=result.get("errors", []),
    )


@router.post("/run_with_cobol/{program_id}", response_model=PipelineRunResponse)
async def run_pipeline_with_cobol(program_id: str, body: dict):
    """
    POST /api/pipeline/run_with_cobol/{program_id}

    Alternative endpoint that accepts raw_cobol in the request body directly.
    Called from the upload flow when frontend chaining upload → pipeline.
    """
    raw_cobol = body.get("raw_cobol", "")
    minio_path = body.get("minio_path", "")

    if not raw_cobol:
        raise HTTPException(status_code=400, detail="raw_cobol is required")

    # Store program info for later
    _program_registry[program_id] = {
        "minio_path": minio_path,
        "thread_id": None,
    }

    try:
        result = run_pipeline(program_id=program_id, raw_cobol=raw_cobol)
    except Exception as e:
        logger.exception(f"[pipeline] Pipeline run error: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

    _program_registry[program_id]["thread_id"] = result.get("thread_id")

    return PipelineRunResponse(
        status=result.get("status", "awaiting_human_approval"),
        thread_id=result.get("thread_id", ""),
        program_name=result.get("program_name", ""),
        regulatory_risk_score=result.get("regulatory_risk_score", 0.0),
        current_phase=result.get("current_phase", ""),
        preview=result.get("preview", []),
        dead_code_flags=result.get("dead_code_flags", []),
        errors=result.get("errors", []),
    )


@router.post("/approve/{thread_id}", response_model=PipelineResumeResponse)
async def approve_pipeline(thread_id: str, body: ApproveRequest):
    """
    POST /api/pipeline/approve/{thread_id}

    Resumes the CHRONICLE pipeline after human review.
    Body: { "approved": true | false }
    """
    try:
        result = resume_pipeline(thread_id=thread_id, approved=body.approved)
    except Exception as e:
        logger.exception(f"[pipeline] Resume error for thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Resume error: {str(e)}")

    return PipelineResumeResponse(
        status=result.get("status", "error"),
        thread_id=thread_id,
        program_name=result.get("program_name"),
        regulatory_risk_score=result.get("regulatory_risk_score"),
        compliance_map=result.get("compliance_map"),
        errors=result.get("errors", []),
        current_phase=result.get("current_phase"),
        message=result.get("message"),
    )


@router.get("/status/{thread_id}", response_model=PipelineStatusResponse)
async def pipeline_status(thread_id: str):
    """
    GET /api/pipeline/status/{thread_id}

    Returns current pipeline phase, node progress, and any errors.
    """
    try:
        result = get_pipeline_status(thread_id=thread_id)
    except Exception as e:
        logger.exception(f"[pipeline] Status error for thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")

    return PipelineStatusResponse(
        status=result.get("status", "unknown"),
        thread_id=thread_id,
        current_phase=result.get("current_phase"),
        program_name=result.get("program_name"),
        regulatory_risk_score=result.get("regulatory_risk_score"),
        classified_count=result.get("classified_count"),
        dead_code_count=result.get("dead_code_count"),
        errors=result.get("errors", []),
        next_nodes=result.get("next_nodes", []),
        human_approved=result.get("human_approved"),
    )
