from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.db.supabase import supabase
from app.models.chat import ChatRequest, ChatResponse
from app.rag.generator import generate_answer
from app.rag.prompts import build_grounded_prompt
from app.rag.retriever import retrieve_relevant_chunks

router = APIRouter()


@router.post("/", response_model=ChatResponse)
def ask_question(request: ChatRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    document_metadata = None

    if request.document_id:
        try:
            UUID(request.document_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid document ID format.")

        document_response = (
            supabase
            .table("documents")
            .select("id, filename, total_pages, created_at")
            .eq("id", request.document_id)
            .limit(1)
            .execute()
        )

        if not document_response.data:
            raise HTTPException(status_code=404, detail="Document not found.")

        document_metadata = document_response.data[0]

    lower_question = question.lower()

    if document_metadata and any(
        phrase in lower_question
        for phrase in [
            "how many pages",
            "number of pages",
            "total pages",
            "page count",
        ]
    ):
        return {
            "answer": f"This document has {document_metadata['total_pages']} pages.",
            "sources": [],
        }

    chunks = retrieve_relevant_chunks(
        question=question,
        document_id=request.document_id,
        match_count=5,
    )

    if not chunks:
        return {
            "answer": "I could not find this information in the uploaded document.",
            "sources": [],
        }

    best_similarity = chunks[0].get("similarity") or 0

    if best_similarity < 0.25:
        return {
            "answer": "I could not find this information in the uploaded document.",
            "sources": format_sources(chunks),
        }

    prompt = build_grounded_prompt(
        question=question,
        chunks=chunks,
    )

    answer = generate_answer(prompt)

    return {
        "answer": answer,
        "sources": format_sources(chunks),
    }


def format_sources(chunks: list[dict]) -> list[dict]:
    return [
        {
            "document_id": chunk.get("document_id"),
            "chunk_index": chunk.get("chunk_index"),
            "page_number": chunk.get("page_number"),
            "similarity": round(chunk.get("similarity") or 0, 4),
            "preview": build_preview(chunk.get("content") or ""),
        }
        for chunk in chunks
    ]


def build_preview(content: str, max_length: int = 280) -> str:
    content = content.strip()
    return content if len(content) <= max_length else content[:max_length].rstrip() + "..."