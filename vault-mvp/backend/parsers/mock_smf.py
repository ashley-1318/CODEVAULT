import random
from datetime import datetime, timedelta
from typing import Any


def generate_mock_smf(program_name: str, paragraphs: list[str]) -> dict[str, Any]:
    """
    Generates realistic mock SMF (System Management Facilities) execution data
    for a COBOL program and its paragraphs.

    Args:
        program_name: The name of the COBOL program.
        paragraphs: List of paragraph names in the program.

    Returns:
        A dict containing per-paragraph execution stats and program-level stats.
    """
    today = datetime.utcnow().date()
    paragraph_stats: dict[str, Any] = {}

    any_critical = False

    for para_name in paragraphs:
        # 20% of paragraphs simulate dead code (zero executions)
        is_dead_code = random.random() < 0.20

        if is_dead_code:
            daily_execution_count = 0
            avg_runtime_ms = 0.0
            last_executed_date = None
            io_record_count = 0
            error_count_30d = 0
        else:
            daily_execution_count = random.randint(100, 50000)
            avg_runtime_ms = round(random.uniform(0.5, 500.0), 2)
            # Random date within last 90 days
            days_ago = random.randint(0, 89)
            last_executed_date = (today - timedelta(days=days_ago)).isoformat()
            io_record_count = random.randint(0, 10000)
            error_count_30d = random.randint(0, 5)

            if daily_execution_count > 10000:
                any_critical = True

        paragraph_stats[para_name] = {
            "daily_execution_count": daily_execution_count,
            "avg_runtime_ms": avg_runtime_ms,
            "last_executed_date": last_executed_date,
            "io_record_count": io_record_count,
            "error_count_30d": error_count_30d,
            "is_dead_code": is_dead_code,
        }

    # Program-level aggregates
    all_exec_counts = [s["daily_execution_count"] for s in paragraph_stats.values()]
    total_executions_90d = sum(all_exec_counts) * 90  # rough 90-day extrapolation
    peak_daily_executions = max(all_exec_counts) if all_exec_counts else 0

    return {
        "program_name": program_name,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "program_level": {
            "total_executions_90d": total_executions_90d,
            "peak_daily_executions": peak_daily_executions,
            "is_critical_path": any_critical,
        },
        "paragraphs": paragraph_stats,
    }
