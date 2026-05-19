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