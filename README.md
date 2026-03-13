# AI Doc Assistant

A full-stack RAG (Retrieval-Augmented Generation) application that lets you upload documents and ask natural-language questions about their content. Answers are grounded in your uploaded documents and include source citations.

### RAG Pipeline Flow

1. **Upload** — Document saved locally and to the database
2. **Extract** — Text extracted from PDF/DOCX/TXT/MD files
3. **Chunk** — Text split into ~500-character overlapping chunks
4. **Embed** — Each chunk embedded using `text-embedding-3-small`
5. **Store** — Embeddings stored in PostgreSQL with pgvector
6. **Query** — User question embedded, cosine similarity retrieves top-k chunks
7. **Generate** — GPT-4o synthesizes an answer from the retrieved context

## Tech Stack

| Layer          | Technology                                   |
|----------------|----------------------------------------------|
| Frontend       | React 19, TypeScript, Vite 6, Tailwind CSS 3 |
| Backend        | Python 3.10+, FastAPI, SQLAlchemy 2, asyncpg  |
| LLM            | OpenAI GPT-4o                                |
| Embeddings     | OpenAI text-embedding-3-small (1536-dim)     |
| Vector DB      | PostgreSQL + pgvector                        |
| Doc Parsing    | pdfplumber, python-docx                      |
| Text Splitting | LangChain RecursiveCharacterTextSplitter     |

## Project Structure

```
ai-doc-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, startup
│   │   ├── config.py            # Pydantic settings (env vars)
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── database.py          # Async DB engine & session
│   │   ├── document_loader.py   # PDF/DOCX/TXT/MD text extraction
│   │   ├── chunker.py           # Text chunking logic
│   │   ├── embeddings.py        # OpenAI embedding client
│   │   ├── vector_store.py      # pgvector similarity search
│   │   ├── openai_client.py     # OpenAI chat completion client
│   │   ├── rag_pipeline.py      # End-to-end RAG orchestration
│   │   └── routes/
│   │       ├── upload.py        # POST /api/upload
│   │       ├── query.py         # POST /api/query
│   │       └── documents.py     # GET/DELETE /api/documents
│   ├── data/documents/          # Uploaded files stored here
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main layout
│   │   ├── api/client.ts        # Axios API client
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx   # Chat conversation UI
│   │   │   ├── MessageBubble.tsx# Message rendering + sources
│   │   │   ├── UploadPanel.tsx  # Drag-and-drop file upload
│   │   │   └── DocumentList.tsx # Uploaded document management
│   │   └── types/index.ts      # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts           # Proxies /api → backend
└── README.md
```

## Design Architecture

### Layered Architecture

The system follows a clean **3-tier architecture** with strict separation of concerns:

```
┌────────────────────────────────────────────────────────┐
│                  Presentation Layer                     │
│         React 19 · TypeScript · Tailwind CSS           │
│   UploadPanel  │  DocumentList  │  ChatWindow          │
└───────────────────────┬────────────────────────────────┘
                        │  Axios HTTP (/api proxy)
┌───────────────────────▼────────────────────────────────┐
│                     API Layer                           │
│              FastAPI Routes (async)                     │
│   /api/upload  │  /api/query  │  /api/documents        │
└───────────────────────┬────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────┐
│                   Service Layer                         │
│  rag_pipeline  │  embeddings  │  vector_store          │
│  chunker       │  document_loader  │  openai_client    │
└───────────────────────┬────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────┐
│                    Data Layer                           │
│         PostgreSQL + pgvector  (asyncpg driver)        │
│   documents table  │  document_chunks table (Vector)   │
└────────────────────────────────────────────────────────┘
```

| Layer | Modules | Responsibility |
|-------|---------|----------------|
| **Presentation** | `App.tsx`, `ChatWindow`, `UploadPanel`, `DocumentList` | UI rendering, state management, user interaction |
| **API** | `routes/upload.py`, `routes/query.py`, `routes/documents.py` | Request validation, routing, response formatting |
| **Service** | `rag_pipeline.py`, `embeddings.py`, `vector_store.py`, `chunker.py`, `document_loader.py`, `openai_client.py` | Business logic, RAG orchestration, external API calls |
| **Data** | `database.py`, `models.py` | ORM models, async connection pool, session management |
| **Config** | `config.py` | Centralised settings via Pydantic `BaseSettings` + `.env` |

### Key Design Decisions

- **Async everywhere** — FastAPI endpoints, SQLAlchemy `AsyncSession` with `asyncpg`, and `AsyncOpenAI` client for non-blocking I/O throughout the stack
- **Dependency injection** — Database sessions provided via FastAPI's `Depends(get_db)` with automatic cleanup
- **Connection pooling** — SQLAlchemy `create_async_engine` manages an asyncpg pool; each request gets a fresh session
- **Dev proxy** — Vite proxies `/api/*` requests to `http://localhost:8000`, avoiding CORS issues during development
- **CORS** — Backend allows `localhost:5173` and `127.0.0.1:5173` for all methods/headers
- **Embedding batching** — Texts are embedded in batches of 2 048 to optimise OpenAI API usage
- **Cascade delete** — Deleting a document automatically removes all its chunks via FK cascade

## Workflow

### Document Ingestion Workflow

This is the end-to-end flow when a user uploads a file:

```
┌──────────┐    POST /api/upload     ┌──────────────┐
│  Browser  │ ─────────────────────► │  upload.py    │
│  (React)  │   multipart/form-data  │  route        │
└──────────┘                         └──────┬───────┘
                                            │
                        ┌───────────────────▼───────────────────┐
                        │  1. Validate file extension            │
                        │     (.pdf, .txt, .md, .docx)          │
                        ├───────────────────────────────────────┤
                        │  2. Save file to disk                  │
                        │     data/documents/{uuid}_{filename}  │
                        ├───────────────────────────────────────┤
                        │  3. Extract text (document_loader)     │
                        │     PDF → pdfplumber                  │
                        │     DOCX → python-docx                │
                        │     TXT/MD → UTF-8 decode             │
                        ├───────────────────────────────────────┤
                        │  4. Chunk text (chunker)               │
                        │     RecursiveCharacterTextSplitter     │
                        │     500 chars, 100 overlap             │
                        │     Separators: ¶ → \n → ". " → " "  │
                        ├───────────────────────────────────────┤
                        │  5. Generate embeddings (embeddings)   │
                        │     text-embedding-3-small (1536-dim) │
                        │     Batched in groups of 2048         │
                        ├───────────────────────────────────────┤
                        │  6. Store in database (vector_store)   │
                        │     INSERT → documents table          │
                        │     INSERT → document_chunks + vectors│
                        └───────────────────────────────────────┘
                                            │
┌──────────┐   {document_id, chunk_count}   │
│  Browser  │ ◄─────────────────────────────┘
└──────────┘
```

**Detailed steps:**

1. **Validation** — The route checks that the uploaded file has a supported extension (`.pdf`, `.txt`, `.md`, `.docx`). Unsupported types are rejected with a 400 error.
2. **File storage** — The file is saved to `data/documents/` with a UUID prefix to prevent name collisions.
3. **Text extraction** — `extract_text()` dispatches to format-specific parsers: `pdfplumber` for PDFs (page-by-page), `python-docx` for DOCX (paragraph-by-paragraph), or simple UTF-8 decode for plain text.
4. **Chunking** — `split_text()` uses LangChain's `RecursiveCharacterTextSplitter` with hierarchical separators (`\n\n` → `\n` → `. ` → ` ` → `""`), producing overlapping chunks that preserve document structure.
5. **Embedding** — `embed_texts()` sends chunk texts to OpenAI's embedding API in batches of up to 2 048, returning 1 536-dimensional vectors.
6. **Storage** — `store_document()` inserts a `Document` row and one `DocumentChunk` row per chunk (with its embedding stored as a pgvector `Vector(1536)` column).

### Query Workflow

This is the end-to-end flow when a user asks a question:

```
┌──────────┐    POST /api/query      ┌──────────────┐
│  Browser  │ ─────────────────────► │  query.py     │
│  (React)  │   {"question": "..."}  │  route        │
└──────────┘                         └──────┬───────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │  rag_pipeline.query_rag()              │
                        ├───────────────────────────────────────┤
                        │  1. Embed the question                 │
                        │     embed_query() → 1536-dim vector   │
                        ├───────────────────────────────────────┤
                        │  2. Similarity search                  │
                        │     search_similar() via pgvector     │
                        │     ORDER BY cosine_distance ASC      │
                        │     LIMIT 5 (top_k)                   │
                        ├───────────────────────────────────────┤
                        │  3. Build context from top-k chunks    │
                        │     [Source: file.pdf, Chunk 0]       │
                        │     chunk_text...                      │
                        │     --- (separator) ---               │
                        ├───────────────────────────────────────┤
                        │  4. Construct prompt                   │
                        │     System: "Answer ONLY from context" │
                        │     User: context + question          │
                        ├───────────────────────────────────────┤
                        │  5. Call LLM                           │
                        │     GPT-4o, max 1024 tokens           │
                        └───────────────────────────────────────┘
                                            │
┌──────────┐   {answer, sources[]}          │
│  Browser  │ ◄─────────────────────────────┘
└──────────┘
```

**Detailed steps:**

1. **Embed question** — The user's question is converted to a 1 536-dimensional vector using the same embedding model (`text-embedding-3-small`).
2. **Similarity search** — pgvector's `cosine_distance()` operator finds the top-k closest document chunks. Lower distance = higher relevance.
3. **Context assembly** — Retrieved chunks are formatted with source labels (`[Source: filename, Chunk N]`) and joined with `---` separators.
4. **Prompt construction** — A system prompt instructs GPT-4o to answer **only** from the provided context and cite source filenames and chunk numbers.
5. **LLM call** — `openai_client` sends the messages to GPT-4o (max 1 024 tokens) and returns the generated answer along with the source metadata.

### Frontend Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌─────── Sidebar (w-80) ───────┐  ┌──── Main Area (flex-1) ──┐│
│  │  UploadPanel                 │  │                           ││
│  │  • Drag-and-drop zone        │  │  ChatWindow               ││
│  │  • File type validation      │  │  • Message history         ││
│  │  • Upload progress/error     │  │  • Auto-scroll to bottom  ││
│  │                              │  │  • Loading indicator       ││
│  │  DocumentList                │  │                           ││
│  │  • Fetched on mount          │  │  MessageBubble (per msg)  ││
│  │  • Refreshed after upload    │  │  • User / Assistant style ││
│  │  • Delete button per doc     │  │  • Source citations       ││
│  │  • Sorted by upload date     │  │  • Markdown rendering     ││
│  └──────────────────────────────┘  └───────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**State management** — All state lives in `App.tsx` via React hooks (`useState`):

| State | Type | Purpose |
|-------|------|---------|
| `messages` | `ChatMessage[]` | Conversation history |
| `documents` | `DocumentInfo[]` | Uploaded document list |
| `isLoading` | `boolean` | Query in progress |
| `isUploading` | `boolean` | Upload in progress |
| `error` | `string \| null` | Error display |

**Interaction flows:**

- **Upload** → `UploadPanel` calls `api.uploadDocument()` → on success, triggers `refreshDocuments()` to reload the document list
- **Ask question** → `ChatWindow` calls `api.queryAssistant()` → appends user message, then assistant response (with sources) to `messages`
- **Delete document** → `DocumentList` calls `api.deleteDocument()` → refreshes the list
- **On mount** → `useEffect` fetches the initial document list via `api.listDocuments()`

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** with the `pgvector` extension installed

### Install pgvector (if not already installed)

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

## Setup

### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Variables

Copy the example env file and fill in your values:

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit the `.env` file in the `backend/` directory with your OpenAI API key and database connection string. See `.env.example` for all available configuration options.

### 3. Create the database

```sql
CREATE DATABASE ai_doc_assistant;
```

Tables are created automatically on first startup.

### 4. Frontend

```bash
cd frontend
npm install
```

## Running

### Start the backend

```bash
cd backend
.\venv\Scripts\activate           # Windows
uvicorn app.main:app --reload --port 8000
```

### Start the frontend (separate terminal)

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

## API Endpoints

All endpoints are prefixed with `/api`.

| Method   | Endpoint                       | Description               |
|----------|--------------------------------|---------------------------|
| `POST`   | `/api/upload`                  | Upload a document (multipart/form-data) |
| `POST`   | `/api/query`                   | Ask a question (`{ "question": "..." }`) |
| `GET`    | `/api/documents`               | List all uploaded documents |
| `DELETE` | `/api/documents/{document_id}` | Delete a document          |
| `GET`    | `/api/health`                  | Health check               |

### Example: Query

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I create a YAML pipeline?"}'
```

Response:

```json
{
  "answer": "To create a YAML pipeline...",
  "sources": [
    {
      "filename": "How-To-Create-Yaml-Pipeline.md",
      "chunk_index": 2,
      "preview": "First 200 characters of the chunk..."
    }
  ]
}
```

## Usage

1. **Upload documents** — Use the sidebar to drag-and-drop or browse for PDF, TXT, MD, or DOCX files
2. **Ask questions** — Type your question in the chat input
3. **Get answers** — The assistant retrieves relevant document chunks and generates answers with source citations

## Database Schema

**documents** — Stores uploaded file metadata

| Column       | Type     |
|--------------|----------|
| id           | UUID (PK)|
| filename     | String   |
| file_type    | String   |
| chunk_count  | Integer  |
| uploaded_at  | DateTime |

**document_chunks** — Stores text chunks and their vector embeddings

| Column       | Type              |
|--------------|-------------------|
| id           | UUID (PK)         |
| document_id  | UUID (FK)         |
| chunk_text   | Text              |
| embedding    | Vector(1536)      |
| chunk_index  | Integer           |
| metadata_    | JSONB             |
| created_at   | DateTime          |

## API Endpoints

| Method | Endpoint               | Description                    |
|--------|------------------------|--------------------------------|
| GET    | `/api/health`          | Health check                   |
| POST   | `/api/upload`          | Upload a document              |
| GET    | `/api/documents`       | List all uploaded documents    |
| DELETE | `/api/documents/{id}`  | Delete a document and chunks   |
| POST   | `/api/query`           | Ask a question                 |
