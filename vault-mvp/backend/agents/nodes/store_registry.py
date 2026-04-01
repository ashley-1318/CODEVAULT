"""
LangGraph node: store_registry
Persists the classified COBOL program and its paragraphs to Neo4j graph database.
Creates Program, Paragraph, and Regulation nodes with CONTAINS, IMPLEMENTS, and DEPENDS_ON relationships.
"""
import logging
from datetime import datetime, timezone
from neo4j import GraphDatabase
from backend.agents.state import VaultState
from backend.config import settings

logger = logging.getLogger(__name__)


def _get_neo4j_driver():
    """Create a Neo4j driver instance."""
    return GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )


def _store_graph(
    driver,
    program_name: str,
    program_id: str,
    regulatory_risk_score: float,
    classified_paragraphs: list[dict],
    dead_code_flags: list[str],
    call_statements: list[dict],
) -> None:
    """Execute all Cypher writes within a single session."""
    with driver.session() as session:
        # 1. Create/Merge Program node
        session.run(
            """
            MERGE (p:Program {name: $name})
            SET p.program_id = $program_id,
                p.regulatory_risk_score = $risk_score,
                p.total_paragraphs = $total_paragraphs,
                p.dead_code_count = $dead_code_count,
                p.created_at = $created_at
            """,
            name=program_name,
            program_id=program_id,
            risk_score=regulatory_risk_score,
            total_paragraphs=len(classified_paragraphs),
            dead_code_count=len(dead_code_flags),
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        logger.debug(f"[store_registry] Upserted Program node: {program_name}")

        # 2. Create Paragraph nodes and CONTAINS relationships
        for cp in classified_paragraphs:
            para_name = cp.get("paragraph", "UNKNOWN")
            classification = cp.get("classification", "UNKNOWN_ORIGIN")
            confidence = float(cp.get("confidence", 0.0))
            rationale = cp.get("rationale", "")
            is_dead_code = cp.get("is_dead_code", para_name in dead_code_flags)
            requires_human_review = cp.get("requires_human_review", False)
            risk_level = cp.get("risk_level", "LOW")
            regulation = cp.get("regulation", None)

            session.run(
                """
                MERGE (para:Paragraph {name: $para_name, program: $program_name})
                SET para.classification = $classification,
                    para.confidence = $confidence,
                    para.rationale = $rationale,
                    para.is_dead_code = $is_dead_code,
                    para.requires_human_review = $requires_human_review,
                    para.risk_level = $risk_level
                WITH para
                MATCH (prog:Program {name: $program_name})
                MERGE (prog)-[:CONTAINS]->(para)
                """,
                para_name=para_name,
                program_name=program_name,
                classification=classification,
                confidence=confidence,
                rationale=rationale,
                is_dead_code=is_dead_code,
                requires_human_review=requires_human_review,
                risk_level=risk_level,
            )

            # 3. Create Regulation node and IMPLEMENTS relationship
            if (
                classification == "REGULATORY_MANDATE"
                and regulation
                and regulation.strip()
            ):
                session.run(
                    """
                    MERGE (reg:Regulation {name: $regulation})
                    WITH reg
                    MATCH (para:Paragraph {name: $para_name, program: $program_name})
                    MERGE (para)-[:IMPLEMENTS]->(reg)
                    """,
                    regulation=regulation.strip(),
                    para_name=para_name,
                    program_name=program_name,
                )

        # 4. Create DEPENDS_ON relationships from CALL statements
        for call in call_statements:
            target = call.get("target_program", "")
            call_paragraph = call.get("in_paragraph", "UNKNOWN")
            if not target or target == program_name:
                continue

            session.run(
                """
                MERGE (target:Program {name: $target})
                WITH target
                MATCH (src:Program {name: $program_name})
                MERGE (src)-[:DEPENDS_ON {call_paragraph: $call_paragraph}]->(target)
                """,
                target=target,
                program_name=program_name,
                call_paragraph=call_paragraph,
            )
            logger.debug(f"[store_registry] Created DEPENDS_ON: {program_name} -> {target}")


def store_registry(state: VaultState) -> VaultState:
    """
    LangGraph node: store_registry
    Stores Program, Paragraph, and Regulation nodes in Neo4j.
    """
    logger.info(f"[store_registry] Storing '{state.get('program_name')}' to Neo4j")

    driver = None
    try:
        driver = _get_neo4j_driver()

        parsed = state.get("parsed_structure", {})
        call_statements = parsed.get("call_statements", [])

        _store_graph(
            driver=driver,
            program_name=state.get("program_name", "UNKNOWN"),
            program_id=state.get("program_id", ""),
            regulatory_risk_score=state.get("regulatory_risk_score", 0.0),
            classified_paragraphs=state.get("classified_paragraphs", []),
            dead_code_flags=state.get("dead_code_flags", []),
            call_statements=call_statements,
        )

        logger.info("[store_registry] Neo4j write complete")

        return {
            **state,
            "current_phase": "store_registry_complete",
        }

    except Exception as e:
        logger.exception(f"[store_registry] Neo4j write error: {e}")
        return {
            **state,
            "errors": state.get("errors", []) + [f"store_registry error: {str(e)}"],
            "current_phase": "store_registry_failed",
        }
    finally:
        if driver:
            driver.close()
