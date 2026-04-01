"""
Pydantic models for COBOL programs and pipeline state.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProgramBase(BaseModel):
    program_name: str
    program_id: str


class ProgramCreate(ProgramBase):
    raw_cobol: str
    file_name: str
    minio_path: str


class ProgramResponse(ProgramBase):
    id: int
    file_name: str
    minio_path: str
    status: str
    created_at: datetime
    regulatory_risk_score: Optional[float] = None

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    program_id: str
    program_name: str
    file_name: str
    minio_path: str
    parsed_structure: dict
    message: str


class PipelineRunResponse(BaseModel):
    status: str
    thread_id: str
    program_name: str
    regulatory_risk_score: float
    current_phase: str
    preview: list[dict]
    dead_code_flags: list[str]
    errors: list[str]


class ApproveRequest(BaseModel):
    approved: bool


class PipelineResumeResponse(BaseModel):
    status: str
    thread_id: str
    program_name: Optional[str] = None
    regulatory_risk_score: Optional[float] = None
    compliance_map: Optional[dict] = None
    errors: list[str] = []
    current_phase: Optional[str] = None
    message: Optional[str] = None


class PipelineStatusResponse(BaseModel):
    status: str
    thread_id: str
    current_phase: Optional[str] = None
    program_name: Optional[str] = None
    regulatory_risk_score: Optional[float] = None
    classified_count: Optional[int] = None
    dead_code_count: Optional[int] = None
    errors: list[str] = []
    next_nodes: list[str] = []
    human_approved: Optional[bool] = None
