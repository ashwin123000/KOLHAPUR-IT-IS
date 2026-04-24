"""
ARCHITECT-X KAGGLE DATASET DOWNLOADER
Downloads and organizes datasets from Kaggle
REQUIRES: kaggle.json API credentials in ~/.kaggle/
"""

import os
import json
import subprocess
import logging
from pathlib import Path
from typing import List, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class KaggleDatasetManager:
    """
    Manages Kaggle dataset downloads
    """
    
    def __init__(self, data_dir: str = "data"):
        """
        Initialize manager
        
        Args:
            data_dir: Base directory for downloaded data
        """
        self.data_dir = Path(data_dir)
        self.kaggle_config = Path.home() / ".kaggle" / "kaggle.json"
        
        # Verify kaggle.json exists
        if not self.kaggle_config.exists():
            logger.warning(f"Kaggle credentials not found at {self.kaggle_config}")
            logger.warning("Download from: https://www.kaggle.com/account/api")
            logger.warning("Place kaggle.json in ~/.kaggle/ directory")
        
        # Create data directories
        self._create_directories()
    
    def _create_directories(self):
        """Create data subdirectories"""
        dirs = [
            self.data_dir / "jobs",
            self.data_dir / "resumes",
            self.data_dir / "onet",
            self.data_dir / "raw",
            self.data_dir / "processed",
        ]
        
        for dir_path in dirs:
            dir_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"✓ Directory ready: {dir_path}")
    
    def download_dataset(self, dataset_id: str, output_dir: str = None) -> bool:
        """
        Download dataset from Kaggle
        
        Args:
            dataset_id: Kaggle dataset identifier (e.g., 'user/dataset-name')
            output_dir: Output directory (defaults to data/raw/)
            
        Returns:
            True if successful
        """
        if not self.kaggle_config.exists():
            logger.error("Kaggle credentials not configured")
            return False
        
        output_dir = output_dir or str(self.data_dir / "raw")
        
        logger.info(f"Downloading dataset: {dataset_id}")
        
        try:
            cmd = ["kaggle", "datasets", "download", "-d", dataset_id, "-p", output_dir]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info(f"✓ Downloaded: {dataset_id}")
                return True
            else:
                logger.error(f"Download failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error(f"Download timeout for {dataset_id}")
            return False
        except Exception as e:
            logger.error(f"Download error: {e}")
            return False
    
    def list_available_datasets(self) -> Dict[str, Dict]:
        """
        List recommended datasets for Architect-X
        
        Returns:
            Dictionary of available datasets
        """
        datasets = {
            "ai_jobs_2024": {
                "id": "lukebarousse/data-science-job-postings",
                "description": "Real DS/ML job postings",
                "extract_to": "jobs",
            },
            "job_skills": {
                "id": "promptcloud/jobs-on-indeed",
                "description": "Indeed job postings with skills",
                "extract_to": "jobs",
            },
            "resume_dataset": {
                "id": "joebeachcapital/resume-dataset",
                "description": "Resume dataset (1000+ resumes)",
                "extract_to": "resumes",
            },
            "onet_database": {
                "id": "nikolayf/onet",
                "description": "O*NET occupation database",
                "extract_to": "onet",
            },
            "linkedin_top_skills": {
                "id": "thoughtworks/linkedin-skills-data",
                "description": "LinkedIn top skills analysis",
                "extract_to": "jobs",
            },
        }
        
        return datasets
    
    def setup_kaggle_credentials(self, api_key: str, api_secret: str):
        """
        Setup Kaggle credentials programmatically
        
        Args:
            api_key: Kaggle username
            api_secret: Kaggle API key
        """
        credentials = {
            "username": api_key,
            "key": api_secret
        }
        
        try:
            self.kaggle_config.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.kaggle_config, 'w') as f:
                json.dump(credentials, f)
            
            # Set permissions (Unix-like)
            os.chmod(self.kaggle_config, 0o600)
            
            logger.info(f"✓ Kaggle credentials configured: {self.kaggle_config}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set credentials: {e}")
            return False


# Recommended datasets for Architect-X
RECOMMENDED_DATASETS = [
    ("lukebarousse/data-science-job-postings", "data/jobs"),
    ("joebeachcapital/resume-dataset", "data/resumes"),
    ("promptcloud/jobs-on-indeed", "data/jobs"),
]


def download_all_recommended_datasets(data_dir: str = "data"):
    """
    Download all recommended datasets
    
    Args:
        data_dir: Base data directory
    """
    logger.info("=" * 60)
    logger.info("DOWNLOADING RECOMMENDED DATASETS")
    logger.info("=" * 60)
    
    manager = KaggleDatasetManager(data_dir)
    
    # List available
    logger.info("\nAvailable Datasets:")
    datasets = manager.list_available_datasets()
    for name, info in datasets.items():
        logger.info(f"  - {name}: {info['description']}")
        logger.info(f"    ID: {info['id']}")
    
    # Download
    logger.info("\nStarting downloads...")
    successful = []
    failed = []
    
    for dataset_id, output_dir in RECOMMENDED_DATASETS:
        if manager.download_dataset(dataset_id, output_dir):
            successful.append(dataset_id)
        else:
            failed.append(dataset_id)
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("DOWNLOAD SUMMARY")
    logger.info("=" * 60)
    logger.info(f"✓ Successful: {len(successful)}")
    for ds in successful:
        logger.info(f"  ✓ {ds}")
    
    if failed:
        logger.info(f"\n✗ Failed: {len(failed)}")
        for ds in failed:
            logger.info(f"  ✗ {ds}")
    
    logger.info("\n📍 Data stored in: " + str(Path(data_dir).absolute()))
    logger.info("=" * 60)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--setup":
        # Setup credentials
        print("\n=== Kaggle Credentials Setup ===")
        username = input("Enter Kaggle username: ")
        api_key = input("Enter Kaggle API key: ")
        
        manager = KaggleDatasetManager()
        manager.setup_kaggle_credentials(username, api_key)
    else:
        # Download datasets
        download_all_recommended_datasets()
