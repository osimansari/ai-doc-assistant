from openai import AsyncOpenAI

from app.config import settings

_client = AsyncOpenAI(
    api_key=settings.embedding_api_key or settings.openai_api_key,
    base_url=settings.embedding_base_url or settings.openai_base_url or None,
)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    batch_size = 2048
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await _client.embeddings.create(
            input=batch,
            model=settings.embedding_model,
        )
        all_embeddings.extend([item.embedding for item in response.data])

    return all_embeddings


async def embed_query(text: str) -> list[float]:
    result = await embed_texts([text])
    return result[0]
