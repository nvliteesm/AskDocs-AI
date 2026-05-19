def build_grounded_prompt(question: str, chunks: list[dict]) -> str:
    """
    Build a grounded prompt using retrieved document chunks.
    """
    context_blocks = []

    for index, chunk in enumerate(chunks, start=1):
        context_blocks.append(
            f"""
Source {index}
Page: {chunk.get("page_number")}
Similarity: {chunk.get("similarity")}
Content:
{chunk.get("content")}
"""
        )

    context = "\n".join(context_blocks)

    return f"""
You are AskDocs AI, a document question-answering assistant.

Answer the user's question using only the provided document context.

Rules:
1. Use only the document context below.
2. Do not use outside knowledge.
3. If the answer is not found in the context, say: "I could not find this information in the uploaded document."
4. Do not invent facts.
5. Keep the answer clear and direct.
6. Mention the page number when the answer comes from a specific source.

Document context:
{context}

User question:
{question}

Answer:
"""