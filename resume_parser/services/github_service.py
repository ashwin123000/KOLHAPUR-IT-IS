"""
GitHub integration service
Handles GitHub API calls with rate limiting, caching, and async support
"""
import os
import re
import asyncio
import time
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import aiohttp
from github import Github, GithubException, RateLimitExceededException
import json

logger = logging.getLogger(__name__)

# GitHub API Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", None)
GITHUB_API_BASE = "https://api.github.com"
GITHUB_RATE_LIMIT_REQUESTS = 60  # Unauthenticated
GITHUB_RATE_LIMIT_PERIOD = 3600  # 1 hour in seconds

# Cache configuration
CACHE_TTL = 3600  # 1 hour
_github_cache: Dict[str, Tuple[datetime, Dict]] = {}


class GitHubRateLimitError(Exception):
    """Raised when GitHub API rate limit is exceeded"""
    pass


class GitHubService:
    """Service for GitHub API interactions"""

    def __init__(self):
        """Initialize GitHub service"""
        self.client = Github(GITHUB_TOKEN) if GITHUB_TOKEN else Github()
        self.rate_limit_remaining = GITHUB_RATE_LIMIT_REQUESTS
        self.rate_limit_reset_time = None
        logger.info(f"GitHub service initialized (Token: {'Yes' if GITHUB_TOKEN else 'No'})")

    @staticmethod
    def _get_cache_key(key: str) -> str:
        """Generate cache key"""
        return f"github:{key}"

    @staticmethod
    def _is_cache_valid(cached_time: datetime) -> bool:
        """Check if cache is still valid"""
        return datetime.utcnow() - cached_time < timedelta(seconds=CACHE_TTL)

    @staticmethod
    def _cache_get(key: str) -> Optional[Dict]:
        """Get value from cache"""
        cache_key = GitHubService._get_cache_key(key)
        if cache_key in _github_cache:
            cached_time, cached_data = _github_cache[cache_key]
            if GitHubService._is_cache_valid(cached_time):
                logger.debug(f"Cache HIT for {key}")
                return cached_data
            else:
                del _github_cache[cache_key]
                logger.debug(f"Cache EXPIRED for {key}")
        return None

    @staticmethod
    def _cache_set(key: str, value: Dict) -> None:
        """Set value in cache"""
        cache_key = GitHubService._get_cache_key(key)
        _github_cache[cache_key] = (datetime.utcnow(), value)
        logger.debug(f"Cache SET for {key}")

    def _check_rate_limit(self) -> None:
        """Check and raise error if rate limit exceeded"""
        try:
            rate_limit = self.client.get_rate_limit()
            self.rate_limit_remaining = rate_limit.core.remaining
            self.rate_limit_reset_time = rate_limit.core.reset

            if self.rate_limit_remaining < 5:
                reset_time = datetime.fromtimestamp(self.rate_limit_reset_time)
                raise GitHubRateLimitError(
                    f"GitHub rate limit exceeded. Reset at {reset_time}"
                )
            logger.debug(f"Rate limit remaining: {self.rate_limit_remaining}")
        except RateLimitExceededException as e:
            logger.error(f"Rate limit exceeded: {e}")
            raise GitHubRateLimitError("GitHub API rate limit exceeded") from e

    def get_user_profile(self, username: str) -> Dict:
        """
        Fetch GitHub user profile
        Args:
            username: GitHub username
        Returns:
            Dictionary with user profile data
        """
        # Check cache first
        cached = self._cache_get(f"user:{username}")
        if cached:
            return cached

        try:
            self._check_rate_limit()
            user = self.client.get_user(username)

            profile_data = {
                "username": user.login,
                "name": user.name,
                "email": user.email,  # Often None if private
                "bio": user.bio,
                "location": user.location,
                "followers": user.followers,
                "following": user.following,
                "public_repos": user.public_repos,
                "profile_url": user.html_url,
                "company": user.company,
                "blog": user.blog,
                "twitter": user.twitter_login,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat(),
            }

            self._cache_set(f"user:{username}", profile_data)
            logger.info(f"Fetched profile for {username}")
            return profile_data

        except GithubException as e:
            logger.error(f"GitHub error for user {username}: {e}")
            raise ValueError(f"Invalid GitHub username: {username}") from e

    def get_user_repositories(self, username: str) -> List[Dict]:
        """
        Fetch all public repositories for a user
        Args:
            username: GitHub username
        Returns:
            List of repository data
        """
        # Check cache first
        cached = self._cache_get(f"repos:{username}")
        if cached:
            return cached

        try:
            self._check_rate_limit()
            user = self.client.get_user(username)
            repos = []

            for repo in user.get_repos(sort="updated", direction="desc"):
                # Extract languages
                languages = []
                if repo.language:
                    languages.append(repo.language)

                repo_data = {
                    "name": repo.name,
                    "url": repo.html_url,
                    "description": repo.description,
                    "primary_language": repo.language,
                    "languages": languages,
                    "topics": repo.topics if repo.topics else [],
                    "stars": repo.stargazers_count,
                    "forks": repo.forks_count,
                    "watchers": repo.watchers_count,
                    "open_issues": repo.open_issues_count,
                    "created_at": repo.created_at.isoformat(),
                    "updated_at": repo.updated_at.isoformat(),
                    "pushed_at": repo.pushed_at.isoformat() if repo.pushed_at else None,
                    "is_fork": repo.fork,
                    "size": repo.size,
                }
                repos.append(repo_data)

            self._cache_set(f"repos:{username}", repos)
            logger.info(f"Fetched {len(repos)} repositories for {username}")
            return repos

        except GithubException as e:
            logger.error(f"Error fetching repos for {username}: {e}")
            raise ValueError(f"Cannot fetch repositories for {username}") from e

    def extract_languages_from_repos(self, username: str) -> Dict[str, int]:
        """
        Extract programming languages from user's repositories
        Args:
            username: GitHub username
        Returns:
            Dictionary with language counts
        """
        repos = self.get_user_repositories(username)
        languages: Dict[str, int] = {}

        for repo in repos:
            if repo.get("primary_language"):
                lang = repo["primary_language"]
                languages[lang] = languages.get(lang, 0) + 1

            for lang in repo.get("languages", []):
                languages[lang] = languages.get(lang, 0) + 1

        # Sort by frequency
        return dict(sorted(languages.items(), key=lambda x: x[1], reverse=True))

    def extract_topics_from_repos(self, username: str) -> List[str]:
        """
        Extract topics from user's repositories
        Args:
            username: GitHub username
        Returns:
            List of unique topics
        """
        repos = self.get_user_repositories(username)
        topics = set()

        for repo in repos:
            topics.update(repo.get("topics", []))

        return sorted(list(topics))

    def calculate_quality_score(self, repo_data: Dict) -> float:
        """
        Calculate repository quality score
        Based on stars, forks, and activity
        Args:
            repo_data: Repository data
        Returns:
            Quality score 0.0-1.0
        """
        stars = min(repo_data.get("stars", 0) / 100, 1.0)  # Cap at 100 stars
        forks = min(repo_data.get("forks", 0) / 50, 1.0)  # Cap at 50 forks
        average = (stars + forks) / 2
        return min(average, 1.0)

    def calculate_activity_score(self, profile: Dict, repos: List[Dict]) -> float:
        """
        Calculate user activity score
        Based on followers, repos, and recent activity
        Args:
            profile: User profile data
            repos: User repositories data
        Returns:
            Activity score 0.0-1.0
        """
        followers_score = min(profile.get("followers", 0) / 100, 0.3)
        repos_score = min(profile.get("public_repos", 0) / 30, 0.3)

        # Recent activity (updated in last 3 months)
        recent_repos = 0
        cutoff_date = (datetime.utcnow() - timedelta(days=90)).isoformat()
        for repo in repos:
            if repo.get("updated_at", "") > cutoff_date:
                recent_repos += 1

        activity_score = min(recent_repos / 10, 0.4)

        total = followers_score + repos_score + activity_score
        return min(total, 1.0)

    async def get_readme_content(self, username: str, repo_name: str) -> Optional[str]:
        """
        Fetch README content from a repository
        Args:
            username: GitHub username
            repo_name: Repository name
        Returns:
            README content (first 1000 chars) or None
        """
        try:
            cache_key = f"readme:{username}/{repo_name}"
            cached = self._cache_get(cache_key)
            if cached:
                return cached.get("content")

            self._check_rate_limit()
            repo = self.client.get_user(username).get_repo(repo_name)
            readme = repo.get_readme()
            content = readme.decoded_content.decode("utf-8")[:1000]

            self._cache_set(cache_key, {"content": content})
            return content
        except Exception as e:
            logger.debug(f"Could not fetch README for {username}/{repo_name}: {e}")
            return None

    def infer_skills_from_repos(self, username: str) -> List[str]:
        """
        Infer skills from repository content and metadata
        Args:
            username: GitHub username
        Returns:
            List of inferred skills
        """
        repos = self.get_user_repositories(username)
        skills = set()

        # Extract from topics
        topics = self.extract_topics_from_repos(username)
        skills.update(topics)

        # Extract from descriptions
        for repo in repos:
            if repo.get("description"):
                # Look for common skill keywords
                desc = repo["description"].lower()
                keywords = [
                    "api", "rest", "graphql", "database", "mongodb", "postgresql",
                    "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd",
                    "machine learning", "ai", "deep learning", "nlp", "computer vision",
                    "web", "mobile", "frontend", "backend", "fullstack",
                    "testing", "devops", "blockchain", "cryptocurrency"
                ]
                for keyword in keywords:
                    if keyword in desc:
                        skills.add(keyword)

        return sorted(list(skills))

    def create_comprehensive_profile(self, username: str) -> Dict:
        """
        Create comprehensive GitHub profile combining all data
        Args:
            username: GitHub username
        Returns:
            Complete profile dictionary
        """
        try:
            profile = self.get_user_profile(username)
            repos = self.get_user_repositories(username)
            languages = self.extract_languages_from_repos(username)
            topics = self.extract_topics_from_repos(username)
            inferred_skills = self.infer_skills_from_repos(username)
            activity_score = self.calculate_activity_score(profile, repos)

            return {
                "profile": profile,
                "repositories": repos,
                "languages": languages,
                "topics": topics,
                "inferred_skills": inferred_skills,
                "activity_score": activity_score,
                "quality_scores": {
                    repo["name"]: self.calculate_quality_score(repo) for repo in repos
                },
                "fetched_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error creating comprehensive profile for {username}: {e}")
            raise

    def validate_username(self, username: str) -> bool:
        """
        Validate GitHub username format
        Args:
            username: GitHub username
        Returns:
            True if valid format
        """
        pattern = r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$"
        return bool(re.match(pattern, username)) and len(username) <= 39
