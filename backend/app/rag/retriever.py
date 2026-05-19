from typing import Optional

from app.db.supabase import supabase
from app.rag.embeddings import create_embedding


def retrieve_relevant_chunks(
    question: str,
    document_id: Optional[str] = None,
    match_count: int = 5,
):
    """
    Embed the user question and retrieve the most relevant document chunks.
    If document_id is provided, retrieval is limited to that document.
    """
    query_embedding = create_embedding(
        question,
        task_type="RETRIEVAL_QUERY",
    )

    response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_document_id": document_id,
            "match_count": match_count,
        },
    ).execute()

    return response.data