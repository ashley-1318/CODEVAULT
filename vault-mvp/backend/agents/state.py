from typing import TypedDict, Optional


class VaultState(TypedDict):
    """
    LangGraph state schema for the CHRONICLE COBOL modernization pipeline.
    All fields are populated progressively as the graph executes.
    """

    # Identity
    program_id: str
    program_name: str

    # Raw and parsed COBOL
    raw_cobol: str
    parsed_structure: dict

    # SMF execution data
    smf_data: dict

    # Classification results (one dict per paragraph)
    classified_paragraphs: list[dict]

    # Dead code detection
    dead_code_flags: list[str]

    # Regulatory risk
    regulatory_risk_score: float

    # Compliance map output
    compliance_map: dict

    # Human approval gate
    human_approved: bool

    # Error tracking
    errors: list[str]

    # Current pipeline phase for status tracking
    current_phase: str
