import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.vector_store import delete_document, list_documents

router = APIRouter(prefix="/api", tags=["documents"])


@router.get("/documents")
async def get_documents(db: AsyncSession = Depends(get_db)):
    docs = await list_documents(db)
    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "file_type": doc.file_type,
            "chunk_count": doc.chunk_count,
            "uploaded_at": doc.uploaded_at.isoformat(),
        }
        for doc in docs
    ]


@router.delete("/documents/{document_id}")
async def remove_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await delete_document(db, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}
