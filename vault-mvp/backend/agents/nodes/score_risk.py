"""
LangGraph node: score_risk
Calculates the regulatory risk score based on paragraph classifications.
"""
import logging
from backend.agents.state import VaultState

logger = logging.getLogger(__name__)


def score_risk(state: VaultState) -> VaultState:
    """
    LangGraph node: score_risk
    Calculates regulatory_risk_score as:
      (regulatory_mandate_count * 1.0 + unknown_origin_count * 0.5) / total_paragraphs
    """
    logger.info("[score_risk] Calculating regulatory risk score")

    classified_paragraphs = state.get("classified_paragraphs", [])
    total = len(classified_paragraphs)

    if total == 0:
        logger.warning("[score_risk] No classified paragraphs — risk score = 0.0")
        return {
            **state,
            "regulatory_risk_score": 0.0,
            "current_phase": "score_risk_complete",
        }

    regulatory_mandate_count = sum(
        1 for cp in classified_paragraphs
        if cp.get("classification") == "REGULATORY_MANDATE"
    )
    unknown_origin_count = sum(
        1 for cp in classified_paragraphs
        if cp.get("classification") == "UNKNOWN_ORIGIN"
    )

    risk_score = round(
        (regulatory_mandate_count * 1.0 + unknown_origin_count * 0.5) / total, 4
    )

    logger.info(
        f"[score_risk] Score={risk_score} "
        f"(regulatory={regulatory_mandate_count}, unknown={unknown_origin_count}, total={total})"
    )

    return {
        **state,
        "regulatory_risk_score": risk_score,
        "current_phase": "score_risk_complete",
    }
