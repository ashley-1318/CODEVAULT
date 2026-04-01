"""
LangGraph node: flag_dead_code
Cross-references parsed paragraphs with SMF execution data to flag dead code.
"""
import logging
from backend.agents.state import VaultState

logger = logging.getLogger(__name__)


def flag_dead_code(state: VaultState) -> VaultState:
    """
    LangGraph node: flag_dead_code
    Uses SMF data to identify paragraphs with zero daily executions.
    Updates classified_paragraphs with is_dead_code flag.
    """
    logger.info("[flag_dead_code] Scanning for dead code using SMF data")

    smf_data = state.get("smf_data", {})
    paragraph_smf = smf_data.get("paragraphs", {})
    classified_paragraphs = state.get("classified_paragraphs", [])
    parsed = state.get("parsed_structure", {})
    all_paragraphs = [p["name"] for p in parsed.get("paragraphs", [])]

    dead_code_flags: list[str] = []

    # Tag each classified paragraph with is_dead_code
    updated_classifications = []
    for cp in classified_paragraphs:
        para_name = cp.get("paragraph", "")
        smf_para = paragraph_smf.get(para_name, {})
        is_dead = smf_para.get("is_dead_code", False) or smf_para.get("daily_execution_count", 1) == 0

        updated_cp = {**cp, "is_dead_code": is_dead}
        updated_classifications.append(updated_cp)

        if is_dead:
            dead_code_flags.append(para_name)

    # Also check paragraphs that have SMF data but weren't classified
    for para_name in all_paragraphs:
        if para_name not in [cp["paragraph"] for cp in classified_paragraphs]:
            smf_para = paragraph_smf.get(para_name, {})
            is_dead = smf_para.get("is_dead_code", False) or smf_para.get("daily_execution_count", 1) == 0
            if is_dead and para_name not in dead_code_flags:
                dead_code_flags.append(para_name)

    logger.info(
        f"[flag_dead_code] Found {len(dead_code_flags)} dead code paragraphs: {dead_code_flags}"
    )

    return {
        **state,
        "classified_paragraphs": updated_classifications,
        "dead_code_flags": dead_code_flags,
        "current_phase": "flag_dead_code_complete",
    }
