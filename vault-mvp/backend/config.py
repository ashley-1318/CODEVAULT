"""
Configuration — loads all environment variables using Pydantic BaseSettings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Groq LLM
    GROQ_API_KEY: str = ""

    # LangSmith Observability
    LANGSMITH_API_KEY: str = ""
    LANGCHAIN_TRACING_V2: str = "true"
    LANGCHAIN_PROJECT: str = "vault-mvp"

    # PostgreSQL
    POSTGRES_URL: str = "postgresql+asyncpg://vault:vaultpass@postgres:5432/vaultdb"

    # Neo4j
    NEO4J_URI: str = "bolt://neo4j:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "vaultpass123"

    # MinIO
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "vaultadmin"
    MINIO_SECRET_KEY: str = "vaultadmin123"
    MINIO_BUCKET: str = "vault-uploads"
    MINIO_USE_SSL: bool = False

    # Ollama
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # Frontend
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
