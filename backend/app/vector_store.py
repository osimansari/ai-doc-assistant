import uuid

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Document, DocumentChunk


async def store_document(
    db: AsyncSession,
    filename: str,
    file_type: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> Document:
    doc = Document(filename=filename, file_type=file_type, chunk_count=len(chunks))
    db.add(doc)
    await db.flush()

    for chunk_data, embedding in zip(chunks, embeddings):
        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_text=chunk_data["chunk_text"],
            chunk_index=chunk_data["chunk_index"],
            metadata_=chunk_data["metadata"],
            embedding=embedding,
        )
        db.add(chunk)

    await db.commit()
    await db.refresh(doc)
    return doc


async def search_similar(
    db: AsyncSession, query_embedding: list[float], top_k: int | None = None
) -> list[DocumentChunk]:
    k = top_k or settings.retrieval_top_k
    stmt = (
        select(DocumentChunk)
        .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
        .limit(k)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_documents(db: AsyncSession) -> list[Document]:
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    return list(result.scalars().all())


async def get_document(db: AsyncSession, document_id: uuid.UUID) -> Document | None:
    result = await db.execute(select(Document).where(Document.id == document_id))
    return result.scalar_one_or_none()


async def delete_document(db: AsyncSession, document_id: uuid.UUID) -> bool:
    doc = await get_document(db, document_id)
    if not doc:
        return False
    await db.delete(doc)
    await db.commit()
    return True
