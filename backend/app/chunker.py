from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings


def split_text(text: str, filename: str) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    return [
        {
            "chunk_text": chunk,
            "chunk_index": i,
            "metadata": {"filename": filename, "chunk_index": i},
        }
        for i, chunk in enumerate(chunks)
    ]
