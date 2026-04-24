"""
Resume Parser Service — Master Prompt V2.0
3-layer PDF extraction + Claude LLM structuring

Features:
- pdfplumber (primary layer)
- PyMuPDF (fallback layer)
- Tesseract OCR (final fallback)
- Claude LLM for structuring
- Embedding generation with sentence-transformers
"""

import logging
import io
import json
from typing import Optional, Dict, List, Any
from pathlib import Path
import base64

import pdfplumber
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from anthropic import Anthropic

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Initialize Anthropic client and embedding model
anthropic_client = Anthropic()
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


class ResumeParser:
    """Resume parsing with 3-layer fallback strategy."""
    
    def __init__(self):
        self.extraction_methods = [
            ("pdfplumber", self._extract_with_pdfplumber),
            ("PyMuPDF", self._extract_with_fitz),
            ("Tesseract OCR", self._extract_with_ocr),
        ]
    
    def extract_text(self, pdf_bytes: bytes) -> tuple[str, str]:
        """
        Extract text from PDF using 3-layer fallback strategy.
        
        Returns:
            (extracted_text, extraction_method_used)
        """
        for method_name, extraction_func in self.extraction_methods:
            try:
                logger.info(f"Attempting extraction with {method_name}...")
                text = extraction_func(pdf_bytes)
                
                if text and len(text.strip()) > 100:
                    logger.info(f"✅ Successfully extracted {len(text)} chars via {method_name}")
                    return text, method_name
                    
            except Exception as e:
                logger.warning(f"⚠️  {method_name} failed: {e}")
                continue
        
        # If all methods fail
        logger.error("❌ All extraction methods failed")
        raise ValueError("Could not extract text from PDF")
    
    @staticmethod
    def _extract_with_pdfplumber(pdf_bytes: bytes) -> str:
        """Extract text using pdfplumber (most reliable for clean PDFs)."""
        try:
            text = ""
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    extracted_text = page.extract_text()
                    if extracted_text:
                        text += extracted_text + "\n"
            return text
        except Exception as e:
            logger.warning(f"pdfplumber extraction error: {e}")
            raise
    
    @staticmethod
    def _extract_with_fitz(pdf_bytes: bytes) -> str:
        """Extract text using PyMuPDF (good fallback)."""
        try:
            text = ""
            pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page_num in range(len(pdf_doc)):
                page = pdf_doc[page_num]
                page_text = page.get_text()
                if page_text:
                    text += page_text + "\n"
            pdf_doc.close()
            return text
        except Exception as e:
            logger.warning(f"PyMuPDF extraction error: {e}")
            raise
    
    @staticmethod
    def _extract_with_ocr(pdf_bytes: bytes) -> str:
        """Extract text using OCR (for scanned PDFs)."""
        try:
            text = ""
            pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            for page_num in range(len(pdf_doc)):
                page = pdf_doc[page_num]
                
                # Render page to image
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                img_data = pix.tobytes("ppm")
                
                # OCR the image
                image = Image.open(io.BytesIO(img_data))
                page_text = pytesseract.image_to_string(image)
                
                if page_text:
                    text += page_text + "\n"
            
            pdf_doc.close()
            return text
        except Exception as e:
            logger.warning(f"OCR extraction error: {e}")
            raise


class ResumeLLMStructurer:
    """Structure resume text using Claude LLM."""
    
    STRUCTURE_PROMPT = """
You are a resume parsing expert. Extract and structure the following resume text into a JSON object with these fields:

{
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State/Country",
    "summary": "Professional summary or objective",
    "skills": ["Skill 1", "Skill 2", ...],
    "experience": [
        {
            "title": "Job title",
            "company": "Company name",
            "location": "Location",
            "start_date": "YYYY-MM",
            "end_date": "YYYY-MM or 'Present'",
            "description": "Key responsibilities and achievements"
        }
    ],
    "education": [
        {
            "degree": "Degree name",
            "field": "Field of study",
            "institution": "School/University name",
            "graduation_date": "YYYY-MM or 'YYYY'"
        }
    ],
    "certifications": [
        {
            "name": "Certification name",
            "issuer": "Issuing organization",
            "date": "YYYY-MM or 'YYYY'"
        }
    ],
    "projects": [
        {
            "title": "Project title",
            "description": "Project description",
            "technologies": ["Tech 1", "Tech 2"],
            "date": "YYYY-MM or 'YYYY'"
        }
    ]
}

Return ONLY valid JSON, no markdown, no explanations.

Resume text:
{resume_text}
"""
    
    @staticmethod
    async def structure_resume(raw_text: str) -> Dict[str, Any]:
        """Use Claude to structure raw resume text."""
        try:
            logger.info("Structuring resume with Claude...")
            
            message = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": ResumeLLMStructurer.STRUCTURE_PROMPT.format(resume_text=raw_text),
                    }
                ],
            )
            
            # Parse the JSON response
            response_text = message.content[0].text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            structured_data = json.loads(response_text)
            logger.info("✅ Resume structured successfully")
            return structured_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response: {e}")
            raise ValueError("Claude returned invalid JSON")
        except Exception as e:
            logger.error(f"Claude structuring error: {e}")
            raise


class ResumeEmbedder:
    """Generate skill embeddings for similarity search."""
    
    @staticmethod
    def generate_skill_embedding(skills: List[str]) -> List[float]:
        """Generate embedding vector for skill set."""
        if not skills:
            return [0.0] * 384
        
        # Combine skills into a sentence for better embeddings
        skills_text = "Skills: " + ", ".join(skills)
        
        # Generate embedding
        embedding = embedding_model.encode(skills_text, convert_to_tensor=False)
        return embedding.tolist()
    
    @staticmethod
    def generate_summary_embedding(summary: str) -> List[float]:
        """Generate embedding vector for resume summary."""
        if not summary or len(summary.strip()) < 10:
            return [0.0] * 384
        
        embedding = embedding_model.encode(summary, convert_to_tensor=False)
        return embedding.tolist()


async def parse_resume(pdf_bytes: bytes, file_name: str) -> Dict[str, Any]:
    """
    Complete resume parsing pipeline.
    
    Args:
        pdf_bytes: PDF file content
        file_name: Original file name
    
    Returns:
        Structured resume data ready for database storage
    """
    parser = ResumeParser()
    structurer = ResumeLLMStructurer()
    embedder = ResumeEmbedder()
    
    try:
        # Step 1: Extract text
        logger.info(f"Parsing resume: {file_name}")
        raw_text, extraction_method = parser.extract_text(pdf_bytes)
        
        # Step 2: Structure with Claude
        structured_data = await structurer.structure_resume(raw_text)
        
        # Step 3: Generate embeddings
        skill_embedding = embedder.generate_skill_embedding(structured_data.get("skills", []))
        
        # Step 4: Prepare response
        result = {
            "file_name": file_name,
            "raw_text": raw_text[:50000],  # Truncate to 50k chars for storage
            "parse_status": "done",
            "parse_error": None,
            "extraction_method": extraction_method,
            "name": structured_data.get("name"),
            "email": structured_data.get("email"),
            "phone": structured_data.get("phone"),
            "location": structured_data.get("location"),
            "summary": structured_data.get("summary"),
            "skills": structured_data.get("skills", []),
            "experience": structured_data.get("experience", []),
            "education": structured_data.get("education", []),
            "certifications": structured_data.get("certifications", []),
            "projects": structured_data.get("projects", []),
            "skill_embedding": skill_embedding,
        }
        
        logger.info("✅ Resume parsing complete")
        return result
        
    except Exception as e:
        logger.error(f"Resume parsing failed: {e}")
        return {
            "file_name": file_name,
            "raw_text": "",
            "parse_status": "failed",
            "parse_error": str(e),
            "extraction_method": None,
        }
