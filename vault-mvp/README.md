# VAULT — Value-Aware Unified Legacy Transformation (v1.1)

**VAULT** is an enterprise-grade AI modernization platform for legacy COBOL systems. It goes beyond simple analysis by using **Agentic RAG**, **Knowledge Graphs**, and **Multi-Language Refactoring** to transform 50-year-old mainframe logic into modern, cloud-native architectures.

---

## 🌟 Key Features (Implemented)

### 1. 🤖 Agentic RAG ("Chat with Codebase")
- **Semantic Search**: Ask natural language questions about your COBOL logic (e.g., *"How is interest calculated?"*).
- **Context-Aware Memory**: The chatbot maintains conversation history for complex, multi-turn technical inquiries.
- **Vector Powered**: Uses `pgvector` and Ollama `nomic-embed-text` for sub-second retrieval.

### 2. 🖨️ Multi-Linguistic Translation (Expert Polyglot)
- **🚀 One-Click Refactor**: Automatically transforms legacy COBOL paragraphs into modern logic.
- **Target Languages**: Supports instant translation into **Python 3.12**, **Java (Spring Boot)**, and **TypeScript**.
- **Context-Aware**: The engine understands shared variables, PIC clauses, and Copybook dependencies during translation.
- **Copy to Clipboard**: One-click code extraction for developers.

### 3. 📂 Multi-File, Copybook & Compiler Artefact Parsing
- **Individual Copybook Support**: Upload `.cpy` and `.copy` files directly for data definition analysis.
- **ZIP Resolution**: Upload entire system bundles (.zip) and VAULT will automatically resolve `COPY` statement dependencies.
- **Ground Truth Parsing**: Supports IBM COBOL Compiler Listing files (`.lst`). VAULT extracts exact runtime rounding, truncation, and precision rules (NUMPROC/TRUNC/ARITH) that aren't visible in raw source code.

### 4. 📑 Compliance & Export Engine
- **Regulatory Mapping**: Automatically identifies and scores code blocks against regulations like **Basel IV**, **GDPR**, and **IFRS 9**.
- **Premium Reports**: Export high-fidelity **PDF** and **CSV** reports for auditors and stakeholders.
- **High-Visibility UI**: Optimized print engine handles charts and complex tables for professional documentation.

### 5. 📡 Live SMF Log Ingestion (Dead Code Detection)
- **Real-time Webhooks**: Accepts live execution logs from mainframe **SMF-70** records.
- **Dynamic Analysis**: Compares "code on disk" vs. "code in execution" to identify 100% certain Dead Code candidates.
- **Live Status Dashboard**: Watch your code "pulse" in real-time as paragraphs are executed on the mainframe.

---

## 🛠 Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| **Orchestration** | LangGraph & LangChain | Agentic state management & Human-in-the-loop |
| **LLM Provider** | Groq `llama-3.3-70b` | High-speed logic classification & translation |
| **Vector DB** | PostgreSQL 16 + `pgvector` | Semantic search & metadata storage |
| **Graph DB** | Neo4j 5 Community | Dependency mapping & code lineage |
| **Object Storage**| MinIO | S3-compatible archival for COBOL/Copybooks |
| **Embeddings**   | Ollama `nomic-embed-text` | Local high-performance vector modeling |
| **Frontend**     | Next.js 14 (React) | Premium dark-mode dashboard |

---

## 🚀 Quick Start

**Prerequisites:** 
- Docker Desktop
- Groq API Key (Free)

```bash
# 1. Clone & Enter
git clone https://github.com/ashley-1318/CODEVAULT.git
cd CODEVAULT/vault-mvp

# 2. Configure
cp .env.example .env
# Add your GROQ_API_KEY to .env

# 3. Run Everything
docker compose up -d --build
```

### Access Ports & Credentials:
| Service | URL | Credentials |
|---|---|---|
| **Vault UI** | [http://localhost:3000](http://localhost:3000) | - |
| **API Backend** | [http://localhost:8000/docs](http://localhost:8000/docs) | - |
| **Neo4j Graph** | [http://localhost:7474](http://localhost:7474) | `neo4j` / `vaultpass123` |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | `vaultadmin` / `vaultadmin123` |

---

## 💡 Validation Suite (Sample Data)
The system includes specialized samples to test every feature:
- `sample_loan.cbl`: Base loan processing logic.
- `sample_loan.lst`: Real IBM compiler listing for precision testing.
- `sample_settlement.cbl`: Multi-program dependency test.
- `sample_gdpr_purge.cbl`: GDPR compliance & retention logic test.
- `multi_file_demo_pack.zip`: Full system bundle for ZIP resolution.

---

## ⚖️ License
MIT - Created by **Ashley Josco**
