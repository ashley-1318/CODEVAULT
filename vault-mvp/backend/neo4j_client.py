"""
Neo4j driver setup and context manager helper.
"""
from neo4j import GraphDatabase, Driver
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

_driver: Driver | None = None


def get_driver() -> Driver:
    """Return a singleton Neo4j driver instance."""
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
        logger.info(f"[neo4j] Connected to {settings.NEO4J_URI}")
    return _driver


def close_driver() -> None:
    """Close the Neo4j driver connection."""
    global _driver
    if _driver:
        _driver.close()
        _driver = None
        logger.info("[neo4j] Driver closed")


def run_query(cypher: str, params: dict | None = None) -> list[dict]:
    """
    Execute a read Cypher query and return results as list of dicts.
    """
    driver = get_driver()
    with driver.session() as session:
        result = session.run(cypher, params or {})
        return [dict(record) for record in result]


def run_write(cypher: str, params: dict | None = None) -> None:
    """
    Execute a write Cypher query.
    """
    driver = get_driver()
    with driver.session() as session:
        session.run(cypher, params or {})
