from typing import List, Optional

from pydantic import BaseModel


class Document(BaseModel):
    id: str
    filename: str
    file_type: str
    total_pages: Optional[int] = None
    created_at: str


class DocumentListResponse(BaseModel):
    documents: List[Document]


class DocumentDetailResponse(BaseModel):
    document: Document


class DocumentChunk(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: Optional[int] = None
    content: str
    created_at: str


class DocumentChunksResponse(BaseModel):
    document_id: str
    chunks: List[DocumentChunk]
    count: int


class UploadDocumentResponse(BaseModel):
    message: str
    document: Document
    chunks_created: int


class DeleteDocumentResponse(BaseModel):
    message: str
    deleted_document: Document