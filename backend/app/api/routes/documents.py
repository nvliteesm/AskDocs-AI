import os
import shutil
from uuid import uuid4
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.db.supabase import supabase
from app.rag.chunker import chunk_pages
from app.rag.embeddings import create_embedding
from app.rag.pdf_loader import extract_text_from_pdf
from app.models.document import (
    DeleteDocumentResponse,
    DocumentChunksResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    UploadDocumentResponse,
)

router = APIRouter()

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


@router.get("/", response_model=DocumentListResponse)
def list_documents():
    response = (
        supabase
        .table("documents")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "documents": response.data,
    }


@router.get("/{document_id}/chunks", response_model=DocumentChunksResponse)
def get_document_chunks(document_id: str):
    response = (
        supabase
        .table("document_chunks")
        .select("id, document_id, chunk_index, page_number, content, created_at")
        .eq("document_id", document_id)
        .order("chunk_index")
        .execute()
    )

    return {
        "document_id": document_id,
        "chunks": response.data,
        "count": len(response.data),
    }


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(document_id: str):
    response = (
        supabase
        .table("documents")
        .select("*")
        .eq("id", document_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "document": response.data,
    }


@router.delete("/{document_id}", response_model=DeleteDocumentResponse)
def delete_document(document_id: str):
    existing_document = (
        supabase
        .table("documents")
        .select("*")
        .eq("id", document_id)
        .single()
        .execute()
    )

    if not existing_document.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    delete_response = (
        supabase
        .table("documents")
        .delete()
        .eq("id", document_id)
        .execute()
    )

    return {
        "message": "Document deleted successfully.",
        "deleted_document": existing_document.data,
    }

@router.post("/upload", response_model=UploadDocumentResponse)
def upload_document(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB.",
        )
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    safe_filename = f"{uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    pages = extract_text_from_pdf(file_path)

    if not pages:
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from this PDF.",
        )

    document_response = (
        supabase
        .table("documents")
        .insert({
            "filename": file.filename,
            "file_type": "pdf",
            "total_pages": len(pages),
        })
        .execute()
    )

    document = document_response.data[0]
    document_id = document["id"]

    chunks = chunk_pages(pages)

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No usable text chunks were created from this PDF.",
        )

    rows_to_insert = []

    for chunk in chunks:
        embedding = create_embedding(
            chunk["content"],
            task_type="RETRIEVAL_DOCUMENT",
        )

        rows_to_insert.append({
            "document_id": document_id,
            "chunk_index": chunk["chunk_index"],
            "page_number": chunk["page_number"],
            "content": chunk["content"],
            "embedding": embedding,
        })

    supabase.table("document_chunks").insert(rows_to_insert).execute()

    return {
        "message": "Document uploaded and processed successfully.",
        "document": document,
        "chunks_created": len(chunks),
    }