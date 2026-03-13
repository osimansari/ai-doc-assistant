from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.embeddings import embed_query
from app.vector_store import search_similar

_client = AsyncOpenAI(
    api_key=settings.openai_api_key or "unused",
    base_url=settings.openai_base_url or None,
)

SYSTEM_PROMPT = """You are a helpful document assistant. Answer the user's question based ONLY on the provided context documents. If the context does not contain enough information to answer, say so clearly.

When referencing information, mention the source filename and chunk number so the user can verify."""


async def query_rag(db: AsyncSession, question: str) -> dict:
    query_embedding = await embed_query(question)
    chunks = await search_similar(db, query_embedding)

    if not chunks:
        return {
            "answer": "No relevant documents found. Please upload some documents first.",
            "sources": [],
        }

    context_parts = []
    sources = []
    for chunk in chunks:
        source_info = {
            "filename": chunk.metadata_.get("filename", "unknown"),
            "chunk_index": chunk.chunk_index,
            "preview": chunk.chunk_text[:200],
        }
        sources.append(source_info)
        context_parts.append(
            f"[Source: {source_info['filename']}, Chunk {chunk.chunk_index}]\n{chunk.chunk_text}"
        )

    context = "\n\n---\n\n".join(context_parts)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Context:\n{context}\n\n---\n\nQuestion: {question}",
        },
    ]

    response = await _client.chat.completions.create(
        model=settings.llm_model,
        messages=messages,
        temperature=1, # 0.3,
        max_completion_tokens=1024,
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": sources,
    }
