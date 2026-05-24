# VerifiDocs

VerifiDocs is a full-stack RAG-powered document assistant for uploaded PDFs. It extracts document text, chunks it, stores Gemini embeddings in Supabase Postgres with pgvector, retrieves relevant evidence, and generates grounded answers with source snippets so users can compare AI responses against the document context.

This portfolio project demonstrates a practical React and FastAPI application with document ingestion, vector search, grounded question answering, persistent chat history, and a lightweight evaluation workflow for testing RAG quality.

## Features

- PDF upload with file type and size validation
- PDF text extraction with PyMuPDF
- Text cleaning and token-based chunking with overlap
- Gemini embedding generation for document chunks and user questions
- Supabase Postgres storage with pgvector similarity retrieval
- Grounded answers generated from retrieved document context
- Source snippets with page numbers and similarity labels
- Confidence labels with confidence reasons
- Persistent chat history per selected document, plus all-document chat history
- Document listing, search, detail view, chunk view endpoint, and deletion
- Evaluation workflow for creating RAG test questions, running them, and marking results

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Axios, Lucide React

**Backend:** FastAPI, Python, Pydantic, PyMuPDF, tiktoken

**Data and AI:** Supabase Postgres, pgvector, Gemini embeddings, Gemini answer generation

## Architecture

1. The React frontend uploads a PDF to the FastAPI backend.
2. The backend saves the uploaded file locally, extracts page text with PyMuPDF, cleans the text, and chunks it with token overlap.
3. Each chunk is embedded with Gemini using `gemini-embedding-001`.
4. Document metadata and chunk embeddings are stored in Supabase Postgres.
5. A user question is embedded with Gemini and sent to the Supabase `match_document_chunks` RPC.
6. Supabase uses pgvector similarity search to return the most relevant chunks, optionally scoped to one document.
7. FastAPI builds a grounded prompt from the retrieved chunks and asks Gemini to answer using only that context.
8. The frontend displays the answer, confidence label, confidence reason, source snippets, and chat history.
9. The evaluation panel can run saved test questions through the same chat flow and store generated answers for manual review.

## Project Structure

```txt
repo-root/
  backend/
    app/
      api/routes/
        chat.py
        documents.py
        evaluation.py
      core/config.py
      db/supabase.py
      models/
      rag/
      main.py
    requirements.txt

  frontend/
    src/
      api/client.js
      components/
      App.jsx
      index.css

  docs/
    demo-script.md
    supabase-setup.md
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Supabase project with the pgvector extension enabled
- Gemini API key

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill in `backend/.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

Set up the Supabase tables and RPC from [docs/supabase-setup.md](docs/supabase-setup.md), then start the API:

```powershell
uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000` by default. Open API docs at `http://127.0.0.1:8000/docs`.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Fill in `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## API Overview

The backend mounts these routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Backend status message |
| `GET` | `/health` | Health check |
| `GET` | `/documents` | List uploaded documents |
| `POST` | `/documents/upload` | Upload and process a PDF |
| `GET` | `/documents/{document_id}` | Get document metadata |
| `GET` | `/documents/{document_id}/chunks` | List stored chunks for a document |
| `DELETE` | `/documents/{document_id}` | Delete a document |
| `POST` | `/chat` | Ask a grounded question across one document or all documents |
| `GET` | `/chat/history?document_id={id}` | Get chat history for a document or all-document scope |
| `DELETE` | `/chat/history?document_id={id}` | Clear chat history for a document or all-document scope |
| `GET` | `/evaluation/tests?document_id={id}` | List evaluation tests |
| `POST` | `/evaluation/tests` | Create an evaluation test |
| `PATCH` | `/evaluation/tests/{test_id}` | Update an evaluation test or manual status |
| `DELETE` | `/evaluation/tests/{test_id}` | Delete an evaluation test |
| `POST` | `/evaluation/run` | Run one saved evaluation test through the chat pipeline |

## Screenshots

Screenshots are intentionally left as placeholders until captured from a current local run:

- Dashboard: `docs/screenshots/dashboard.png`
- Chat answer with sources: `docs/screenshots/chat-answer.png`
- Evaluation workflow: `docs/screenshots/evaluation.png`

## Supabase Setup

See [docs/supabase-setup.md](docs/supabase-setup.md) for the inferred schema, cascade relationships, pgvector index, and `match_document_chunks` RPC required by the current backend.

## Current Limitations

- PDF extraction is text-based. Scanned or image-only PDFs need OCR, which is not implemented.
- Uploaded files are stored in a local `uploads/` directory during processing; durable object storage is not implemented.
- The app currently uses a Supabase service role key from the backend and does not include authentication or per-user isolation.
- CORS is open for local development and should be restricted before deployment.
- Retrieval quality depends on PDF text quality, chunking, embedding quality, and similarity thresholds.
- Evaluation results are reviewed manually; there is no automated grading.

## Planned Improvements

- Add safer upload cleanup or durable file storage.
- Tune retrieval thresholds and chunking based on evaluation results.
- Add OCR support for scanned PDFs.
- Add authentication and user-level document separation if deployed beyond a portfolio demo.
- Harden production configuration, including CORS and secret management.

