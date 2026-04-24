"""
VM Service — Master Prompt V2.0
Docker container lifecycle + anti-cheat tracking + code evaluation
"""

import logging
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import asyncio

import docker
from docker.errors import DockerException

logger = logging.getLogger(__name__)

# Docker client
try:
    docker_client = docker.from_env()
except DockerException:
    logger.warning("Docker not available - VM testing will be limited")
    docker_client = None


class VMContainerManager:
    """Manage Docker containers for coding tests."""
    
    IMAGE_NAME = "hiring-os-test-env:latest"
    CONTAINER_TIMEOUT = 1800  # 30 minutes
    RESOURCE_LIMITS = {
        "mem_limit": "512m",
        "cpus": 0.5,
        "network_disabled": False,
    }
    
    @staticmethod
    async def start_container(session_id: str) -> tuple[str, int]:
        """
        Start a new Docker container for a test session.
        
        Args:
            session_id: Unique session identifier
        
        Returns:
            (container_id, port)
        
        Raises:
            DockerException: If container creation fails
        """
        if not docker_client:
            raise RuntimeError("Docker is not available")
        
        try:
            # Generate unique port
            port = 8000 + hash(session_id) % 10000
            
            # Create container
            container = docker_client.containers.run(
                VMContainerManager.IMAGE_NAME,
                environment={
                    "SESSION_ID": session_id,
                    "PORT": str(port),
                },
                ports={"8000/tcp": port},
                detach=True,
                **VMContainerManager.RESOURCE_LIMITS,
            )
            
            logger.info(f"✅ Container started: {container.id[:12]} on port {port}")
            return container.id, port
            
        except DockerException as e:
            logger.error(f"Container startup failed: {e}")
            raise
    
    @staticmethod
    async def stop_container(container_id: str) -> bool:
        """
        Stop and remove a Docker container.
        
        Args:
            container_id: Container ID to stop
        
        Returns:
            Success status
        """
        if not docker_client:
            return False
        
        try:
            container = docker_client.containers.get(container_id)
            container.stop(timeout=10)
            container.remove()
            logger.info(f"Container stopped: {container_id[:12]}")
            return True
        except DockerException as e:
            logger.warning(f"Container stop error: {e}")
            return False
    
    @staticmethod
    async def execute_code(
        container_id: str,
        code: str,
        language: str = "python",
    ) -> Dict[str, Any]:
        """
        Execute code in container and return results.
        
        Args:
            container_id: Container ID
            code: Code to execute
            language: Programming language
        
        Returns:
            Execution result with output, error, time taken
        """
        if not docker_client:
            return {"error": "Docker not available"}
        
        try:
            container = docker_client.containers.get(container_id)
            
            # Write code to container
            exec_id = container.exec_run(
                f"{language} -c '{code}'",
                detach=True,
            )
            
            # Get output (with timeout)
            start_time = datetime.utcnow()
            output = ""
            error = ""
            
            try:
                # Note: In production, use proper exec streaming
                result = container.exec_run(
                    f"{language} -c '{code}'",
                    timeout=10,
                )
                output = result.output.decode()
                
            except asyncio.TimeoutError:
                error = "Code execution timeout (>10s)"
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "output": output,
                "error": error,
                "duration": duration,
                "status": "success" if not error else "timeout",
            }
            
        except DockerException as e:
            logger.error(f"Code execution error: {e}")
            return {"error": str(e), "status": "error"}


class AntiCheatDetector:
    """Detect and flag suspicious activities during coding tests."""
    
    EVENT_SEVERITY = {
        "tab_switch": "low",
        "copy_paste": "high",
        "esc_key": "low",
        "focus_lost": "medium",
        "code_submit": "none",
        "question_skip": "low",
        "page_blur": "medium",
        "devtools_open": "high",
    }
    
    FLAGGED_EVENTS = ["copy_paste", "devtools_open"]
    
    @staticmethod
    def process_event(event_type: str, metadata: Dict = None) -> Dict[str, Any]:
        """
        Process an anti-cheat event.
        
        Args:
            event_type: Type of event
            metadata: Additional metadata
        
        Returns:
            Processed event with severity and flagged status
        """
        severity = AntiCheatDetector.EVENT_SEVERITY.get(event_type, "medium")
        flagged = event_type in AntiCheatDetector.FLAGGED_EVENTS
        
        return {
            "event_type": event_type,
            "severity": severity,
            "flagged": flagged,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    @staticmethod
    def calculate_session_score(events: List[Dict]) -> Dict[str, Any]:
        """
        Calculate session integrity score based on events.
        
        Args:
            events: List of anti-cheat events
        
        Returns:
            Integrity score and analysis
        """
        if not events:
            return {
                "integrity_score": 100.0,
                "flagged_count": 0,
                "analysis": "No suspicious activity detected",
            }
        
        flagged = [e for e in events if e.get("flagged")]
        high_severity = [e for e in events if e.get("severity") == "high"]
        
        # Calculate score (0-100)
        penalty = (len(flagged) * 10) + (len(high_severity) * 5)
        score = max(0.0, 100.0 - penalty)
        
        analysis = []
        if len(flagged) > 0:
            analysis.append(f"⚠️ {len(flagged)} suspicious events detected (copy/paste, devtools, etc.)")
        if len(high_severity) > 0:
            analysis.append(f"🚨 {len(high_severity)} high-severity events")
        if score < 50:
            analysis.append("❌ Session may be flagged for manual review")
        
        return {
            "integrity_score": score,
            "flagged_count": len(flagged),
            "high_severity_count": len(high_severity),
            "analysis": " | ".join(analysis) if analysis else "Session appears legitimate",
        }


class CodeTester:
    """Run and grade coding test solutions."""
    
    @staticmethod
    async def run_test_case(
        code: str,
        test_case: Dict[str, Any],
        container_id: str,
    ) -> Dict[str, Any]:
        """
        Run a single test case against submitted code.
        
        Args:
            code: User's submitted code
            test_case: Test case with input and expected output
            container_id: Container ID for execution
        
        Returns:
            Test result with pass/fail and score
        """
        manager = VMContainerManager()
        
        # Execute code
        result = await manager.execute_code(container_id, code)
        
        if result.get("error"):
            return {
                "passed": False,
                "score": 0.0,
                "error": result.get("error"),
            }
        
        # Compare output
        expected = test_case.get("expected_output", "").strip()
        actual = result.get("output", "").strip()
        
        passed = expected == actual
        score = 100.0 if passed else 0.0
        
        return {
            "passed": passed,
            "score": score,
            "expected": expected,
            "actual": actual,
            "duration": result.get("duration", 0),
        }
    
    @staticmethod
    async def grade_solution(
        code: str,
        test_cases: List[Dict[str, Any]],
        container_id: str,
    ) -> Dict[str, Any]:
        """
        Grade a complete solution against all test cases.
        
        Args:
            code: User's submitted code
            test_cases: List of test cases
            container_id: Container ID
        
        Returns:
            Overall score and test results
        """
        if not test_cases:
            return {
                "score": 0.0,
                "passed_tests": 0,
                "total_tests": 0,
                "results": [],
            }
        
        results = []
        passed = 0
        
        for i, test_case in enumerate(test_cases):
            result = await CodeTester.run_test_case(code, test_case, container_id)
            results.append(result)
            if result.get("passed"):
                passed += 1
        
        score = (passed / len(test_cases)) * 100.0
        
        return {
            "score": score,
            "passed_tests": passed,
            "total_tests": len(test_cases),
            "results": results,
        }


class PerformanceScorer:
    """Calculate performance scores for solutions."""
    
    @staticmethod
    def calculate_score(
        test_score: float,
        integrity_score: float,
        time_taken: float,
        max_time: float = 3600,
    ) -> float:
        """
        Calculate overall performance score (0-100).
        
        Weights:
        - Test pass rate: 60%
        - Integrity: 30%
        - Speed: 10%
        """
        test_component = test_score * 0.60
        integrity_component = integrity_score * 0.30
        
        # Time component (faster is better, but not penalizing)
        time_component = min(10.0, (max_time - time_taken) / max_time * 10.0)
        
        overall = test_component + integrity_component + time_component
        return min(100.0, max(0.0, overall))
    
    @staticmethod
    async def generate_postmortem(
        score: float,
        test_results: Dict,
        integrity_score: float,
    ) -> Dict[str, Any]:
        """
        Generate AI-powered post-mortem analysis.
        
        Uses Claude to provide personalized feedback.
        """
        from anthropic import Anthropic
        
        client = Anthropic()
        
        prompt = f"""
Analyze this coding test result and provide personalized feedback:

Overall Score: {score:.1f}/100
Test Results: {test_results['passed_tests']}/{test_results['total_tests']} passed
Integrity Score: {integrity_score:.1f}/100

Provide:
1. What went well
2. Areas for improvement
3. Specific learning recommendations

Keep it concise and encouraging.
"""
        
        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )
            feedback = response.content[0].text
        except Exception as e:
            logger.warning(f"Postmortem generation failed: {e}")
            feedback = "Unable to generate personalized feedback at this time."
        
        return {
            "score": score,
            "feedback": feedback,
            "recommendations": [
                "Practice similar problems to build muscle memory",
                "Focus on test-driven development",
                "Review edge cases and error handling",
            ],
        }
