#!/usr/bin/env python
"""
ARCHITECT-X: Complete Data & Dependencies Download Script
Downloads all required datasets, models, and dependencies for production deployment
"""

import os
import subprocess
import sys
from pathlib import Path
import json

# Color codes for terminal output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'

def log_step(message, status="INFO"):
    """Print formatted log message"""
    colors = {
        "INFO": BLUE,
        "SUCCESS": GREEN,
        "WARNING": YELLOW,
        "ERROR": RED
    }
    print(f"{colors.get(status, BLUE)}[{status}]{RESET} {message}")

def log_section(title):
    """Print section header"""
    print(f"\n{BLUE}{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}{RESET}\n")

def run_command(cmd, description):
    """Execute shell command and return success status"""
    try:
        log_step(f"Running: {description}", "INFO")
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        log_step(f"✓ {description}", "SUCCESS")
        return True
    except subprocess.CalledProcessError as e:
        log_step(f"✗ {description} FAILED", "ERROR")
        print(f"  Error: {e.stderr}")
        return False
    except Exception as e:
        log_step(f"✗ {description} ERROR: {e}", "ERROR")
        return False

def check_kaggle_configured():
    """Check if Kaggle CLI is configured"""
    kaggle_config = Path.home() / ".kaggle" / "kaggle.json"
    if kaggle_config.exists():
        log_step("✓ Kaggle API configured", "SUCCESS")
        return True
    else:
        log_step("⚠ Kaggle API not configured", "WARNING")
        print(f"""
  To configure Kaggle:
  1. Visit: https://www.kaggle.com/settings/account
  2. Click "Create New Token" (downloads kaggle.json)
  3. Place at: {kaggle_config}
  4. Run: chmod 600 {kaggle_config}
        """)
        return False

def download_kaggle_dataset(dataset_id, output_dir, description):
    """Download dataset from Kaggle"""
    log_step(f"Downloading: {description}", "INFO")
    cmd = f"kaggle datasets download -d {dataset_id} -p {output_dir} --unzip"
    return run_command(cmd, f"Download {description}")

def setup_python_environment():
    """Install all Python dependencies"""
    log_section("PYTHON DEPENDENCIES")
    
    # Core dependencies
    core_packages = [
        "fastapi==0.135.2",
        "uvicorn==0.42.0",
        "aiosqlite==3.1.1",
        "sqlalchemy==2.0.30",
        "pydantic==2.12.5",
        "pydantic-settings==2.6.1",
        "python-dotenv==1.0.0",
        "requests==2.32.0",
        "httpx==0.27.0",
    ]
    
    # AI/ML dependencies
    ai_packages = [
        "openai==1.45.0",
        "langchain==0.1.20",
        "langgraph==0.0.69",
        "transformers==4.40.0",
        "torch==2.3.0",
        "sentence-transformers==3.0.1",
        "PyGithub==2.6.0",
    ]
    
    # Data dependencies
    data_packages = [
        "pandas==2.2.0",
        "numpy==1.26.4",
    ]
    
    # Async/Task Queue
    async_packages = [
        "celery==5.3.6",
        "redis==5.0.0",
        "aioredis==2.0.1",
    ]
    
    # Database
    db_packages = [
        "alembic==1.13.1",
    ]
    
    all_packages = core_packages + ai_packages + data_packages + async_packages + db_packages
    
    log_step(f"Installing {len(all_packages)} Python packages...", "INFO")
    
    # Install in batches for better error reporting
    for i, pkg in enumerate(all_packages, 1):
        status = "✓" if run_command(f"pip install {pkg}", f"[{i}/{len(all_packages)}] {pkg}") else "✗"
        print(f"  {status}")

def download_huggingface_models():
    """Pre-download HuggingFace models for offline use"""
    log_section("HUGGINGFACE MODELS")
    
    models = {
        "sentence-transformers/all-MiniLM-L6-v2": "Semantic similarity model",
        "cross-encoder/ms-marco-MiniLM-L-6-v2": "Cross-encoder ranking model",
        "microsoft/layoutlm-base-uncased": "Resume NER model",
    }
    
    # Create models directory
    models_dir = Path("./models/huggingface")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    for model_id, description in models.items():
        log_step(f"Downloading: {description} ({model_id})", "INFO")
        python_code = f"""
from transformers import AutoTokenizer, AutoModel
tokenizer = AutoTokenizer.from_pretrained("{model_id}")
model = AutoModel.from_pretrained("{model_id}")
print("✓ Downloaded: {model_id}")
        """
        run_command(f'python -c "{python_code}"', f"Download {model_id}")

def download_kaggle_datasets():
    """Download all required Kaggle datasets"""
    log_section("KAGGLE DATASETS")
    
    if not check_kaggle_configured():
        log_step("Skipping Kaggle downloads - not configured", "WARNING")
        return False
    
    datasets = [
        {
            "id": "waddahali/global-ai-job-market-and-agentic-surge-2025-2026",
            "dir": "./data/kaggle_jobs",
            "description": "AI Job Market 2025-2026 (50k jobs)"
        },
        {
            "id": "saugataroyarghya/resume-dataset",
            "dir": "./data/resume_dataset",
            "description": "Resume Dataset (9k+ resumes)"
        },
        {
            "id": "sujan2002/machine-learning-100-datasets",
            "dir": "./data/ml_datasets",
            "description": "Machine Learning Datasets"
        }
    ]
    
    os.makedirs("./data", exist_ok=True)
    
    success_count = 0
    for dataset in datasets:
        if download_kaggle_dataset(dataset["id"], dataset["dir"], dataset["description"]):
            success_count += 1
    
    log_step(f"Downloaded {success_count}/{len(datasets)} datasets", "SUCCESS" if success_count == len(datasets) else "WARNING")
    return success_count > 0

def download_onet_database():
    """Download O*NET database for skill taxonomy"""
    log_section("O*NET DATABASE")
    
    log_step("O*NET Database Instructions", "INFO")
    print("""
  Manual Download Required:
  1. Visit: https://www.onetcenter.org/database.html
  2. Download: O*NET-SOC 2010 Database files
  3. Extract to: ./data/onet_database/
  
  Files needed:
  - Occupation Data
  - Skills
  - Job Zones
  - Knowledge
    """)

def setup_redis_stack():
    """Instructions for setting up Redis Stack"""
    log_section("REDIS STACK SETUP")
    
    print(f"""
  {YELLOW}Redis Stack (Vector DB + Cache){RESET}
  
  Option 1: Docker (Recommended)
  {GREEN}docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest{RESET}
  
  Option 2: MacOS (Homebrew)
  {GREEN}brew install redis-stack{RESET}
  
  Option 3: Linux (Ubuntu/Debian)
  {GREEN}sudo apt-get install redis-stack-server{RESET}
  
  After installation, test:
  {GREEN}redis-cli ping{RESET}
  Expected output: PONG
    """)

def setup_postgresql():
    """Instructions for setting up PostgreSQL"""
    log_section("POSTGRESQL SETUP (Optional)")
    
    print(f"""
  {YELLOW}PostgreSQL (For Production){RESET}
  
  Option 1: Docker
  {GREEN}docker run -d --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:16{RESET}
  
  Option 2: MacOS
  {GREEN}brew install postgresql{RESET}
  
  Option 3: Linux
  {GREEN}sudo apt-get install postgresql{RESET}
  
  Create database:
  {GREEN}createdb architect_x{RESET}
    """)

def create_env_file():
    """Create .env template file"""
    log_section("ENVIRONMENT CONFIGURATION")
    
    env_template = """
# ARCHITECT-X Configuration

# API Server
HOST=0.0.0.0
PORT=8000
DEBUG=False
LOG_LEVEL=INFO

# Database
DATABASE_URL=sqlite:///./architect_x.db
# For PostgreSQL: postgresql://user:password@localhost:5432/architect_x

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI
OPENAI_API_KEY=sk-...  # Get from https://platform.openai.com/api-keys

# GitHub
GITHUB_TOKEN=ghp_...  # Optional: Get from https://github.com/settings/tokens
GITHUB_API_RATE_LIMIT=60  # 60 without token, 5000 with token

# JWT
JWT_SECRET_KEY=your-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Kaggle (for dataset downloads)
KAGGLE_USERNAME=your-username
KAGGLE_KEY=your-api-key

# n8n Webhook
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# DPDP Compliance
DATA_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=730

# Email (for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Feature Flags
ENABLE_MOCK_INTERVIEWS=True
ENABLE_LOOKALIKE_SEARCH=True
ENABLE_BLIND_RANKING=True
"""
    
    env_file = Path(".env")
    if not env_file.exists():
        with open(env_file, "w") as f:
            f.write(env_template)
        log_step("✓ Created .env file (EDIT THIS WITH YOUR CREDENTIALS)", "SUCCESS")
    else:
        log_step(".env already exists", "WARNING")

def create_directory_structure():
    """Create all necessary directories"""
    log_section("DIRECTORY STRUCTURE")
    
    directories = [
        "data/kaggle_jobs",
        "data/resume_dataset",
        "data/ml_datasets",
        "data/onet_database",
        "models/huggingface",
        "models/ner_resume",
        "logs",
        "uploads/resumes",
        "uploads/avatars",
        "backups/database",
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        log_step(f"✓ Created: {directory}", "SUCCESS")

def verify_installations():
    """Verify all required packages are installed"""
    log_section("VERIFICATION")
    
    packages_to_check = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("aiosqlite", "aiosqlite"),
        ("sqlalchemy", "SQLAlchemy"),
        ("pydantic", "Pydantic"),
        ("redis", "Redis"),
        ("openai", "OpenAI"),
        ("langchain", "LangChain"),
        ("langgraph", "LangGraph"),
        ("transformers", "Transformers"),
        ("torch", "PyTorch"),
        ("sentence_transformers", "Sentence-BERT"),
        ("pandas", "Pandas"),
    ]
    
    all_ok = True
    for import_name, display_name in packages_to_check:
        try:
            __import__(import_name)
            log_step(f"✓ {display_name}", "SUCCESS")
        except ImportError:
            log_step(f"✗ {display_name} NOT INSTALLED", "ERROR")
            all_ok = False
    
    return all_ok

def verify_external_services():
    """Check if external services are running"""
    log_section("EXTERNAL SERVICES")
    
    services = [
        {"name": "Redis", "cmd": "redis-cli ping", "expected": "PONG"},
        {"name": "PostgreSQL", "cmd": "pg_isready", "expected": "accepting"},
    ]
    
    for service in services:
        try:
            result = subprocess.run(service["cmd"], shell=True, capture_output=True, text=True, timeout=2)
            if service["expected"] in result.stdout or service["expected"] in result.stderr:
                log_step(f"✓ {service['name']} running", "SUCCESS")
            else:
                log_step(f"⚠ {service['name']} - Check status manually", "WARNING")
        except:
            log_step(f"⚠ {service['name']} - Not detected (may be OK)", "WARNING")

def generate_startup_commands():
    """Generate startup commands for easy reference"""
    log_section("STARTUP COMMANDS")
    
    startup_guide = """
QUICK START COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. START REDIS (if not running)
   docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

2. ACTIVATE PYTHON ENVIRONMENT
   Windows: .venv\\Scripts\\activate
   Mac/Linux: source .venv/bin/activate

3. START BACKEND
   python -m uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000

4. START CELERY WORKER (in another terminal)
   celery -A fastapi_backend.celery_config worker -l info

5. ACCESS APIs
   FastAPI Docs: http://localhost:8000/docs
   ReDoc: http://localhost:8000/redoc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issue: "aiosqlite not found"
  → pip install aiosqlite

Issue: "Redis connection refused"
  → Make sure Redis is running: redis-cli ping

Issue: "OPENAI_API_KEY not set"
  → Edit .env file and add your OpenAI API key

Issue: "Kaggle API not configured"
  → Run: pip install kaggle
  → Create token at: https://www.kaggle.com/settings/account
  → Place kaggle.json at: ~/.kaggle/kaggle.json

Issue: "Port 8000 already in use"
  → Use different port: uvicorn fastapi_backend.main:app --port 8001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """
    
    print(startup_guide)
    
    # Save to file
    with open("STARTUP_GUIDE.txt", "w") as f:
        f.write(startup_guide)
    log_step("✓ Saved to STARTUP_GUIDE.txt", "SUCCESS")

def main():
    """Main execution flow"""
    
    print(f"""
{BLUE}
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║          ARCHITECT-X: COMPLETE DOWNLOAD & SETUP SCRIPT          ║
║                                                                  ║
║                  Production-Grade Setup v2.0                     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
{RESET}
    """)
    
    steps = [
        ("Create Directory Structure", create_directory_structure),
        ("Setup Python Environment", setup_python_environment),
        ("Verify Python Installations", verify_installations),
        ("Download HuggingFace Models", download_huggingface_models),
        ("Download Kaggle Datasets", download_kaggle_datasets),
        ("Download O*NET Database", download_onet_database),
        ("Setup Redis Stack", setup_redis_stack),
        ("Setup PostgreSQL", setup_postgresql),
        ("Create Environment File", create_env_file),
        ("Verify External Services", verify_external_services),
        ("Generate Startup Commands", generate_startup_commands),
    ]
    
    completed = 0
    for step_name, step_func in steps:
        try:
            step_func()
            completed += 1
        except Exception as e:
            log_step(f"Error in {step_name}: {e}", "ERROR")
    
    # Final summary
    log_section("SETUP COMPLETE")
    
    print(f"""
{GREEN}✓ Setup Progress: {completed}/{len(steps)} steps completed{RESET}

{YELLOW}NEXT STEPS:{RESET}

1. Edit .env file with your credentials:
   - OPENAI_API_KEY
   - GITHUB_TOKEN (optional)
   - Database URL (if using PostgreSQL)

2. Start Redis:
   docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

3. Start Backend:
   python -m uvicorn fastapi_backend.main:app --reload

4. For Kaggle datasets:
   - Configure Kaggle: https://www.kaggle.com/settings/account
   - Place kaggle.json at ~/.kaggle/kaggle.json
   - Run: python download_everything.py (again)

{BLUE}For detailed information, see: STARTUP_GUIDE.txt{RESET}

    """)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Setup interrupted by user{RESET}")
        sys.exit(0)
    except Exception as e:
        print(f"\n{RED}Setup failed: {e}{RESET}")
        sys.exit(1)
