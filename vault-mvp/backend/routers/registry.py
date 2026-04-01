"""
Router: /api/registry
Query the Neo4j program registry.
"""
import logging
from fastapi import APIRouter, HTTPException
from backend.neo4j_client import run_query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/registry", tags=["registry"])


@router.get("/{program_name}")
async def get_program_registry(program_name: str):
    """
    GET /api/registry/{program_name}

    Returns the full program node with all related paragraphs and dependencies from Neo4j.
    """
    try:
        # Fetch Program node
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
                detail=f"Program '{program_name}' not found in registry",
            )

        program_data = dict(program_result[0]["p"])

        # Fetch all paragraphs
        paragraphs_result = run_query(
            """
            MATCH (p:Program {name: $name})-[:CONTAINS]->(para:Paragraph)
            OPTIONAL MATCH (para)-[:IMPLEMENTS]->(reg:Regulation)
            RETURN para, collect(reg.name) AS regulations
            """,
            {"name": program_name.upper()},
        )

        paragraphs = []
        for row in paragraphs_result:
            para_data = dict(row["para"])
            para_data["regulations"] = [r for r in row["regulations"] if r]
            paragraphs.append(para_data)

        # Fetch dependencies (DEPENDS_ON)
        deps_result = run_query(
            """
            MATCH (p:Program {name: $name})-[r:DEPENDS_ON]->(dep:Program)
            RETURN dep.name AS target, r.call_paragraph AS call_paragraph
            """,
            {"name": program_name.upper()},
        )
        dependencies = [
            {
                "target_program": row["target"],
                "call_paragraph": row["call_paragraph"],
            }
            for row in deps_result
        ]

        return {
            "program": program_data,
            "paragraphs": paragraphs,
            "dependencies": dependencies,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[registry] Error fetching '{program_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Registry error: {str(e)}")


@router.get("/")
async def list_all_programs():
    """
    GET /api/registry/
    Returns all programs stored in Neo4j registry.
    """
    try:
        results = run_query(
            """
            MATCH (p:Program)
            RETURN p ORDER BY p.created_at DESC
            """
        )
        programs = [dict(row["p"]) for row in results]
        return {"programs": programs, "total": len(programs)}
    except Exception as e:
        logger.exception(f"[registry] List error: {e}")
        raise HTTPException(status_code=500, detail=f"Registry error: {str(e)}")
