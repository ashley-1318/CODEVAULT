# VAULT — Value-Aware Unified Legacy Transformation (MVP)

**VAULT** is an AI-powered COBOL modernization platform that classifies legacy COBOL business logic, generates regulatory compliance maps, tests dead code against SMF logs, and builds an intelligent graph of program dependencies — with human oversight built natively into the pipeline via a LangGraph interrupt checkpoint.

---

## 🎯 Architecture & Pipeline Overview

VAULT operates a state-of-the-art **CHRONICLE** LangGraph Agent pipeline to process mainframe codeframes analytically and asynchronously:

1. **Code Ingestion**: COBOL files are dragged-and-dropped via the Next.js UI, triggering an archive event to an S3-compatible **MinIO** bucket.
2. **Structural Parsing (`load_program`)**: Custom Python parsing dissects the raw code into identifiable atomic units (Paragraphs, Sections, Variables).
3. **AI Classification (`classify_logic`)**: Every code block is parsed against Groq's high-speed API (`llama-3.3-70b-versatile`) iteratively, classifying the blocks into buckets: Regulatory, Commercial, Operational, or Technical.
4. **Dead-Code Detection (`flag_dead_code`)**: Simulates SMF logs execution monitoring integration to label unexecuted or orphaned subroutines.
5. **Human-in-the-Loop Interruption**: Execution is forcefully halted while exposing the AI's confidence levels to the human architect operating the Next.js frontend, ensuring safe LLM generation validation.
6. **Graph Synthesis (`store_registry`)**: Upon human signature/approval, relational nodes are committed straight back to a **Neo4j** graph database, while static tables populate **PostgreSQL**.

---

## 🛠 Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| **LLM Provider** | Groq `llama-3.3-70b-versatile` | Ultra-fast paragraph categorization |
| **Agent / Orchestration** | LangGraph & LangChain (Python) | Pipeline graph routing and Human-in-the-Loop checkpointing |
| **Backend API** | FastAPI (Python 3.11) | Performant, asynchronous REST API serving jobs |
| **Primary Database** | PostgreSQL 16 + `pgvector` | Standard relational lookups and dynamic tabular views |
| **Graph Database** | Neo4j 5 Community | Entity mapping and semantic dependency graphing linking Code > Paragraphs > Regulations |
| **Embeddings** | Ollama `nomic-embed-text` | Local vector modeling |
| **Object Data Storage** | MinIO | Immutable archival storage mimicking AWS S3 for uploaded .cbl files |
| **Frontend Dashboard** | Next.js 14, React, Tailwind CSS | Sleek, dark-mode charting environment using Recharts and Server Components |
| **Observability** | LangSmith | Tracing end-to-end execution of AI prompt routing |

---

## 🚀 Setup & Execution Instructions

**Prerequisites:** 
- Docker Desktop (≥ 24.x)
- Docker Compose
- Free Groq & LangSmith API Keys

```bash
# 1. Clone the repository
git clone https://github.com/your-org/vault-mvp.git
cd vault-mvp

# 2. Setup your local Environment 
cp .env.example .env
# Edit .env and supply your GROQ_API_KEY and LANGSMITH_API_KEY.

# 3. Spin up all 7 Containerized microservices
docker compose up -d --build

# 4. Wait for Initialization
# (Wait 1-3 minutes for the local ollama_init container to pull the nomic text model).

# 5. Access the Platform
# Open http://localhost:3000 in your browser!
```

### Navigating the Infrastructure:
- **Main Terminal UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Core Specs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Neo4j Database Browser**: [http://localhost:7474](http://localhost:7474) (Creds: `neo4j` / `vaultpass123`)
- **MinIO Backup Storage Layer**: [http://localhost:9001](http://localhost:9001) (Creds: `vaultadmin` / `vaultadmin123`)

---

## 💡 Demo Walkthrough

Once running, here's how to see the architecture perform:

1. **Navigate to the Upload Engine**: Head to `http://localhost:3000/upload`.
2. **Submit Source Code**: Drag and drop the provided `sample_data/sample_loan.cbl`.
3. **Execute CHRONICLE**: Click **"Run CHRONICLE Pipeline →"**. You will visually see the backend processing phases advance on-screen.
4. *(Note: Groq's free-tier rate limitations are meticulously handled via built-in exponential backoff loops in the backend, meaning execution of the sample loan application takes ~45-90 seconds)*.
5. **Approve Output**: The system halts and presents you with the categorized code blocks. Verify the regulations tagged (e.g. `Basel IV`, `IFRS 9`) and click **"Approve & Store"**.
6. **Analyze Compliance Map / Code Graph**: You can now navigate the deeply rich **Compliance Map** for `LOAN-CALC`, view data charts mapping the distribution of dead-code versus crucial compliance code, and render SVG interactive node graphs at `/graph/[program]`.

---

## 🤝 Contributing
Open source PRs are entirely welcomed covering issues, speed optimizations, or frontend improvements.

## License
MIT
