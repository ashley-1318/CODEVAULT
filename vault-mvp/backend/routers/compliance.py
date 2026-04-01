"""
Router: /api/compliance-map
Returns the stored compliance map for a program.
"""
import logging
from fastapi import APIRouter, HTTPException
from backend.neo4j_client import run_query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/compliance-map", tags=["compliance"])


@router.get("/{program_name}")
async def get_compliance_map(program_name: str):
    """
    GET /api/compliance-map/{program_name}

    Reconstructs the compliance map from Neo4j graph data.
    """
    try:
        # Fetch program
        program_result = run_query(
            """
            MATCH (p:Program {name: $name})
            RETURN p
            """,
            {"name": program_name.upper()},
        )

        if not program_result:
            raise HTTPException(
                status_code=404,
                detail=f"Compliance map for '{program_name}' not found",
            )

        prog = dict(program_result[0]["p"])

        # Fetch paragraphs with their regulations
        para_result = run_query(
            """
            MATCH (p:Program {name: $name})-[:CONTAINS]->(para:Paragraph)
            OPTIONAL MATCH (para)-[:IMPLEMENTS]->(reg:Regulation)
            RETURN para, collect(reg.name) AS regulations
            """,
            {"name": program_name.upper()},
        )

        entries = []
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
        dead_code_count = 0
        regulation_groups: dict[str, list[str]] = {}

        for row in para_result:
            para = dict(row["para"])
            regs = [r for r in row["regulations"] if r]
            classification = para.get("classification", "UNKNOWN_ORIGIN")
            para_name = para.get("name", "UNKNOWN")
            requires_review = para.get("requires_human_review", False)
            is_dead = para.get("is_dead_code", False)

            if classification in distribution:
                distribution[classification] += 1
            if classification == "REGULATORY_MANDATE":
                regulatory_mandate_count += 1
            if classification == "UNKNOWN_ORIGIN":
                unknown_origin_count += 1
            if requires_review:
                requires_human_review_count += 1
            if is_dead:
                dead_code_count += 1

            for reg in regs:
                if reg not in regulation_groups:
                    regulation_groups[reg] = []
                regulation_groups[reg].append(para_name)

            entries.append(
                {
                    "paragraph": para_name,
                    "classification": classification,
                    "confidence": float(para.get("confidence", 0.0)),
                    "rationale": para.get("rationale", ""),
                    "regulation": regs[0] if regs else None,
                    "is_dead_code": is_dead,
                    "requires_human_review": requires_review,
                    "risk_level": para.get("risk_level", "LOW"),
                }
            )

        regulatory_obligations = [
            {
                "regulation": reg_name,
                "paragraph_count": len(paras),
                "paragraphs": paras,
            }
            for reg_name, paras in sorted(regulation_groups.items())
        ]

        total_paragraphs = len(entries)

        return {
            "program": program_name.upper(),
            "generated_at": prog.get("created_at", ""),
            "regulatory_risk_score": float(prog.get("regulatory_risk_score", 0.0)),
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

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[compliance-map] Error for '{program_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Compliance map error: {str(e)}")
