import os
import chromadb
from loguru import logger
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction


class ChromaDBManager:
    def __init__(self, emb_api_key: str, emb_base_url: str, emb_model_name: str) -> None:
        self.chroma_client = chromadb.PersistentClient(
            path="./chroma_db",
        )

        # 检查API配置是否完整
        if not emb_api_key or not emb_base_url or not emb_model_name:
            logger.warning(
                "Embedding API configuration is incomplete. "
                f"API Key: {'✓' if emb_api_key else '✗'}, "
                f"Base URL: {'✓' if emb_base_url else '✗'}, "
                f"Model: {'✓' if emb_model_name else '✗'}. "
                "ChromaDB will run with default embedding function."
            )
            self.embedding_function = None
            self.api_configured = False
        else:
            try:
                self.embedding_function = OpenAIEmbeddingFunction(
                    api_base=emb_base_url,
                    api_key=emb_api_key,
                    model_name=emb_model_name,
                )
                self.api_configured = True
                logger.info("ChromaDB initialized successfully with OpenAI embedding function.")
            except Exception as e:
                logger.warning(
                    f"Failed to initialize OpenAI embedding function: {e}. Using default embedding."
                )
                self.embedding_function = None
                self.api_configured = False

    def create_collection(self, name: str):
        """创建一个新的集合"""
        if self.api_configured:
            return self.chroma_client.get_or_create_collection(
                name=name,
                embedding_function=self.embedding_function,  # type: ignore
            )
        else:
            logger.warning(
                f"Creating collection '{name}' without custom embedding function due to missing API configuration."
            )
            return self.chroma_client.get_or_create_collection(name=name)

    def upsert(self, collection_name: str, documents: list[str], ids: list[str]):
        """向指定集合中插入或更新文档"""
        if self.api_configured:
            collection = self.chroma_client.get_collection(
                name=collection_name,
                embedding_function=self.embedding_function,  # type: ignore
            )
        else:
            logger.warning(
                f"Accessing collection '{collection_name}' without custom embedding function."
            )
            collection = self.chroma_client.get_collection(name=collection_name)
        collection.upsert(documents=documents, ids=ids)

    def query(self, collection_name: str, query: str, n_results: int = 5):
        """查询指定集合中的文档"""
        if self.api_configured:
            collection = self.chroma_client.get_collection(
                name=collection_name, embedding_function=self.embedding_function  # type: ignore
            )
        else:
            logger.warning(
                f"Querying collection '{collection_name}' without custom embedding function."
            )
            collection = self.chroma_client.get_collection(name=collection_name)
        results = collection.query(query_texts=[query], n_results=n_results)
        return results


# global
chroma_db_manager = ChromaDBManager(
    emb_api_key=os.getenv("EMBEDDING_API_KEY", ""),
    emb_base_url=os.getenv("EMBEDDING_API_BASE_URL", "https://api.openai.com/v1/embeddings"),
    emb_model_name=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
)
