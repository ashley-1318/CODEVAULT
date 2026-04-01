"""
Pydantic models for compliance map data structures.
"""
from pydantic import BaseModel
from typing import Optional


class ComplianceEntry(BaseModel):
    paragraph: str
    classification: str
    confidence: float
    rationale: str
    regulation: Optional[str] = None
    is_dead_code: bool
    requires_human_review: bool
    risk_level: str  # HIGH | MEDIUM | LOW


class RegulatoryObligation(BaseModel):
    regulation: str
    paragraph_count: int
    paragraphs: list[str]


class ComplianceSummary(BaseModel):
    total_paragraphs: int
    classified_paragraphs: int
    dead_code_count: int
    regulatory_mandate_count: int
    unknown_origin_count: int
    requires_human_review_count: int


class ComplianceMap(BaseModel):
    program: str
    generated_at: str
    regulatory_risk_score: float
    summary: ComplianceSummary
    classification_distribution: dict[str, int]
    entries: list[ComplianceEntry]
    regulatory_obligations: list[RegulatoryObligation]
