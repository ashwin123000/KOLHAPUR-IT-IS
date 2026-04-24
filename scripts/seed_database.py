"""
ARCHITECT-X DATABASE SEEDING SCRIPT
Populates MongoDB and Redis with initial data
MUST RUN AFTER: init_vector_index.py
"""

import os
import asyncio
import logging
import json
from datetime import datetime
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncClient
from pymongo import ASCENDING, DESCENDING
from scripts.embedding_pipeline import EmbeddingPipeline
from redis import Redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseSeeder:
    """
    Seeds MongoDB with initial job and resume data
    """
    
    def __init__(self, mongo_url: str, redis_url: str):
        """
        Initialize connections
        """
        self.mongo_url = mongo_url
        self.redis_url = redis_url
        self.mongo_client = None
        self.db = None
        self.redis = Redis.from_url(redis_url, decode_responses=True)
        self.embedding_pipeline = EmbeddingPipeline()
        logger.info("✓ DatabaseSeeder initialized")
    
    async def connect_mongo(self):
        """Connect to MongoDB"""
        try:
            self.mongo_client = AsyncClient(self.mongo_url)
            # Test connection
            await self.mongo_client.admin.command('ping')
            self.db = self.mongo_client['architect-x']
            logger.info("✓ Connected to MongoDB")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def disconnect_mongo(self):
        """Disconnect from MongoDB"""
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("✓ Disconnected from MongoDB")
    
    async def create_indexes(self):
        """Create MongoDB indexes for performance"""
        logger.info("Creating MongoDB indexes...")
        
        try:
            # Job collection indexes
            jobs_col = self.db['jobs']
            await jobs_col.create_index([("job_id", ASCENDING)], unique=True)
            await jobs_col.create_index([("title", ASCENDING)])
            await jobs_col.create_index([("company", ASCENDING)])
            await jobs_col.create_index([("posted_date", DESCENDING)])
            await jobs_col.create_index([("skills", ASCENDING)])
            logger.info("  ✓ Job indexes created")
            
            # Resume collection indexes
            resumes_col = self.db['resumes']
            await resumes_col.create_index([("resume_id", ASCENDING)], unique=True)
            await resumes_col.create_index([("email", ASCENDING)])
            await resumes_col.create_index([("name", ASCENDING)])
            logger.info("  ✓ Resume indexes created")
            
            # Skills collection indexes
            skills_col = self.db['skills']
            await skills_col.create_index([("skill_id", ASCENDING)], unique=True)
            await skills_col.create_index([("name", ASCENDING)])
            await skills_col.create_index([("category", ASCENDING)])
            logger.info("  ✓ Skill indexes created")
            
            # Matches collection indexes
            matches_col = self.db['matches']
            await matches_col.create_index([("job_id", ASCENDING)])
            await matches_col.create_index([("candidate_id", ASCENDING)])
            await matches_col.create_index([("score", DESCENDING)])
            logger.info("  ✓ Match indexes created")
            
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
    
    async def seed_sample_jobs(self):
        """Seed sample job data"""
        logger.info("Seeding sample jobs...")
        
        jobs_col = self.db['jobs']
        
        sample_jobs = [
            {
                "job_id": "job_001",
                "title": "Senior Python/FastAPI Developer",
                "company": "TechCorp AI",
                "location": "San Francisco, CA",
                "description": "Looking for experienced Python developer with FastAPI expertise. Must have 5+ years experience in backend development, knowledge of async programming, and MongoDB integration.",
                "skills": ["Python", "FastAPI", "MongoDB", "Redis", "Docker", "AWS"],
                "salary_min": 150000,
                "salary_max": 200000,
                "experience_required": 5,
                "employment_type": "Full-time",
                "posted_date": datetime.utcnow(),
                "updated_date": datetime.utcnow(),
            },
            {
                "job_id": "job_002",
                "title": "ML Engineer - NLP Focus",
                "company": "DataFlow Systems",
                "location": "New York, NY",
                "description": "Seeking ML engineer specializing in NLP. Experience with transformers, BERT, PyTorch, and production model deployment required. Work on resume parsing and job matching systems.",
                "skills": ["Python", "PyTorch", "Transformers", "NLP", "TensorFlow", "scikit-learn"],
                "salary_min": 140000,
                "salary_max": 180000,
                "experience_required": 3,
                "employment_type": "Full-time",
                "posted_date": datetime.utcnow(),
                "updated_date": datetime.utcnow(),
            },
            {
                "job_id": "job_003",
                "title": "Frontend Engineer - React",
                "company": "UI Studios",
                "location": "Remote",
                "description": "React developer needed for modern SPA development. Experience with TypeScript, Vite, component libraries, and state management. Collaborate with backend teams using REST APIs.",
                "skills": ["React", "TypeScript", "JavaScript", "Vite", "CSS", "REST API"],
                "salary_min": 120000,
                "salary_max": 160000,
                "experience_required": 2,
                "employment_type": "Full-time",
                "posted_date": datetime.utcnow(),
                "updated_date": datetime.utcnow(),
            },
            {
                "job_id": "job_004",
                "title": "DevOps Engineer - Kubernetes",
                "company": "CloudScale Inc",
                "location": "Austin, TX",
                "description": "DevOps engineer for containerized infrastructure. Docker, Kubernetes, CI/CD pipelines, and infrastructure-as-code expertise essential. AWS or GCP experience preferred.",
                "skills": ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD", "Linux"],
                "salary_min": 135000,
                "salary_max": 175000,
                "experience_required": 4,
                "employment_type": "Full-time",
                "posted_date": datetime.utcnow(),
                "updated_date": datetime.utcnow(),
            },
        ]
        
        # Embed descriptions and insert
        for job in sample_jobs:
            job["embedding"] = self.embedding_pipeline.embed(job["description"])
            job["embedding_model"] = "all-MiniLM-L6-v2"
            
            await jobs_col.update_one(
                {"job_id": job["job_id"]},
                {"$set": job},
                upsert=True
            )
            logger.info(f"  ✓ Inserted: {job['title']}")
        
        count = await jobs_col.count_documents({})
        logger.info(f"✓ Total jobs in database: {count}")
    
    async def seed_sample_resumes(self):
        """Seed sample resume data"""
        logger.info("Seeding sample resumes...")
        
        resumes_col = self.db['resumes']
        
        sample_resumes = [
            {
                "resume_id": "resume_001",
                "name": "Alice Johnson",
                "email": "alice@example.com",
                "phone": "+1-555-0001",
                "experience": "Senior Python Developer at TechStartup (2020-2024). Built microservices with FastAPI and MongoDB.",
                "education": "BS Computer Science, Stanford University",
                "skills": ["Python", "FastAPI", "MongoDB", "Docker", "AWS", "Redis"],
                "years_experience": 7,
                "summary": "Experienced backend developer with expertise in Python, async programming, and distributed systems.",
            },
            {
                "resume_id": "resume_002",
                "name": "Bob Chen",
                "email": "bob@example.com",
                "phone": "+1-555-0002",
                "experience": "ML Engineer at DataFlow (2021-2024). Implemented NLP models for text classification.",
                "education": "MS Machine Learning, CMU",
                "skills": ["Python", "PyTorch", "Transformers", "NLP", "scikit-learn", "TensorFlow"],
                "years_experience": 5,
                "summary": "Machine learning engineer focused on NLP and model deployment.",
            },
            {
                "resume_id": "resume_003",
                "name": "Carol Smith",
                "email": "carol@example.com",
                "phone": "+1-555-0003",
                "experience": "Frontend Developer at UI Company (2022-2024). Developed React applications with TypeScript.",
                "education": "BS Computer Science, UC Berkeley",
                "skills": ["React", "TypeScript", "JavaScript", "CSS", "Vite", "REST API"],
                "years_experience": 4,
                "summary": "Full-stack JavaScript developer specializing in React and modern web development.",
            },
        ]
        
        # Embed experience/skills and insert
        for resume in sample_resumes:
            combined_text = f"{resume['experience']} {resume['skills']}"
            resume["embedding"] = self.embedding_pipeline.embed(combined_text)
            resume["embedding_model"] = "all-MiniLM-L6-v2"
            resume["updated_date"] = datetime.utcnow()
            
            await resumes_col.update_one(
                {"resume_id": resume["resume_id"]},
                {"$set": resume},
                upsert=True
            )
            logger.info(f"  ✓ Inserted: {resume['name']}")
        
        count = await resumes_col.count_documents({})
        logger.info(f"✓ Total resumes in database: {count}")
    
    async def seed_skills_ontology(self):
        """Seed skills taxonomy"""
        logger.info("Seeding skills ontology...")
        
        skills_col = self.db['skills']
        
        sample_skills = [
            {
                "skill_id": "skill_python",
                "name": "Python",
                "category": "Programming Language",
                "description": "General-purpose programming language widely used in data science, web development, and automation.",
                "demand_score": 95,
                "salary_premium": 1.15,
            },
            {
                "skill_id": "skill_fastapi",
                "name": "FastAPI",
                "category": "Web Framework",
                "description": "Modern Python web framework for building fast and scalable APIs.",
                "demand_score": 85,
                "salary_premium": 1.12,
            },
            {
                "skill_id": "skill_react",
                "name": "React",
                "category": "Frontend Framework",
                "description": "JavaScript library for building user interfaces with reusable components.",
                "demand_score": 90,
                "salary_premium": 1.10,
            },
            {
                "skill_id": "skill_kubernetes",
                "name": "Kubernetes",
                "category": "DevOps Tool",
                "description": "Container orchestration platform for managing containerized applications.",
                "demand_score": 88,
                "salary_premium": 1.18,
            },
            {
                "skill_id": "skill_pytorch",
                "name": "PyTorch",
                "category": "ML Framework",
                "description": "Deep learning framework for building and training neural networks.",
                "demand_score": 82,
                "salary_premium": 1.20,
            },
        ]
        
        for skill in sample_skills:
            skill["embedding"] = self.embedding_pipeline.embed(skill["description"])
            skill["embedding_model"] = "all-MiniLM-L6-v2"
            
            await skills_col.update_one(
                {"skill_id": skill["skill_id"]},
                {"$set": skill},
                upsert=True
            )
            logger.info(f"  ✓ Inserted: {skill['name']}")
        
        count = await skills_col.count_documents({})
        logger.info(f"✓ Total skills in database: {count}")
    
    async def run(self):
        """Execute complete seeding"""
        try:
            await self.connect_mongo()
            await self.create_indexes()
            await self.seed_sample_jobs()
            await self.seed_sample_resumes()
            await self.seed_skills_ontology()
            logger.info("\n✓ DATABASE SEEDING COMPLETE")
        finally:
            await self.disconnect_mongo()


async def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("ARCHITECT-X DATABASE SEEDING")
    logger.info("=" * 60)
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://admin:password@localhost:27017/architect-x?authSource=admin")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    seeder = DatabaseSeeder(mongo_url, redis_url)
    await seeder.run()


if __name__ == "__main__":
    asyncio.run(main())
