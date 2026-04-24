"""
ARCHITECT-X EMBEDDING PIPELINE
Converts text data (jobs, resumes, skills) to vector embeddings
Stores embeddings in MongoDB and Redis Vector Database
"""

import asyncio
import logging
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
import numpy as np
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingPipeline:
    """
    Pipeline for generating and managing text embeddings
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embedding model
        
        Args:
            model_name: Sentence transformer model to use
                - all-MiniLM-L6-v2 (384 dims, fast, good for production)
                - all-mpnet-base-v2 (768 dims, better quality, slower)
                - cross-encoder/qnli-distilroberta-base (for re-ranking)
        """
        logger.info(f"Loading embedding model: {model_name}")
        try:
            self.model = SentenceTransformer(model_name)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            logger.info(f"✓ Model loaded. Embedding dimension: {self.embedding_dim}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def embed(self, text: str) -> List[float]:
        """
        Convert single text to embedding vector
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the embedding
        """
        if not text or not isinstance(text, str):
            logger.warning(f"Invalid input for embedding: {text}")
            return [0.0] * self.embedding_dim
        
        # Clean text
        text = text.strip()[:1000]  # Limit to 1000 chars
        
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error encoding text: {e}")
            return [0.0] * self.embedding_dim
    
    def embed_batch(self, texts: List[str], show_progress: bool = True) -> List[List[float]]:
        """
        Convert multiple texts to embeddings (vectorized)
        
        Args:
            texts: List of texts to embed
            show_progress: Show progress bar
            
        Returns:
            List of embedding vectors
        """
        logger.info(f"Embedding batch of {len(texts)} texts")
        
        # Filter and clean texts
        cleaned_texts = [
            t.strip()[:1000] if isinstance(t, str) else "" 
            for t in texts
        ]
        
        try:
            embeddings = self.model.encode(
                cleaned_texts,
                show_progress_bar=show_progress,
                convert_to_numpy=True,
                batch_size=32
            )
            logger.info(f"✓ Generated {len(embeddings)} embeddings")
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Error batch encoding: {e}")
            return [[0.0] * self.embedding_dim for _ in texts]
    
    def embed_with_metadata(self, data: List[Dict[str, Any]], 
                           text_field: str = "text") -> List[Dict[str, Any]]:
        """
        Embed texts while preserving metadata
        
        Args:
            data: List of dicts with text_field
            text_field: Which field contains the text to embed
            
        Returns:
            Original data with added "embedding" field
        """
        texts = [item.get(text_field, "") for item in data]
        embeddings = self.embed_batch(texts)
        
        result = []
        for item, embedding in zip(data, embeddings):
            item["embedding"] = embedding
            item["embedding_model"] = self.model.get_sentence_embedding_dimension()
            item["embedded_at"] = datetime.utcnow().isoformat()
            result.append(item)
        
        return result
    
    def similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts
        
        Args:
            text1, text2: Texts to compare
            
        Returns:
            Similarity score 0-1
        """
        emb1 = np.array(self.embed(text1))
        emb2 = np.array(self.embed(text2))
        
        # Cosine similarity
        cosine_sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2) + 1e-10)
        return float(cosine_sim)


# Example usage
if __name__ == "__main__":
    # Initialize pipeline
    pipeline = EmbeddingPipeline()
    
    # Example 1: Single text
    text = "Senior Python Developer with 5 years experience in FastAPI"
    embedding = pipeline.embed(text)
    print(f"Single embedding shape: {len(embedding)}")
    
    # Example 2: Batch embeddings
    texts = [
        "Machine Learning Engineer with PyTorch experience",
        "Full Stack Developer with React and Node.js",
        "Data Scientist with SQL and Pandas expertise"
    ]
    embeddings = pipeline.embed_batch(texts)
    print(f"Batch embeddings: {len(embeddings)} x {len(embeddings[0])}")
    
    # Example 3: Similarity
    sim = pipeline.similarity(texts[0], texts[1])
    print(f"Similarity between text 0 and 1: {sim:.3f}")
    
    # Example 4: With metadata
    jobs = [
        {"id": "job1", "title": "ML Engineer", "text": "Looking for ML engineer with TensorFlow"},
        {"id": "job2", "title": "DevOps", "text": "DevOps engineer needed for Kubernetes"}
    ]
    jobs_with_embeddings = pipeline.embed_with_metadata(jobs, text_field="text")
    print(f"Embedded {len(jobs_with_embeddings)} jobs with metadata")
