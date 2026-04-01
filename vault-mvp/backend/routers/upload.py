"""
Router: /api/upload
Accepts COBOL file uploads, stores in MinIO, parses, and stores metadata in PostgreSQL.
"""
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.minio_client import upload_file
from backend.parsers.cobol_parser import COBOLParser
from backend.models.program import UploadResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_cobol(file: UploadFile = File(...)):
    """
    Upload a COBOL source file (.cbl or .cob).
    - Validates file extension
    - Reads raw content
    - Stores in MinIO at vault-uploads/{program_id}/{filename}
    - Parses program structure
    - Returns program_id and parsed structure for pipeline trigger
    """
    # Validate file extension
    filename = file.filename or "unknown.cbl"
    if not filename.lower().endswith((".cbl", ".cob")):
        raise HTTPException(
            status_code=400,
            detail=f"Only .cbl and .cob files are accepted. Got: {filename}",
        )

    try:
        raw_bytes = await file.read()
        raw_cobol = raw_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if not raw_cobol.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Parse COBOL structure immediately
    try:
        parser = COBOLParser(raw_cobol)
        parsed = parser.parse()
    except Exception as e:
        logger.exception(f"[upload] Parser error: {e}")
        raise HTTPException(status_code=422, detail=f"COBOL parse error: {str(e)}")

    program_name = parsed.get("program_name", "UNKNOWN")
    program_id = str(uuid.uuid4())

    # Store in MinIO
    object_name = f"{program_id}/{filename}"
    try:
        minio_path = upload_file(
            object_name=object_name,
            data=raw_bytes,
            content_type="text/plain",
        )
    except Exception as e:
        logger.exception(f"[upload] MinIO upload error: {e}")
        raise HTTPException(status_code=500, detail=f"File storage error: {str(e)}")

    logger.info(
        f"[upload] Stored '{filename}' as program '{program_name}' "
        f"(id={program_id}) at {minio_path}"
    )

    return UploadResponse(
        program_id=program_id,
        program_name=program_name,
        file_name=filename,
        minio_path=minio_path,
        parsed_structure=parsed,
        message=f"Successfully uploaded and parsed '{program_name}' "
                f"({parsed['paragraph_count']} paragraphs, {parsed['line_count']} lines)",
    )
