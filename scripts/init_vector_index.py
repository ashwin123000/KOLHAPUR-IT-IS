"""
ARCHITECT-X VECTOR INDEX INITIALIZATION
Creates Redis vector indexes for similarity search
CRITICAL: Must run before seeding database
"""

import os
import asyncio
import logging
from typing import Optional
from redis import Redis
from redis.commands.search.field import VectorField, TextField, NumericField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorIndexManager:
    """
    Manages Redis vector indexes using RediSearch
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        """
        Initialize Redis connection
        
        Args:
            redis_url: Redis connection URL
        """
        # Parse connection string
        try:
            self.redis_client = Redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"✓ Connected to Redis at {redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    def create_job_index(self, index_name: str = "job_embeddings",
                        embedding_dim: int = 384) -> bool:
        """
        Create vector index for job listings
        
        Args:
            index_name: Name of the index
            embedding_dim: Dimension of embeddings (384 for all-MiniLM-L6-v2)
            
        Returns:
            True if successful
        """
        logger.info(f"Creating job index: {index_name}")
        
        try:
            # Check if index exists
            existing_indexes = self.redis_client.execute_command("FT._LIST")
            if index_name in existing_indexes:
                logger.warning(f"Index {index_name} already exists. Dropping...")
                self.redis_client.execute_command(f"FT.DROP {index_name}")
            
            # Define schema
            schema = (
                TextField("job_id"),
                TextField("title", weight=2.0),
                TextField("description"),
                TextField("company"),
                TextField("location"),
                NumericField("salary_min"),
                NumericField("salary_max"),
                NumericField("posted_date"),
                TextField("skills"),
                NumericField("match_score"),
                VectorField(
                    "embedding",
                    algorithm="HNSW",
                    attributes={
                        "TYPE": "FLOAT32",
                        "DIM": embedding_dim,
                        "DISTANCE_METRIC": "COSINE"
                    }
                )
            )
            
            # Create index
            index_def = IndexDefinition(schema=schema, index_type=IndexType.HASH)
            self.redis_client.ft(index_name).create_index(schema, definition=index_def)
            
            logger.info(f"✓ Job index created: {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create job index: {e}")
            return False
    
    def create_resume_index(self, index_name: str = "resume_embeddings",
                           embedding_dim: int = 384) -> bool:
        """
        Create vector index for resumes
        
        Args:
            index_name: Name of the index
            embedding_dim: Dimension of embeddings
            
        Returns:
            True if successful
        """
        logger.info(f"Creating resume index: {index_name}")
        
        try:
            # Check if exists
            existing_indexes = self.redis_client.execute_command("FT._LIST")
            if index_name in existing_indexes:
                logger.warning(f"Index {index_name} already exists. Dropping...")
                self.redis_client.execute_command(f"FT.DROP {index_name}")
            
            # Define schema
            schema = (
                TextField("resume_id"),
                TextField("name", weight=2.0),
                TextField("email"),
                TextField("phone"),
                TextField("experience"),
                TextField("education"),
                TextField("skills", weight=2.0),
                NumericField("years_experience"),
                NumericField("updated_date"),
                VectorField(
                    "embedding",
                    algorithm="HNSW",
                    attributes={
                        "TYPE": "FLOAT32",
                        "DIM": embedding_dim,
                        "DISTANCE_METRIC": "COSINE"
                    }
                )
            )
            
            # Create index
            index_def = IndexDefinition(schema=schema, index_type=IndexType.HASH)
            self.redis_client.ft(index_name).create_index(schema, definition=index_def)
            
            logger.info(f"✓ Resume index created: {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create resume index: {e}")
            return False
    
    def create_skill_index(self, index_name: str = "skill_embeddings",
                          embedding_dim: int = 384) -> bool:
        """
        Create vector index for skills/ontology
        
        Args:
            index_name: Name of the index
            embedding_dim: Dimension of embeddings
            
        Returns:
            True if successful
        """
        logger.info(f"Creating skill index: {index_name}")
        
        try:
            # Check if exists
            existing_indexes = self.redis_client.execute_command("FT._LIST")
            if index_name in existing_indexes:
                logger.warning(f"Index {index_name} already exists. Dropping...")
                self.redis_client.execute_command(f"FT.DROP {index_name}")
            
            # Define schema
            schema = (
                TextField("skill_id"),
                TextField("name, weight=2.0),
                TextField("category"),
                TextField("description"),
                NumericField("demand_score"),
                NumericField("salary_premium"),
                VectorField(
                    "embedding",
                    algorithm="HNSW",
                    attributes={
                        "TYPE": "FLOAT32",
                        "DIM": embedding_dim,
                        "DISTANCE_METRIC": "COSINE"
                    }
                )
            )
            
            # Create index
            index_def = IndexDefinition(schema=schema, index_type=IndexType.HASH)
            self.redis_client.ft(index_name).create_index(schema, definition=index_def)
            
            logger.info(f"✓ Skill index created: {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create skill index: {e}")
            return False
    
    def list_indexes(self) -> list:
        """
        List all existing indexes
        
        Returns:
            List of index names
        """
        try:
            indexes = self.redis_client.execute_command("FT._LIST")
            logger.info(f"Existing indexes: {indexes}")
            return indexes
        except Exception as e:
            logger.error(f"Failed to list indexes: {e}")
            return []
    
    def search_vector(self, index_name: str, embedding: list[float],
                     top_k: int = 10, threshold: float = 0.5) -> list:
        """
        Search vector index
        
        Args:
            index_name: Index to search
            embedding: Query embedding vector
            top_k: Return top K results
            threshold: Minimum distance threshold
            
        Returns:
            List of matching documents
        """
        try:
            # Convert embedding to bytes
            embedding_bytes = b"".join([bytes(bytearray(memoryview(x))) for x in embedding])
            
            # Execute vector search
            results = self.redis_client.ft(index_name).search(
                f"@embedding:[VECTOR_RANGE {threshold} $vec]",
                {"vec": embedding_bytes},
                sort_by="score",
                limit=(0, top_k)
            )
            
            return results.docs
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    def delete_index(self, index_name: str) -> bool:
        """
        Delete an index
        
        Args:
            index_name: Name of index to delete
            
        Returns:
            True if successful
        """
        try:
            self.redis_client.execute_command(f"FT.DROP {index_name}")
            logger.info(f"✓ Deleted index: {index_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete index: {e}")
            return False


# Main initialization
async def initialize_all_indexes(redis_url: str = "redis://localhost:6379/0",
                                  embedding_dim: int = 384) -> bool:
    """
    Initialize all required vector indexes
    """
    logger.info("=" * 60)
    logger.info("INITIALIZING ARCHITECT-X VECTOR INDEXES")
    logger.info("=" * 60)
    
    manager = VectorIndexManager(redis_url)
    
    # Create all indexes
    success = all([
        manager.create_job_index(embedding_dim=embedding_dim),
        manager.create_resume_index(embedding_dim=embedding_dim),
        manager.create_skill_index(embedding_dim=embedding_dim),
    ])
    
    # List created indexes
    logger.info("\nCreated Indexes:")
    for idx in manager.list_indexes():
        logger.info(f"  ✓ {idx}")
    
    logger.info("=" * 60)
    logger.info("✓ VECTOR INDEXES INITIALIZED SUCCESSFULLY" if success else "✗ SOME INDEXES FAILED")
    logger.info("=" * 60)
    
    return success


if __name__ == "__main__":
    # Run initialization
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    embedding_dim = int(os.getenv("EMBEDDING_DIM", "384"))
    
    asyncio.run(initialize_all_indexes(redis_url, embedding_dim))
