from typing import Dict, List

import tiktoken

from app.rag.text_cleaner import clean_text


def chunk_pages(
    pages: List[Dict],
    max_tokens: int = 500,
    overlap_tokens: int = 80,
) -> List[Dict]:
    """
    Chunk PDF pages into token-limited chunks while preserving page numbers.
    """
    encoding = tiktoken.get_encoding("cl100k_base")

    chunks = []
    chunk_index = 0

    for page in pages:
        page_number = page["page_number"]
        text = clean_text(page["text"])

        if not text:
            continue

        tokens = encoding.encode(text)

        start = 0
        while start < len(tokens):
            end = start + max_tokens
            chunk_tokens = tokens[start:end]
            chunk_text = encoding.decode(chunk_tokens).strip()

            if chunk_text:
                chunks.append({
                    "chunk_index": chunk_index,
                    "page_number": page_number,
                    "content": chunk_text,
                })
                chunk_index += 1

            start += max_tokens - overlap_tokens

    return chunks