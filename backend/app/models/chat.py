from typing import List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    document_id: Optional[str] = None


class SourcePreview(BaseModel):
    document_id: str
    chunk_index: int
    page_number: Optional[int] = None
    similarity: float
    preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourcePreview]
    confidence: str
    confidence_reason: str


class ChatHistoryItem(BaseModel):
    id: str
    document_id: Optional[str] = None
    question: str
    answer: str
    confidence: str
    confidence_reason: str
    sources: List[SourcePreview]
    created_at: str


class ChatHistoryResponse(BaseModel):
    messages: List[ChatHistoryItem]