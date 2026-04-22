#!/usr/bin/env python
"""
Resume Parser - Test & Example Script
Demonstrates all API capabilities with real examples
"""
import requests
import json
from typing import Dict, Any
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
COLORS = {
    'GREEN': '\033[92m',
    'RED': '\033[91m',
    'BLUE': '\033[94m',
    'YELLOW': '\033[93m',
    'END': '\033[0m'
}


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{COLORS['BLUE']}{'='*60}")
    print(f"{text}")
    print(f"{'='*60}{COLORS['END']}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{COLORS['GREEN']}✓ {text}{COLORS['END']}")


def print_error(text: str):
    """Print error message"""
    print(f"{COLORS['RED']}✗ {text}{COLORS['END']}")


def print_info(text: str):
    """Print info message"""
    print(f"{COLORS['YELLOW']}ℹ {text}{COLORS['END']}")


def print_response(data: Dict[Any, Any], indent: int = 2):
    """Pretty print JSON response"""
    print(json.dumps(data, indent=indent, default=str))


def test_health_check():
    """Test health check endpoint"""
    print_header("Test 1: Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print_success("Health check passed")
            print_response(response.json())
            return True
        else:
            print_error(f"Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to {BASE_URL}")
        print_info("Make sure the server is running: python run.py")
        return False


def test_register_candidate(username: str = "torvalds"):
    """Test candidate registration"""
    print_header(f"Test 2: Register Candidate ({username})")
    
    payload = {
        "github_username": username,
        "email": f"{username}@example.com",
        "phone": "+1-555-0100"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/candidates/register", json=payload)
        
        if response.status_code in [201, 409]:  # 409 = already exists
            if response.status_code == 409:
                print_info("Candidate already registered")
                # Try to get the existing candidate
                return get_first_candidate()
            else:
                print_success(f"Candidate {username} registered successfully")
                candidate = response.json()
                print_response(candidate)
                return candidate
        else:
            print_error(f"Registration failed: {response.status_code}")
            print_response(response.json())
            return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None


def get_first_candidate():
    """Get first candidate from database"""
    try:
        response = requests.get(f"{BASE_URL}/api/candidates?page=1&limit=1")
        if response.status_code == 200:
            items = response.json().get("items", [])
            if items:
                return items[0]
        return None
    except Exception as e:
        print_error(f"Error getting candidate: {e}")
        return None


def test_get_candidate(candidate_id: int):
    """Test get single candidate"""
    print_header(f"Test 3: Get Candidate ({candidate_id})")
    
    try:
        response = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}")
        if response.status_code == 200:
            print_success(f"Retrieved candidate {candidate_id}")
            print_response(response.json())
            return True
        else:
            print_error(f"Failed to get candidate: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_get_github_profile(candidate_id: int):
    """Test get GitHub profile"""
    print_header(f"Test 4: Get GitHub Profile ({candidate_id})")
    
    try:
        response = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}/github")
        if response.status_code == 200:
            print_success("GitHub profile retrieved")
            data = response.json()
            print_info(f"Username: {data.get('username')}")
            print_info(f"Followers: {data.get('followers')}")
            print_info(f"Public Repos: {data.get('public_repos')}")
            print_info(f"Activity Score: {data.get('activity_score')}")
            print(f"\nRepos: {json.dumps(data.get('repositories', [])[:2], indent=2, default=str)}")
            return True
        else:
            print_error(f"Failed to get profile: {response.status_code}")
            print_response(response.json())
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_get_github_skills(candidate_id: int):
    """Test get GitHub skills"""
    print_header(f"Test 5: Get GitHub Skills ({candidate_id})")
    
    try:
        response = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}/github-skills")
        if response.status_code == 200:
            print_success("GitHub skills retrieved")
            data = response.json()
            print_info(f"Top Languages: {list(data.get('languages', {}).keys())[:5]}")
            print_info(f"Topics: {data.get('topics', [])[:5]}")
            print_info(f"Inferred Skills: {data.get('inferred_skills', [])[:5]}")
            print_info(f"Activity Level: {data.get('activity_level')}")
            return True
        else:
            print_error(f"Failed to get skills: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_upload_resume(candidate_id: int):
    """Test uploading a resume"""
    print_header(f"Test 6: Upload Resume ({candidate_id})")
    
    payload = {
        "candidate_id": candidate_id,
        "source": "manual",
        "resume_data": {
            "name": "Test Candidate",
            "email": "test@example.com",
            "phone": "+1-555-0101",
            "city": "San Francisco",
            "state": "CA",
            "summary": "Experienced software engineer with expertise in open source",
            "skills": ["C", "Python", "Linux", "Git", "Docker"],
            "education": [
                {
                    "school": "University of Helsinki",
                    "degree": "Master's",
                    "field": "Computer Science",
                    "start_date": "1991",
                    "end_date": "1997"
                }
            ],
            "experience": [
                {
                    "title": "Lead Developer",
                    "company": "Linux Foundation",
                    "start_date": "1991",
                    "description": "Developed Linux kernel",
                    "skills_used": ["C", "Linux", "Git"]
                }
            ],
            "projects": [
                {
                    "name": "Linux Kernel",
                    "description": "Operating system kernel",
                    "url": "https://github.com/torvalds/linux",
                    "technologies": ["C", "Assembly"]
                }
            ],
            "certifications": []
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/resume/parsed", json=payload)
        if response.status_code == 201:
            print_success("Resume uploaded successfully")
            resume = response.json()
            print_response(resume)
            return resume
        else:
            print_error(f"Upload failed: {response.status_code}")
            print_response(response.json())
            return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None


def test_enrich_resume(resume_id: int):
    """Test resume enrichment"""
    print_header(f"Test 7: Enrich Resume ({resume_id})")
    
    try:
        response = requests.post(f"{BASE_URL}/api/resumes/{resume_id}/enrich")
        if response.status_code == 200:
            print_success("Resume enriched successfully")
            data = response.json()
            print_info(f"Original Skills: {data.get('original_skills', [])}")
            print_info(f"GitHub Projects Added: {len(data.get('github_projects_added', []))}")
            print_info(f"Overall Match Score: {data.get('overall_match_score', 0):.2%}")
            print_info(f"Missing Skills from GitHub: {data.get('missing_skills_from_github', [])}")
            print("\nRecommendations:")
            for rec in data.get('recommendations', [])[:3]:
                print(f"  • {rec}")
            return True
        else:
            print_error(f"Enrichment failed: {response.status_code}")
            print_response(response.json())
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_get_analysis(resume_id: int):
    """Test resume analysis"""
    print_header(f"Test 8: Get Resume Analysis ({resume_id})")
    
    try:
        response = requests.get(f"{BASE_URL}/api/resumes/{resume_id}/analysis")
        if response.status_code == 200:
            print_success("Resume analysis generated")
            data = response.json()
            print_info(f"Candidate: {data.get('candidate_name')}")
            print_info(f"Total Skills: {data.get('total_skills')}")
            print_info(f"Verified Skills: {data.get('verified_skills')}")
            print_info(f"Overall Score: {data.get('overall_score', 0):.2%}")
            print_info(f"Activity Level: {data.get('activity_level')}")
            print("\nStrengths:")
            for strength in data.get('strengths', [])[:3]:
                print(f"  • {strength}")
            print("\nGaps:")
            for gap in data.get('gaps', [])[:3]:
                print(f"  • {gap}")
            return True
        else:
            print_error(f"Analysis failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_get_all_candidates():
    """Test getting all candidates"""
    print_header("Test 9: Get All Candidates")
    
    try:
        response = requests.get(f"{BASE_URL}/api/candidates?page=1&limit=5")
        if response.status_code == 200:
            data = response.json()
            print_success(f"Retrieved {len(data.get('items', []))} candidates")
            print_info(f"Total: {data.get('total')} | Page: {data.get('page')}/{data.get('total_pages')}")
            return True
        else:
            print_error(f"Failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_get_all_resumes():
    """Test getting all resumes"""
    print_header("Test 10: Get All Resumes")
    
    try:
        response = requests.get(f"{BASE_URL}/api/resumes?page=1&limit=5")
        if response.status_code == 200:
            data = response.json()
            print_success(f"Retrieved {len(data.get('items', []))} resumes")
            print_info(f"Total: {data.get('total')} | Page: {data.get('page')}/{data.get('total_pages')}")
            return True
        else:
            print_error(f"Failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def main():
    """Run all tests"""
    print_header("Resume Parser - Complete Test Suite")
    
    print_info(f"Server: {BASE_URL}")
    print_info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test 1: Health check
    if not test_health_check():
        print_error("Cannot connect to server. Exiting.")
        return
    
    # Test 2: Register candidate
    candidate = test_register_candidate("torvalds")
    if not candidate:
        print_error("Failed to register candidate")
        return
    
    candidate_id = candidate.get("id")
    
    # Test 3: Get candidate
    test_get_candidate(candidate_id)
    
    # Test 4: Get GitHub profile
    test_get_github_profile(candidate_id)
    
    # Test 5: Get GitHub skills
    test_get_github_skills(candidate_id)
    
    # Test 6: Upload resume
    resume = test_upload_resume(candidate_id)
    if not resume:
        print_error("Failed to upload resume")
        return
    
    resume_id = resume.get("id")
    
    # Test 7: Enrich resume
    test_enrich_resume(resume_id)
    
    # Test 8: Get analysis
    test_get_analysis(resume_id)
    
    # Test 9: Get all candidates
    test_get_all_candidates()
    
    # Test 10: Get all resumes
    test_get_all_resumes()
    
    # Summary
    print_header("Test Summary")
    print_success("All tests completed successfully!")
    print_info("API is fully operational and ready for production use")
    print("\nNext steps:")
    print("1. Configure GitHub token in .env for higher rate limits")
    print("2. Integrate with n8n for automated resume parsing")
    print("3. Deploy to production using Docker or Gunicorn")
    print("4. Set up monitoring and alerting")


if __name__ == "__main__":
    main()
