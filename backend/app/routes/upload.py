import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.chunker import split_text
from app.config import settings
from app.database import get_db
from app.document_loader import SUPPORTED_TYPES, extract_text
from app.embeddings import embed_texts
from app.vector_store import store_document

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
async def upload_document(file: UploadFile, db: AsyncSession = Depends(get_db)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Supported: {', '.join(SUPPORTED_TYPES)}",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    # Save file to disk
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex[:8]
    safe_filename = f"{file_id}_{file.filename}"
    file_path = upload_dir / safe_filename
    file_path.write_bytes(file_bytes)

    # Process: extract → chunk → embed → store
    text = extract_text(file_bytes, file.filename)
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the file")

    chunks = split_text(text, file.filename)
    if not chunks:
        raise HTTPException(status_code=400, detail="No chunks produced from the document")

    embeddings = await embed_texts([c["chunk_text"] for c in chunks])

    doc = await store_document(db, file.filename, suffix, chunks, embeddings)

    return {
        "document_id": str(doc.id),
        "filename": doc.filename,
        "chunk_count": doc.chunk_count,
        "message": f"Successfully processed '{file.filename}' into {doc.chunk_count} chunks.",
    }
