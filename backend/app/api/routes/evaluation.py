from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.supabase import supabase
from app.api.routes.chat import ask_question
from app.models.chat import ChatRequest


router = APIRouter()


class EvaluationCreateRequest(BaseModel):
    document_id: Optional[str] = None
    question: str
    expected_answer: Optional[str] = None
    notes: Optional[str] = None


class EvaluationUpdateRequest(BaseModel):
    question: Optional[str] = None
    expected_answer: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class EvaluationRunRequest(BaseModel):
    test_id: str


VALID_STATUSES = {"not_run", "passed", "failed", "needs_review"}


def validate_uuid(value: str, field_name: str):
    try:
        UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format.")


@router.get("/tests")
def get_evaluation_tests(document_id: Optional[str] = None):
    query = (
        supabase
        .table("evaluation_tests")
        .select("*")
        .order("created_at", desc=True)
    )

    if document_id:
        validate_uuid(document_id, "document_id")
        query = query.eq("document_id", document_id)

    response = query.execute()
    return response.data


@router.post("/tests")
def create_evaluation_test(request: EvaluationCreateRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if request.document_id:
        validate_uuid(request.document_id, "document_id")

        document_response = (
            supabase
            .table("documents")
            .select("id")
            .eq("id", request.document_id)
            .limit(1)
            .execute()
        )

        if not document_response.data:
            raise HTTPException(status_code=404, detail="Document not found.")

    payload = {
        "document_id": request.document_id,
        "question": question,
        "expected_answer": request.expected_answer,
        "notes": request.notes,
        "status": "not_run",
    }

    response = (
        supabase
        .table("evaluation_tests")
        .insert(payload)
        .execute()
    )

    return response.data[0]


@router.patch("/tests/{test_id}")
def update_evaluation_test(test_id: str, request: EvaluationUpdateRequest):
    validate_uuid(test_id, "test_id")

    update_data = {}

    if request.question is not None:
        question = request.question.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question cannot be empty.")
        update_data["question"] = question

    if request.expected_answer is not None:
        update_data["expected_answer"] = request.expected_answer

    if request.status is not None:
        if request.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid evaluation status.")
        update_data["status"] = request.status

    if request.notes is not None:
        update_data["notes"] = request.notes

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    response = (
        supabase
        .table("evaluation_tests")
        .update(update_data)
        .eq("id", test_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Evaluation test not found.")

    return response.data[0]


@router.delete("/tests/{test_id}")
def delete_evaluation_test(test_id: str):
    validate_uuid(test_id, "test_id")

    response = (
        supabase
        .table("evaluation_tests")
        .delete()
        .eq("id", test_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Evaluation test not found.")

    return {"message": "Evaluation test deleted successfully."}


@router.post("/run")
def run_evaluation_test(request: EvaluationRunRequest):
    validate_uuid(request.test_id, "test_id")

    test_response = (
        supabase
        .table("evaluation_tests")
        .select("*")
        .eq("id", request.test_id)
        .limit(1)
        .execute()
    )

    if not test_response.data:
        raise HTTPException(status_code=404, detail="Evaluation test not found.")

    test = test_response.data[0]

    try:
        chat_response = ask_question(
            ChatRequest(
                question=test["question"],
                document_id=test.get("document_id"),
            )
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer for evaluation test: {str(error)}"
        )

    if isinstance(chat_response, dict):
        answer = chat_response.get("answer", "")
        confidence = chat_response.get("confidence")
        confidence_reason = chat_response.get("confidence_reason")
        sources = chat_response.get("sources") or chat_response.get("citations") or []
    else:
        answer = getattr(chat_response, "answer", "")
        confidence = getattr(chat_response, "confidence", None)
        confidence_reason = getattr(chat_response, "confidence_reason", None)
        sources = getattr(chat_response, "sources", []) or []

    update_payload = {
        "generated_answer": answer,
        "confidence": confidence,
        "confidence_reason": confidence_reason,
        "source_count": len(sources),
        "status": "needs_review",
    }

    update_response = (
        supabase
        .table("evaluation_tests")
        .update(update_payload)
        .eq("id", request.test_id)
        .execute()
    )

    if not update_response.data:
        raise HTTPException(
            status_code=500,
            detail="Evaluation result could not be saved."
        )

    return update_response.data[0]