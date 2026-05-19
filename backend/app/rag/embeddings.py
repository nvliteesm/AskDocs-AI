from google import genai
from google.genai import types

from app.core.config import settings


client = genai.Client(api_key=settings.gemini_api_key)


def create_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """
    Create a 768-dimension Gemini embedding.

    task_type:
    - RETRIEVAL_DOCUMENT for document chunks
    - RETRIEVAL_QUERY for user questions
    """
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=768,
        ),
    )

    return response.embeddings[0].values