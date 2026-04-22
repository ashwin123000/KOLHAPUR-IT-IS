#!/usr/bin/env python
"""
Resume Parser - Startup Script
Initializes database and starts FastAPI server
"""
import os
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_requirements():
    """Check if all required packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
        'github',
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        logger.error(f"Missing required packages: {', '.join(missing)}")
        logger.info("Install with: pip install -r requirements.txt")
        return False
    
    return True


def main():
    """Main startup function"""
    logger.info("=" * 60)
    logger.info("Resume Parser - FastAPI Startup")
    logger.info("=" * 60)
    
    # Check requirements
    logger.info("Checking requirements...")
    if not check_requirements():
        sys.exit(1)
    
    logger.info("✓ All requirements satisfied")
    
    # Load environment
    logger.info("Loading environment configuration...")
    from dotenv import load_dotenv
    load_dotenv()
    
    # Initialize database
    logger.info("Initializing database...")
    from database import init_db
    try:
        init_db()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        sys.exit(1)
    
    # Start server
    logger.info("Starting FastAPI server...")
    logger.info("=" * 60)
    
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )


if __name__ == "__main__":
    main()
