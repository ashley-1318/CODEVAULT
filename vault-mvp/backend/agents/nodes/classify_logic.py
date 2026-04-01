"""
LangGraph node: classify_logic
Classifies each COBOL paragraph using Groq llama-3.3-70b-versatile.
Implements exponential backoff for rate limiting and 2-second batching delay.
"""
import json
import logging
import time
from groq import Groq, RateLimitError
from backend.agents.state import VaultState
from backend.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert COBOL business analyst specializing in BFSI regulatory systems. You classify COBOL paragraph logic into exactly one of six categories:
REGULATORY_MANDATE (implements a specific external compliance requirement such as Basel IV, IFRS 9, GDPR, PCI-DSS, or central bank regulation),
COMMERCIAL_AGREEMENT (encodes terms of a specific client contract or product),
RISK_POLICY (internal risk thresholds or fraud detection),
OPERATIONAL_PROCEDURE (process automation with no external compliance anchor),
TECHNICAL_PLUMBING (infrastructure logic with no business meaning),
UNKNOWN_ORIGIN (cannot be classified with confidence).

You must respond with only valid JSON in this exact format:
{"classification": string, "confidence": float between 0.0 and 1.0, "rationale": string of max 20 words, "regulation": string or null}
Never include any text outside the JSON object."""

VALID_CLASSIFICATIONS = {
    "REGULATORY_MANDATE",
    "COMMERCIAL_AGREEMENT",
    "RISK_POLICY",
    "OPERATIONAL_PROCEDURE",
    "TECHNICAL_PLUMBING",
    "UNKNOWN_ORIGIN",
}

CONFIDENCE_THRESHOLD = 0.65
BATCH_DELAY_SECONDS = 2.0
MAX_RETRIES = 5


def _call_groq_with_backoff(client: Groq, paragraph_name: str, paragraph_text: str) -> dict:
    """
    Call Groq API with exponential backoff for rate limit errors.
    Returns a classification dict.
    """
    user_prompt = (
        f"Paragraph name: {paragraph_name}\n\n"
        f"Paragraph source code:\n{paragraph_text[:2000]}"
    )

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=200,
            )

            raw_content = response.choices[0].message.content.strip()

            # Strip markdown code fences if present
            if raw_content.startswith("```"):
                raw_content = raw_content.split("```")[1]
                if raw_content.startswith("json"):
                    raw_content = raw_content[4:]

            parsed = json.loads(raw_content)

            # Validate structure
            classification = parsed.get("classification", "UNKNOWN_ORIGIN").upper()
            if classification not in VALID_CLASSIFICATIONS:
                classification = "UNKNOWN_ORIGIN"

            confidence = float(parsed.get("confidence", 0.0))
            rationale = parsed.get("rationale", "Unable to determine")[:200]
            regulation = parsed.get("regulation", None)

            # Low-confidence → force UNKNOWN_ORIGIN
            requires_human_review = False
            if confidence < CONFIDENCE_THRESHOLD:
                classification = "UNKNOWN_ORIGIN"
                requires_human_review = True

            return {
                "paragraph": paragraph_name,
                "classification": classification,
                "confidence": confidence,
                "rationale": rationale,
                "regulation": regulation,
                "requires_human_review": requires_human_review,
            }

        except RateLimitError as e:
            wait_time = (2 ** attempt) * 10  # 10, 20, 40, 80, 160 seconds
            logger.warning(
                f"[classify_logic] Rate limit hit for '{paragraph_name}' "
                f"(attempt {attempt + 1}/{MAX_RETRIES}). Waiting {wait_time}s..."
            )
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait_time)
            else:
                logger.error(f"[classify_logic] Max retries exceeded for '{paragraph_name}'")
                return {
                    "paragraph": paragraph_name,
                    "classification": "UNKNOWN_ORIGIN",
                    "confidence": 0.0,
                    "rationale": "Groq API rate limit exceeded after retries",
                    "regulation": None,
                    "requires_human_review": True,
                }

        except json.JSONDecodeError as e:
            logger.error(f"[classify_logic] JSON parse error for '{paragraph_name}': {e}")
            return {
                "paragraph": paragraph_name,
                "classification": "UNKNOWN_ORIGIN",
                "confidence": 0.0,
                "rationale": "Failed to parse LLM JSON response",
                "regulation": None,
                "requires_human_review": True,
            }

        except Exception as e:
            logger.exception(f"[classify_logic] Unexpected error for '{paragraph_name}': {e}")
            return {
                "paragraph": paragraph_name,
                "classification": "UNKNOWN_ORIGIN",
                "confidence": 0.0,
                "rationale": f"Unexpected error: {str(e)[:50]}",
                "regulation": None,
                "requires_human_review": True,
            }

    # Fallback if loop exits unexpectedly
    return {
        "paragraph": paragraph_name,
        "classification": "UNKNOWN_ORIGIN",
        "confidence": 0.0,
        "rationale": "Classification loop exited without result",
        "regulation": None,
        "requires_human_review": True,
    }


def classify_logic(state: VaultState) -> VaultState:
    """
    LangGraph node: classify_logic
    Classifies each paragraph in parsed_structure using Groq API.
    Adds a 2-second delay between calls to respect the 30 RPM free tier limit.
    """
    logger.info("[classify_logic] Starting paragraph classification")

    parsed = state.get("parsed_structure", {})
    paragraphs = parsed.get("paragraphs", [])

    if not paragraphs:
        logger.warning("[classify_logic] No paragraphs found to classify")
        return {
            **state,
            "classified_paragraphs": [],
            "current_phase": "classify_logic_complete",
        }

    client = Groq(api_key=settings.GROQ_API_KEY)
    classified_paragraphs = []

    logger.info(f"[classify_logic] Classifying {len(paragraphs)} paragraphs...")

    for i, para in enumerate(paragraphs):
        para_name = para.get("name", f"PARA_{i}")
        para_text = para.get("text", "")

        logger.info(f"[classify_logic] [{i + 1}/{len(paragraphs)}] Classifying '{para_name}'...")

        result = _call_groq_with_backoff(client, para_name, para_text)
        classified_paragraphs.append(result)

        # Batch delay to respect Groq free tier 30 RPM limit
        # (except after the last paragraph)
        if i < len(paragraphs) - 1:
            time.sleep(BATCH_DELAY_SECONDS)

    logger.info(
        f"[classify_logic] Completed: {len(classified_paragraphs)} paragraphs classified"
    )

    return {
        **state,
        "classified_paragraphs": classified_paragraphs,
        "current_phase": "classify_logic_complete",
    }
