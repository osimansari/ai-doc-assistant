from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    openai_base_url: str
    database_url: str
    chunk_size: int = 500
    chunk_overlap: int = 100
    embedding_model: str
    embedding_dimensions: int = 1536
    embedding_base_url: str = ""
    embedding_api_key: str = ""
    llm_model: str
    retrieval_top_k: int = 5
    upload_dir: str = "data/documents"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
