"""
CHRONICLE Agent — Main LangGraph pipeline for COBOL modernization.
Graph: load_program → classify_logic → flag_dead_code → score_risk
       → INTERRUPT (human approval) → generate_compliance_map → store_registry → END
"""
import logging
import uuid

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from backend.agents.state import VaultState
from backend.agents.nodes.load_program import load_program
from backend.agents.nodes.classify_logic import classify_logic
from backend.agents.nodes.flag_dead_code import flag_dead_code
from backend.agents.nodes.score_risk import score_risk
from backend.agents.nodes.generate_compliance_map import generate_compliance_map
from backend.agents.nodes.store_registry import store_registry

logger = logging.getLogger(__name__)

# Global in-memory checkpointer (per-session state for human-in-the-loop)
_checkpointer = MemorySaver()

# ─── Build the graph ──────────────────────────────────────────────────────────

def _build_graph():
    """Construct and compile the CHRONICLE LangGraph state machine."""
    builder = StateGraph(VaultState)

    # Register nodes
    builder.add_node("load_program", load_program)
    builder.add_node("classify_logic", classify_logic)
    builder.add_node("flag_dead_code", flag_dead_code)
    builder.add_node("score_risk", score_risk)
    builder.add_node("generate_compliance_map", generate_compliance_map)
    builder.add_node("store_registry", store_registry)

    # Define edges
    builder.set_entry_point("load_program")
    builder.add_edge("load_program", "classify_logic")
    builder.add_edge("classify_logic", "flag_dead_code")
    builder.add_edge("flag_dead_code", "score_risk")
    builder.add_edge("score_risk", "generate_compliance_map")
    builder.add_edge("generate_compliance_map", "store_registry")
    builder.add_edge("store_registry", END)

    # Interrupt BEFORE generate_compliance_map to allow human approval
    return builder.compile(
        checkpointer=_checkpointer,
        interrupt_before=["generate_compliance_map"],
    )


_graph = _build_graph()


# ─── Public API ───────────────────────────────────────────────────────────────

def run_pipeline(program_id: str, raw_cobol: str, thread_id: str | None = None) -> dict:
    """
    Start the CHRONICLE pipeline for a given program.
    The graph will run until the human approval INTERRUPT before generate_compliance_map.

    Returns a dict with:
      - status: "awaiting_human_approval"
      - thread_id: str (use this to resume)
      - preview: partial classification results
    """
    if thread_id is None:
        thread_id = str(uuid.uuid4())

    initial_state: VaultState = {
        "program_id": program_id,
        "program_name": "",
        "raw_cobol": raw_cobol,
        "parsed_structure": {},
        "smf_data": {},
        "classified_paragraphs": [],
        "dead_code_flags": [],
        "regulatory_risk_score": 0.0,
        "compliance_map": {},
        "human_approved": False,
        "errors": [],
        "current_phase": "starting",
    }

    config = {"configurable": {"thread_id": thread_id}}

    logger.info(f"[chronicle] Starting pipeline for program_id={program_id} thread={thread_id}")

    # Run graph until interrupt
    final_state = None
    for event in _graph.stream(initial_state, config=config, stream_mode="values"):
        final_state = event

    # Extract preview data for human review
    preview_paragraphs = []
    if final_state:
        classified = final_state.get("classified_paragraphs", [])
        # Top 10 paragraphs for the preview panel
        preview_paragraphs = classified[:10]

    return {
        "status": "awaiting_human_approval",
        "thread_id": thread_id,
        "program_name": final_state.get("program_name", "") if final_state else "",
        "regulatory_risk_score": final_state.get("regulatory_risk_score", 0.0) if final_state else 0.0,
        "current_phase": final_state.get("current_phase", "unknown") if final_state else "unknown",
        "preview": preview_paragraphs,
        "dead_code_flags": final_state.get("dead_code_flags", []) if final_state else [],
        "errors": final_state.get("errors", []) if final_state else [],
    }


def resume_pipeline(thread_id: str, approved: bool) -> dict:
    """
    Resume the CHRONICLE pipeline after human approval/rejection.

    Args:
        thread_id: The thread ID returned by run_pipeline.
        approved: True to approve and continue, False to abort.

    Returns:
        dict with status and compliance_map if approved.
    """
    config = {"configurable": {"thread_id": thread_id}}

    if not approved:
        logger.info(f"[chronicle] Pipeline REJECTED by human for thread={thread_id}")
        return {
            "status": "rejected",
            "thread_id": thread_id,
            "compliance_map": None,
            "message": "Pipeline was rejected at human approval checkpoint.",
        }

    logger.info(f"[chronicle] Resuming pipeline after approval for thread={thread_id}")

    # Resume from interrupt — update human_approved flag and continue
    _graph.update_state(
        config,
        {"human_approved": True, "current_phase": "human_approved"},
    )

    # Stream the rest of the graph
    final_state = None
    for event in _graph.stream(None, config=config, stream_mode="values"):
        final_state = event

    if not final_state:
        return {
            "status": "error",
            "thread_id": thread_id,
            "compliance_map": None,
            "message": "Pipeline resumed but returned no state.",
        }

    return {
        "status": "complete",
        "thread_id": thread_id,
        "program_name": final_state.get("program_name", ""),
        "regulatory_risk_score": final_state.get("regulatory_risk_score", 0.0),
        "compliance_map": final_state.get("compliance_map", {}),
        "errors": final_state.get("errors", []),
        "current_phase": final_state.get("current_phase", "done"),
    }


def get_pipeline_status(thread_id: str) -> dict:
    """
    Get the current state/phase of a pipeline thread.
    """
    config = {"configurable": {"thread_id": thread_id}}
    state = _graph.get_state(config)

    if not state or not state.values:
        return {"status": "not_found", "thread_id": thread_id}

    values = state.values
    return {
        "status": "running",
        "thread_id": thread_id,
        "current_phase": values.get("current_phase", "unknown"),
        "program_name": values.get("program_name", ""),
        "regulatory_risk_score": values.get("regulatory_risk_score", 0.0),
        "classified_count": len(values.get("classified_paragraphs", [])),
        "dead_code_count": len(values.get("dead_code_flags", [])),
        "errors": values.get("errors", []),
        "next_nodes": list(state.next) if state.next else [],
        "human_approved": values.get("human_approved", False),
    }
