"""
Chatbot Datasets
Comprehensive skill resources, role roadmaps, and interview questions
All data is hardcoded and loaded at startup
"""

# ============================================================================
# DATASET 1: SKILL-TO-LEARNING-RESOURCE MAPPING
# ============================================================================

SKILL_RESOURCES = {
    "python": {
        "what_it_is": "High-level programming language used for ML, data science, and backend development",
        "why_it_matters": "Core requirement for ML engineering, data science, and AI roles",
        "learn_in": "3 weeks",
        "project_idea": "Build a data processing pipeline that reads CSV, cleans data, and exports results",
        "difficulty": "Beginner"
    },
    "machine learning": {
        "what_it_is": "Building systems that learn from data without being explicitly programmed",
        "why_it_matters": "Core requirement for any ML/AI role — foundation for all advanced roles",
        "learn_in": "8 weeks",
        "project_idea": "Build a classification model on a Kaggle dataset, train it, and expose via REST API",
        "difficulty": "Intermediate"
    },
    "deep learning": {
        "what_it_is": "Neural networks with multiple layers for learning complex patterns",
        "why_it_matters": "Required for computer vision and NLP roles, differentiator in ML market",
        "learn_in": "6 weeks",
        "project_idea": "Train a CNN on image dataset or LSTM on sequence data, then containerize it",
        "difficulty": "Advanced"
    },
    "docker": {
        "what_it_is": "Container platform for packaging applications and dependencies",
        "why_it_matters": "Required for deploying ML models and APIs in production environments",
        "learn_in": "2 weeks",
        "project_idea": "Containerize a FastAPI ML model and run it locally with docker-compose",
        "difficulty": "Beginner"
    },
    "kubernetes": {
        "what_it_is": "Orchestration platform for managing containerized applications at scale",
        "why_it_matters": "Essential for DevOps and production ML deployment roles",
        "learn_in": "4 weeks",
        "project_idea": "Deploy a containerized FastAPI service to minikube cluster",
        "difficulty": "Advanced"
    },
    "tensorflow": {
        "what_it_is": "Open-source machine learning framework by Google for building neural networks",
        "why_it_matters": "Industry standard for production ML — used in 70% of ML roles",
        "learn_in": "5 weeks",
        "project_idea": "Build and train a CNN using TensorFlow on image classification task",
        "difficulty": "Intermediate"
    },
    "pytorch": {
        "what_it_is": "Deep learning framework known for flexibility and research applications",
        "why_it_matters": "Preferred for research roles and emerging ML architectures",
        "learn_in": "5 weeks",
        "project_idea": "Build a custom neural network architecture using PyTorch and train on MNIST",
        "difficulty": "Intermediate"
    },
    "react": {
        "what_it_is": "JavaScript library for building interactive user interfaces",
        "why_it_matters": "Standard frontend framework for full-stack and frontend roles",
        "learn_in": "4 weeks",
        "project_idea": "Build a job board dashboard with React that fetches from a mock API",
        "difficulty": "Beginner"
    },
    "node.js": {
        "what_it_is": "JavaScript runtime for building server-side applications",
        "why_it_matters": "Required for full-stack and backend JavaScript roles",
        "learn_in": "3 weeks",
        "project_idea": "Build an Express API with endpoints for job filtering and search",
        "difficulty": "Beginner"
    },
    "fastapi": {
        "what_it_is": "Modern Python web framework for building REST APIs with high performance",
        "why_it_matters": "Industry standard for ML API development — faster than Flask",
        "learn_in": "2 weeks",
        "project_idea": "Build a REST API that exposes a trained ML model with Swagger docs",
        "difficulty": "Beginner"
    },
    "aws": {
        "what_it_is": "Amazon Web Services cloud platform with 200+ services",
        "why_it_matters": "Cloud infrastructure requirement for scalable deployments",
        "learn_in": "6 weeks",
        "project_idea": "Deploy FastAPI model to AWS Lambda or EC2, use S3 for model storage",
        "difficulty": "Intermediate"
    },
    "gcp": {
        "what_it_is": "Google Cloud Platform — cloud services with strong AI/ML integrations",
        "why_it_matters": "Strong choice for enterprises using BigQuery and ML infrastructure",
        "learn_in": "6 weeks",
        "project_idea": "Deploy model to Google Cloud AI Platform or BigQuery ML",
        "difficulty": "Intermediate"
    },
    "postgresql": {
        "what_it_is": "Advanced open-source relational database",
        "why_it_matters": "Standard for data persistence in backend and ML applications",
        "learn_in": "2 weeks",
        "project_idea": "Design schema for job marketplace, write queries, add indexes",
        "difficulty": "Beginner"
    },
    "redis": {
        "what_it_is": "In-memory data store for caching and real-time operations",
        "why_it_matters": "Required for high-performance backends and real-time features",
        "learn_in": "1 week",
        "project_idea": "Cache API responses using Redis, implement session management",
        "difficulty": "Beginner"
    },
    "sql": {
        "what_it_is": "Language for querying and managing relational databases",
        "why_it_matters": "Essential skill for data roles, backend development, and analytics",
        "learn_in": "2 weeks",
        "project_idea": "Write complex queries with joins, aggregations, and window functions",
        "difficulty": "Beginner"
    },
    "git": {
        "what_it_is": "Version control system for tracking code changes",
        "why_it_matters": "Fundamental skill for professional development and collaboration",
        "learn_in": "1 week",
        "project_idea": "Create repository, practice branching, merging, and PR workflow",
        "difficulty": "Beginner"
    },
    "ci/cd": {
        "what_it_is": "Continuous Integration/Continuous Deployment pipelines",
        "why_it_matters": "Required for DevOps and production ML roles",
        "learn_in": "3 weeks",
        "project_idea": "Set up GitHub Actions to auto-test and deploy FastAPI on push",
        "difficulty": "Intermediate"
    },
    "langchain": {
        "what_it_is": "Framework for building applications with language models",
        "why_it_matters": "Required for GenAI and LLM-based application roles",
        "learn_in": "3 weeks",
        "project_idea": "Build chatbot with LangChain that uses OpenAI API with memory",
        "difficulty": "Intermediate"
    },
    "scikit-learn": {
        "what_it_is": "Python library for classical machine learning algorithms",
        "why_it_matters": "Foundation for data science and ML roles — often used alongside deep learning",
        "learn_in": "3 weeks",
        "project_idea": "Build end-to-end pipeline: load data, train classifier, evaluate metrics",
        "difficulty": "Beginner"
    },
    "data engineering": {
        "what_it_is": "Building systems and pipelines for collecting, storing, and processing data",
        "why_it_matters": "Critical infrastructure for ML and analytics teams",
        "learn_in": "10 weeks",
        "project_idea": "Build ETL pipeline from API → PostgreSQL → Parquet warehouse",
        "difficulty": "Advanced"
    },
    "model deployment": {
        "what_it_is": "Taking trained ML models to production with serving and monitoring",
        "why_it_matters": "Bridge between research and business impact — production ML requirement",
        "learn_in": "4 weeks",
        "project_idea": "Deploy trained model as API with versioning, monitoring, and A/B testing",
        "difficulty": "Intermediate"
    },
    "statistics": {
        "what_it_is": "Mathematical foundations for understanding data and probability",
        "why_it_matters": "Theoretical foundation for ML and data science roles",
        "learn_in": "6 weeks",
        "project_idea": "Apply hypothesis testing, A/B testing, and Bayesian methods to datasets",
        "difficulty": "Intermediate"
    },
    "nlp": {
        "what_it_is": "Natural Language Processing for understanding and generating human language",
        "why_it_matters": "Specialized requirement for conversational AI and text analysis roles",
        "learn_in": "6 weeks",
        "project_idea": "Build sentiment classifier or question-answering system using transformers",
        "difficulty": "Advanced"
    },
    "computer vision": {
        "what_it_is": "Building systems that understand images and video",
        "why_it_matters": "Specialized requirement for autonomous systems and visual AI roles",
        "learn_in": "6 weeks",
        "project_idea": "Build image classification or object detection system with OpenCV",
        "difficulty": "Advanced"
    },
    "apache spark": {
        "what_it_is": "Distributed computing framework for big data processing",
        "why_it_matters": "Standard for data engineering and large-scale ML roles",
        "learn_in": "4 weeks",
        "project_idea": "Process large dataset with Spark on local cluster, write SQL queries",
        "difficulty": "Advanced"
    },
    "mongodb": {
        "what_it_is": "NoSQL document database with flexible schema",
        "why_it_matters": "Standard for modern web applications and flexible data storage",
        "learn_in": "2 weeks",
        "project_idea": "Design collection schema for job marketplace, implement aggregation pipelines",
        "difficulty": "Beginner"
    },
    "rest apis": {
        "what_it_is": "Architectural style for building web services with HTTP verbs",
        "why_it_matters": "Fundamental skill for backend and full-stack development",
        "learn_in": "2 weeks",
        "project_idea": "Design and build RESTful API with proper error handling and validation",
        "difficulty": "Beginner"
    },
    "system design": {
        "what_it_is": "Designing large-scale systems for scalability, reliability, and performance",
        "why_it_matters": "Required for senior engineer and architecture roles",
        "learn_in": "8 weeks",
        "project_idea": "Design scalable job marketplace architecture with caching, DB sharding",
        "difficulty": "Advanced"
    },
    "testing": {
        "what_it_is": "Writing unit tests, integration tests, and end-to-end tests",
        "why_it_matters": "Essential skill for professional software development",
        "learn_in": "3 weeks",
        "project_idea": "Write comprehensive test suite for API with pytest, mocking dependencies",
        "difficulty": "Beginner"
    },
    "devops": {
        "what_it_is": "Practices and tools for deployment, monitoring, and infrastructure",
        "why_it_matters": "Required for DevOps roles and modern software delivery",
        "learn_in": "8 weeks",
        "project_idea": "Set up infrastructure as code, monitoring, logging, and alerting",
        "difficulty": "Advanced"
    },
    "solidity": {
        "what_it_is": "Programming language for Ethereum smart contracts",
        "why_it_matters": "Specialized skill for blockchain and Web3 development roles",
        "learn_in": "5 weeks",
        "project_idea": "Write and deploy a smart contract on test network",
        "difficulty": "Intermediate"
    },
    "typescript": {
        "what_it_is": "Superset of JavaScript with static typing",
        "why_it_matters": "Industry standard for modern full-stack development",
        "learn_in": "2 weeks",
        "project_idea": "Refactor JavaScript project to TypeScript, add strict type checking",
        "difficulty": "Beginner"
    }
}

# ============================================================================
# DATASET 2: ROLE ROADMAPS (Career Progression)
# ============================================================================

ROLE_ROADMAPS = {
    "machine learning engineer": {
        "phases": [
            {
                "phase": 1,
                "name": "Foundations",
                "duration": "4 weeks",
                "skills": ["python", "statistics", "scikit-learn", "sql"],
                "milestone": "Build and evaluate a classification model on Kaggle dataset"
            },
            {
                "phase": 2,
                "name": "Deep Learning",
                "duration": "6 weeks",
                "skills": ["tensorflow", "pytorch", "deep learning", "computer vision"],
                "milestone": "Train a CNN or LSTM on real data and achieve competitive benchmark"
            },
            {
                "phase": 3,
                "name": "Production & Deployment",
                "duration": "4 weeks",
                "skills": ["docker", "fastapi", "model deployment", "aws"],
                "milestone": "Deploy a trained model behind a REST API with Docker"
            }
        ],
        "total_duration": "14 weeks",
        "entry_level_score_needed": 65
    },
    "full stack developer": {
        "phases": [
            {
                "phase": 1,
                "name": "Frontend Fundamentals",
                "duration": "4 weeks",
                "skills": ["react", "typescript", "rest apis"],
                "milestone": "Build interactive dashboard with React and API integration"
            },
            {
                "phase": 2,
                "name": "Backend Development",
                "duration": "5 weeks",
                "skills": ["fastapi", "postgresql", "testing"],
                "milestone": "Build complete REST API with database and test coverage"
            },
            {
                "phase": 3,
                "name": "Deployment & Scaling",
                "duration": "3 weeks",
                "skills": ["docker", "ci/cd", "aws"],
                "milestone": "Deploy full-stack application with automated testing and monitoring"
            }
        ],
        "total_duration": "12 weeks",
        "entry_level_score_needed": 60
    },
    "devops engineer": {
        "phases": [
            {
                "phase": 1,
                "name": "Linux & Containerization",
                "duration": "3 weeks",
                "skills": ["docker", "git", "postgresql"],
                "milestone": "Containerize and run multi-container application with Docker Compose"
            },
            {
                "phase": 2,
                "name": "Orchestration & Infrastructure",
                "duration": "4 weeks",
                "skills": ["kubernetes", "ci/cd", "aws"],
                "milestone": "Deploy application to Kubernetes cluster with auto-scaling"
            },
            {
                "phase": 3,
                "name": "Advanced Operations",
                "duration": "3 weeks",
                "skills": ["devops", "system design", "monitoring"],
                "milestone": "Implement monitoring, logging, and automated incident response"
            }
        ],
        "total_duration": "10 weeks",
        "entry_level_score_needed": 55
    },
    "data engineer": {
        "phases": [
            {
                "phase": 1,
                "name": "SQL & Data Fundamentals",
                "duration": "3 weeks",
                "skills": ["sql", "postgresql", "git"],
                "milestone": "Write complex queries with joins, aggregations, window functions"
            },
            {
                "phase": 2,
                "name": "Data Pipelines & Warehousing",
                "duration": "5 weeks",
                "skills": ["data engineering", "apache spark", "python"],
                "milestone": "Build ETL pipeline from API to data warehouse with testing"
            },
            {
                "phase": 3,
                "name": "Production Scale",
                "duration": "4 weeks",
                "skills": ["devops", "ci/cd", "aws"],
                "milestone": "Deploy scalable data pipeline with monitoring and alerting"
            }
        ],
        "total_duration": "12 weeks",
        "entry_level_score_needed": 60
    },
    "frontend developer": {
        "phases": [
            {
                "phase": 1,
                "name": "React Mastery",
                "duration": "3 weeks",
                "skills": ["react", "typescript", "git"],
                "milestone": "Build complex interactive UI with hooks and state management"
            },
            {
                "phase": 2,
                "name": "API Integration & Testing",
                "duration": "3 weeks",
                "skills": ["rest apis", "testing"],
                "milestone": "Integrate API, implement error handling, write unit tests"
            },
            {
                "phase": 3,
                "name": "Performance & Deployment",
                "duration": "2 weeks",
                "skills": ["ci/cd", "docker"],
                "milestone": "Optimize performance, set up CI/CD, deploy to production"
            }
        ],
        "total_duration": "8 weeks",
        "entry_level_score_needed": 50
    },
    "backend developer": {
        "phases": [
            {
                "phase": 1,
                "name": "Core Backend Skills",
                "duration": "3 weeks",
                "skills": ["fastapi", "postgresql", "sql"],
                "milestone": "Build REST API with database operations and validation"
            },
            {
                "phase": 2,
                "name": "Advanced Patterns",
                "duration": "3 weeks",
                "skills": ["testing", "redis", "rest apis"],
                "milestone": "Implement caching, async operations, comprehensive test suite"
            },
            {
                "phase": 3,
                "name": "Production Readiness",
                "duration": "2 weeks",
                "skills": ["docker", "ci/cd"],
                "milestone": "Containerize API, set up automated testing and deployment"
            }
        ],
        "total_duration": "8 weeks",
        "entry_level_score_needed": 55
    },
    "ai engineer": {
        "phases": [
            {
                "phase": 1,
                "name": "LLM Fundamentals",
                "duration": "3 weeks",
                "skills": ["python", "nlp", "rest apis"],
                "milestone": "Use LLM APIs to build basic AI applications"
            },
            {
                "phase": 2,
                "name": "Advanced LLM Architecture",
                "duration": "4 weeks",
                "skills": ["langchain", "fastapi", "devops"],
                "milestone": "Build multi-step agent with memory and tool integration"
            },
            {
                "phase": 3,
                "name": "Production Deployment",
                "duration": "3 weeks",
                "skills": ["docker", "aws", "monitoring"],
                "milestone": "Deploy LLM application with fine-tuning, monitoring, and scaling"
            }
        ],
        "total_duration": "10 weeks",
        "entry_level_score_needed": 58
    }
}

# ============================================================================
# DATASET 3: INTERVIEW QUESTIONS BY ROLE
# ============================================================================

INTERVIEW_QUESTIONS = {
    "machine learning engineer": {
        "technical": [
            "Explain the difference between overfitting and underfitting, and how to address each",
            "Walk me through the end-to-end process of building a machine learning model",
            "How would you handle class imbalance in a classification problem?",
            "Explain the bias-variance tradeoff and its impact on model selection",
            "How would you evaluate a model — what metrics matter most?"
        ],
        "project_based": [
            "Describe your most complex ML project — what was the problem and how did you solve it?",
            "Tell me about a time you deployed a model to production — what challenges did you face?",
            "How did you choose your model architecture for a past project?"
        ],
        "gap_based": {
            "docker": "Tell me about containerization — have you containerized a model? If not, how would you approach it?",
            "model deployment": "How would you deploy an ML model to production? Walk me through your architecture.",
            "kubernetes": "Have you worked with Kubernetes? If not, how would you handle scaling multiple ML services?"
        }
    },
    "full stack developer": {
        "technical": [
            "Explain the difference between SQL and NoSQL databases and when to use each",
            "How would you handle state management in a complex React application?",
            "Walk me through building a REST API from scratch",
            "How do you ensure database queries are efficient?",
            "What security considerations matter most for web applications?"
        ],
        "project_based": [
            "Tell me about your most complex full-stack project",
            "Describe a time you had to optimize a slow application — what was the bottleneck?",
            "How have you handled authentication and authorization in your projects?"
        ],
        "gap_based": {
            "typescript": "Do you have experience with TypeScript? If not, what's your understanding?",
            "ci/cd": "Have you set up CI/CD pipelines? If not, how would you approach automated testing and deployment?",
            "system design": "How would you design a scalable marketplace like Amazon?"
        }
    },
    "devops engineer": {
        "technical": [
            "Explain the benefits of containerization with Docker",
            "How would you design a Kubernetes cluster for high availability?",
            "Walk me through setting up a CI/CD pipeline",
            "How do you monitor and alert on critical infrastructure issues?",
            "Explain Infrastructure as Code — why is it important?"
        ],
        "project_based": [
            "Describe your most complex infrastructure project",
            "Tell me about a time you debugged a production incident",
            "How have you improved deployment speed or reliability?"
        ],
        "gap_based": {
            "kubernetes": "Have you worked with Kubernetes? If not, how would you learn it?",
            "aws": "What AWS services are you familiar with? Which ones matter most for your target role?",
            "system design": "How would you design infrastructure for a high-traffic application?"
        }
    },
    "data engineer": {
        "technical": [
            "Explain the difference between OLTP and OLAP systems",
            "How would you design a data warehouse schema?",
            "Walk me through an ETL pipeline you've built",
            "How do you ensure data quality?",
            "Explain horizontal vs vertical scaling for data systems"
        ],
        "project_based": [
            "Describe the most complex data pipeline you've built",
            "Tell me about a time you optimized a slow query or pipeline",
            "How have you handled schema evolution in production?"
        ],
        "gap_based": {
            "apache spark": "Do you have Spark experience? If not, how is it different from SQL-only approaches?",
            "devops": "Have you deployed data pipelines? If not, how would you approach production data systems?",
            "system design": "How would you design a data system for real-time analytics?"
        }
    },
    "frontend developer": {
        "technical": [
            "Explain the React component lifecycle",
            "How would you optimize a slow React application?",
            "What's the difference between controlled and uncontrolled components?",
            "How do you handle errors in async operations?",
            "Explain CSS flexbox and when to use it"
        ],
        "project_based": [
            "Tell me about the most complex interactive UI you've built",
            "Describe a time you had to make a design responsive across devices",
            "How have you handled performance issues in a production application?"
        ],
        "gap_based": {
            "typescript": "Do you use TypeScript? If not, what are its main benefits?",
            "testing": "How do you test React components? What testing approach do you prefer?",
            "backend": "How much backend knowledge do you have? How would you debug API integration issues?"
        }
    },
    "backend developer": {
        "technical": [
            "How would you design a REST API for a complex domain?",
            "Explain the N+1 query problem and how to avoid it",
            "How do you handle authentication and authorization?",
            "Walk me through building a scalable database schema",
            "How do you ensure API security?"
        ],
        "project_based": [
            "Tell me about the most complex API you've built",
            "Describe a time you had to refactor legacy code",
            "How have you handled scaling challenges in a growing system?"
        ],
        "gap_based": {
            "redis": "Have you used Redis? If not, what are the main use cases?",
            "testing": "How do you test your APIs? What's your approach to test coverage?",
            "devops": "How much DevOps knowledge do you have? How would you deploy your API?"
        }
    },
    "ai engineer": {
        "technical": [
            "Explain how large language models work at a high level",
            "How would you fine-tune a language model for a specific domain?",
            "What's the difference between in-context learning and fine-tuning?",
            "How would you build a RAG (Retrieval Augmented Generation) system?",
            "Explain the concept of prompt engineering"
        ],
        "project_based": [
            "Tell me about an AI application you've built",
            "Describe a challenge you faced with LLM behavior and how you solved it",
            "How have you integrated AI into production systems?"
        ],
        "gap_based": {
            "langchain": "Have you used LangChain? If not, what's your understanding of LLM frameworks?",
            "devops": "How would you deploy an LLM application to production?",
            "system design": "How would you architect a system to serve multiple LLM features at scale?"
        }
    }
}
