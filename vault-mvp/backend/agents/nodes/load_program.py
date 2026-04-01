"""
LangGraph node: load_program
Loads the COBOL program from the database and runs the parser + SMF generator.
"""
import logging
from backend.agents.state import VaultState
from backend.parsers.cobol_parser import COBOLParser
from backend.parsers.mock_smf import generate_mock_smf

logger = logging.getLogger(__name__)


def load_program(state: VaultState) -> VaultState:
    """
    Node 1: Load and parse the COBOL program.
    Reads raw_cobol from state, runs COBOLParser, generates mock SMF data.
    """
    try:
        logger.info(f"[load_program] Parsing program_id={state['program_id']}")

        raw_cobol = state.get("raw_cobol", "")
        if not raw_cobol:
            return {
                **state,
                "errors": state.get("errors", []) + ["No COBOL source found in state"],
                "current_phase": "load_program_failed",
            }

        parser = COBOLParser(raw_cobol)
        parsed = parser.parse()

        program_name = parsed.get("program_name", "UNKNOWN")
        paragraph_names = [p["name"] for p in parsed.get("paragraphs", [])]

        smf_data = generate_mock_smf(program_name, paragraph_names)

        logger.info(
            f"[load_program] Parsed '{program_name}': "
            f"{parsed['paragraph_count']} paragraphs, "
            f"{parsed['variable_count']} variables"
        )

        return {
            **state,
            "program_name": program_name,
            "parsed_structure": parsed,
            "smf_data": smf_data,
            "classified_paragraphs": [],
            "dead_code_flags": [],
            "errors": state.get("errors", []),
            "current_phase": "load_program_complete",
        }

    except Exception as e:
        logger.exception(f"[load_program] Unexpected error: {e}")
        return {
            **state,
            "errors": state.get("errors", []) + [f"load_program error: {str(e)}"],
            "current_phase": "load_program_failed",
        }
