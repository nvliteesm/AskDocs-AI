from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.db.supabase import supabase
from app.models.chat import ChatRequest, ChatResponse, ChatHistoryResponse
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
        validate_document_id(request.document_id)

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
        response_data = {
            "answer": f"This document has {document_metadata['total_pages']} pages.",
            "confidence": "high",
            "confidence_reason": "The answer comes directly from the stored document metadata.",
            "sources": [],
        }

        save_chat_message(
            document_id=request.document_id,
            question=question,
            response_data=response_data,
        )

        return response_data

    chunks = retrieve_relevant_chunks(
        question=question,
        document_id=request.document_id,
        match_count=5,
    )

    confidence, confidence_reason = calculate_confidence(chunks)

    if not chunks:
        response_data = {
            "answer": "I could not find this information in the uploaded document.",
            "confidence": confidence,
            "confidence_reason": confidence_reason,
            "sources": [],
        }

        save_chat_message(
            document_id=request.document_id,
            question=question,
            response_data=response_data,
        )

        return response_data

    formatted_sources = format_sources(chunks)

    if confidence == "not_found":
        response_data = {
            "answer": "I could not find this information in the uploaded document.",
            "confidence": confidence,
            "confidence_reason": confidence_reason,
            "sources": formatted_sources,
        }

        save_chat_message(
            document_id=request.document_id,
            question=question,
            response_data=response_data,
        )

        return response_data

    prompt = build_grounded_prompt(
        question=question,
        chunks=chunks,
    )

    answer = generate_answer(prompt)

    response_data = {
        "answer": answer,
        "confidence": confidence,
        "confidence_reason": confidence_reason,
        "sources": formatted_sources,
    }

    save_chat_message(
        document_id=request.document_id,
        question=question,
        response_data=response_data,
    )

    return response_data


@router.get("/history", response_model=ChatHistoryResponse)
def get_chat_history(document_id: str | None = Query(default=None)):
    if document_id:
        validate_document_id(document_id)

        response = (
            supabase
            .table("chat_messages")
            .select("*")
            .eq("document_id", document_id)
            .order("created_at", desc=True)
            .limit(30)
            .execute()
        )
    else:
        response = (
            supabase
            .table("chat_messages")
            .select("*")
            .is_("document_id", "null")
            .order("created_at", desc=True)
            .limit(30)
            .execute()
        )

    return {
        "messages": response.data or []
    }


@router.delete("/history")
def clear_chat_history(document_id: str | None = Query(default=None)):
    if document_id:
        validate_document_id(document_id)

        (
            supabase
            .table("chat_messages")
            .delete()
            .eq("document_id", document_id)
            .execute()
        )
    else:
        (
            supabase
            .table("chat_messages")
            .delete()
            .is_("document_id", "null")
            .execute()
        )

    return {
        "message": "Chat history cleared."
    }


def validate_document_id(document_id: str):
    try:
        UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")


def save_chat_message(document_id: str | None, question: str, response_data: dict):
    """
    Save a completed Q&A pair.

    History saving should not block the main answer flow.
    If saving fails, the user should still receive the generated answer.
    """
    try:
        supabase.table("chat_messages").insert(
            {
                "document_id": document_id,
                "question": question,
                "answer": response_data["answer"],
                "confidence": response_data["confidence"],
                "confidence_reason": response_data["confidence_reason"],
                "sources": response_data["sources"],
            }
        ).execute()
    except Exception as error:
        print(f"Failed to save chat message: {error}")


def calculate_confidence(chunks: list[dict]) -> tuple[str, str]:
    if not chunks:
        return "not_found", "No relevant document chunks were retrieved."

    similarities = [
        chunk.get("similarity") or 0
        for chunk in chunks
    ]

    best_similarity = max(similarities)
    strong_sources = [
        similarity
        for similarity in similarities
        if similarity >= 0.45
    ]

    if best_similarity < 0.25:
        return "not_found", "The retrieved evidence is too weak to support an answer."

    if best_similarity >= 0.60 and len(strong_sources) >= 2:
        return "high", "The answer is supported by multiple strongly relevant sources."

    if best_similarity >= 0.40:
        return "medium", "The answer is supported by relevant evidence, but source coverage is limited."

    return "low", "The answer may be only partially supported because the retrieved evidence is weak."


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