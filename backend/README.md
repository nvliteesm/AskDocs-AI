# AskDocs AI Backend

FastAPI backend for AskDocs AI, a RAG-based document assistant that allows users to upload PDF documents and ask grounded questions with source references.

## Tech Stack

- FastAPI
- Supabase Postgres
- pgvector
- Gemini API
- PyMuPDF
- Pydantic

## Core Flow

1. User uploads a PDF.
2. Backend extracts text page by page.
3. Text is cleaned and split into chunks.
4. Each chunk is embedded using Gemini embeddings.
5. Chunks and embeddings are stored in Supabase with pgvector.
6. User asks a question.
7. The question is embedded.
8. Supabase retrieves the most relevant chunks using vector similarity search.
9. Gemini generates a grounded answer using only retrieved context.
10. API returns the answer and source previews.

## Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

## Run locally
1. python -m venv venv
2. venv\Scripts\Activate.ps1
3. python -m pip install -r requirements.txt
4. uvicorn app.main:app --reload

## API Docs
http://127.0.0.1:8000/docs