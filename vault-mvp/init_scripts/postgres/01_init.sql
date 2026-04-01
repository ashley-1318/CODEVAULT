-- Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    program_id UUID UNIQUE NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(512) NOT NULL,
    minio_path TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'uploaded',
    regulatory_risk_score FLOAT,
    thread_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance maps table (stores full JSON compliance map)
CREATE TABLE IF NOT EXISTS compliance_maps (
    id SERIAL PRIMARY KEY,
    program_id UUID REFERENCES programs(program_id),
    compliance_map JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paragraph embeddings table (for semantic search via pgvector)
CREATE TABLE IF NOT EXISTS paragraph_embeddings (
    id SERIAL PRIMARY KEY,
    program_id UUID REFERENCES programs(program_id),
    paragraph_name VARCHAR(255) NOT NULL,
    classification VARCHAR(100),
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast program lookup
CREATE INDEX IF NOT EXISTS idx_programs_name ON programs(program_name);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_para_embedding ON paragraph_embeddings 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
