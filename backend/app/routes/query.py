from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.rag_pipeline import query_rag

router = APIRouter(prefix="/api", tags=["query"])


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


@router.post("/query")
async def ask_question(body: QueryRequest, db: AsyncSession = Depends(get_db)):
    result = await query_rag(db, body.question.strip())
    return result
