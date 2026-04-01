"""
LangGraph node: generate_compliance_map
Produces the full Regulatory Compliance Map as a structured dict.
"""
import logging
from datetime import datetime, timezone
from collections import defaultdict
from backend.agents.state import VaultState

logger = logging.getLogger(__name__)

RISK_LEVEL_MAP = {
    "REGULATORY_MANDATE": "HIGH",
    "UNKNOWN_ORIGIN": "HIGH",
    "RISK_POLICY": "MEDIUM",
    "COMMERCIAL_AGREEMENT": "MEDIUM",
    "OPERATIONAL_PROCEDURE": "LOW",
    "TECHNICAL_PLUMBING": "LOW",
}


def generate_compliance_map(state: VaultState) -> VaultState:
    """
    LangGraph node: generate_compliance_map
    Builds the full compliance map document from classified paragraphs,
    dead code flags, and the regulatory risk score.
    """
    logger.info("[generate_compliance_map] Building compliance map")

    program_name = state.get("program_name", "UNKNOWN")
    classified_paragraphs = state.get("classified_paragraphs", [])
    dead_code_flags = state.get("dead_code_flags", [])
    regulatory_risk_score = state.get("regulatory_risk_score", 0.0)

    total_paragraphs = len(classified_paragraphs)
    dead_code_count = len(dead_code_flags)

    # Distribution counters
    distribution: dict[str, int] = {
        "REGULATORY_MANDATE": 0,
        "COMMERCIAL_AGREEMENT": 0,
        "RISK_POLICY": 0,
        "OPERATIONAL_PROCEDURE": 0,
        "TECHNICAL_PLUMBING": 0,
        "UNKNOWN_ORIGIN": 0,
    }

    regulatory_mandate_count = 0
    unknown_origin_count = 0
    requires_human_review_count = 0

    entries = []
    regulation_groups: dict[str, list[str]] = defaultdict(list)

    for cp in classified_paragraphs:
        classification = cp.get("classification", "UNKNOWN_ORIGIN")
        para_name = cp.get("paragraph", "UNKNOWN")
        confidence = cp.get("confidence", 0.0)
        rationale = cp.get("rationale", "")
        regulation = cp.get("regulation", None)
        is_dead_code = cp.get("is_dead_code", para_name in dead_code_flags)
        requires_human_review = cp.get("requires_human_review", False)
        risk_level = RISK_LEVEL_MAP.get(classification, "LOW")

        if classification in distribution:
            distribution[classification] += 1

        if classification == "REGULATORY_MANDATE":
            regulatory_mandate_count += 1
        if classification == "UNKNOWN_ORIGIN":
            unknown_origin_count += 1
        if requires_human_review:
            requires_human_review_count += 1

        if regulation and classification == "REGULATORY_MANDATE":
            regulation_groups[regulation].append(para_name)

        entries.append(
            {
                "paragraph": para_name,
                "classification": classification,
                "confidence": confidence,
                "rationale": rationale,
                "regulation": regulation,
                "is_dead_code": is_dead_code,
                "requires_human_review": requires_human_review,
                "risk_level": risk_level,
            }
        )

    # Build regulatory_obligations list
    regulatory_obligations = [
        {
            "regulation": reg_name,
            "paragraph_count": len(paras),
            "paragraphs": paras,
        }
        for reg_name, paras in sorted(regulation_groups.items())
    ]

    compliance_map = {
        "program": program_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "regulatory_risk_score": regulatory_risk_score,
        "summary": {
            "total_paragraphs": total_paragraphs,
            "classified_paragraphs": total_paragraphs,
            "dead_code_count": dead_code_count,
            "regulatory_mandate_count": regulatory_mandate_count,
            "unknown_origin_count": unknown_origin_count,
            "requires_human_review_count": requires_human_review_count,
        },
        "classification_distribution": distribution,
        "entries": entries,
        "regulatory_obligations": regulatory_obligations,
    }

    logger.info(
        f"[generate_compliance_map] Map built for '{program_name}': "
        f"{total_paragraphs} paragraphs, risk={regulatory_risk_score}, "
        f"{len(regulatory_obligations)} regulations identified"
    )

    return {
        **state,
        "compliance_map": compliance_map,
        "current_phase": "generate_compliance_map_complete",
    }
