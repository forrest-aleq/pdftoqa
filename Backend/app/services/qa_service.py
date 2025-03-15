from typing import List, Dict, Optional
import os
import json
import httpx
import logging
from sqlalchemy.orm import Session
from app.models.pdf import PDF, QAPair

logger = logging.getLogger(__name__)

class ModelProvider:
    def __init__(self, provider: str = "claude"):
        self.provider = provider
    
    async def generate_qa_pairs(self, text_chunk: str, context: Optional[Dict] = None) -> List[Dict]:
        """Generate Q&A pairs from text chunk"""
        if self.provider == "claude":
            return await self._generate_with_claude(text_chunk, context)
        elif self.provider == "ollama":
            return await self._generate_with_ollama(text_chunk, context)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def _generate_with_claude(self, text_chunk: str, context: Optional[Dict] = None) -> List[Dict]:
        """Generate Q&A pairs using Claude API"""
        # Get API key from environment
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set in environment")
        
        # Prepare prompt
        section_heading = context.get("heading", "Text") if context else "Text"
        prompt = f"""
        You are an expert at creating high-quality question-answer pairs for training data.
        
        I will provide you with a section of text from a document. Please generate 3-5 question-answer pairs that:
        1. Cover the most important information in the text
        2. Have clear, unambiguous answers found directly in the text
        3. Range from factual recall to conceptual understanding
        4. Are diverse in structure (what, how, why questions)
        
        Section Heading: "{section_heading}"
        
        Text:
        ```
        {text_chunk}
        ```
        
        Format your response as JSON with this structure:
        [
            {{
                "question": "The question text",
                "answer": "The answer text",
                "type": "factual|conceptual|procedural"
            }}
        ]
        
        Only output the JSON, nothing else.
        """
        
        # Make API request
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "anthropic-version": "2023-06-01",
                        "x-api-key": api_key,
                        "content-type": "application/json"
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 1000,
                        "messages": [{"role": "user", "content": prompt}]
                    },
                    timeout=60
                )
                
                response.raise_for_status()
                result = response.json()
                
                # Extract content from Claude's response
                content = result.get("content", [])
                text_content = next((block.get("text") for block in content if block.get("type") == "text"), "[]")
                
                # Parse JSON response
                qa_pairs = json.loads(text_content)
                
                # Add context to each pair
                for pair in qa_pairs:
                    pair["section"] = section_heading
                
                return qa_pairs
        except Exception as e:
            logger.error(f"Error calling Claude API: {str(e)}")
            # Return a minimal response in case of error
            return [{"question": "Error generating Q&A", "answer": f"API error: {str(e)}", "type": "error", "section": section_heading}]
    
    async def _generate_with_ollama(self, text_chunk: str, context: Optional[Dict] = None) -> List[Dict]:
        """Generate Q&A pairs using local Ollama model"""
        # Get Ollama endpoint from environment
        endpoint = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434/api/generate")
        model = os.getenv("OLLAMA_MODEL", "llama2:13b")
        
        section_heading = context.get("heading", "Text") if context else "Text"
        prompt = f"""
        You are an expert at creating high-quality question-answer pairs for training data.
        
        Given this text from a document, generate 3-5 question-answer pairs:
        
        Section: "{section_heading}"
        
        Text:
        ```
        {text_chunk}
        ```
        
        Format response as JSON:
        [
            {{
                "question": "The question text",
                "answer": "The answer text",
                "type": "factual|conceptual|procedural"
            }}
        ]
        
        Output only valid JSON, nothing else.
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False
                    },
                    timeout=120
                )
                
                response.raise_for_status()
                result = response.json()
                
                # Extract response
                generation = result.get("response", "[]")
                
                # Clean up response to extract JSON only
                json_start = generation.find("[")
                json_end = generation.rfind("]") + 1
                
                if json_start >= 0 and json_end > json_start:
                    clean_json = generation[json_start:json_end]
                    qa_pairs = json.loads(clean_json)
                else:
                    raise ValueError("Could not find valid JSON in response")
                
                # Add context to each pair
                for pair in qa_pairs:
                    pair["section"] = section_heading
                
                return qa_pairs
        except Exception as e:
            logger.error(f"Error calling Ollama API: {str(e)}")
            # Return a minimal response in case of error
            return [{"question": "Error generating Q&A", "answer": f"API error: {str(e)}", "type": "error", "section": section_heading}]

class QAService:
    def __init__(self, model_provider: str = "claude"):
        self.model_provider = ModelProvider(provider=model_provider)
    
    async def generate_qa_from_chunks(self, chunks: List[Dict], pdf_id: str, db: Session):
        """Generate Q&A pairs from text chunks and save to database"""
        # Get PDF from database
        pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
        if not pdf:
            raise ValueError(f"PDF with ID {pdf_id} not found")
        
        all_qa_pairs = []
        total_chunks = len(chunks)
        
        # Generate Q&A pairs for each chunk
        for i, chunk in enumerate(chunks):
            # Skip if processing was canceled
            pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
            if pdf.status == "canceled":
                return []
                
            # Calculate and update progress (50-90% range for Q&A generation)
            progress = 50 + int((i / total_chunks) * 40)
            pdf.progress = progress
            pdf.status = f"analyzing_chunk_{i+1}_of_{total_chunks}"
            db.commit()
            
            # Generate pairs
            qa_pairs = await self.model_provider.generate_qa_pairs(
                text_chunk=chunk["content"],
                context={"heading": chunk["heading"]}
            )
            
            # Add to database
            for qa in qa_pairs:
                db_qa = QAPair(
                    pdf_id=pdf_id,
                    question=qa["question"],
                    answer=qa["answer"],
                    section=qa.get("section", chunk["heading"]),
                    page_number=None,  # We don't have page numbers yet
                    confidence=None,
                    meta_data={"type": qa.get("type", "unknown")}
                )
                db.add(db_qa)
                all_qa_pairs.append(db_qa)
            
            # Commit in batches
            db.commit()
        
        # Update PDF status to completed
        pdf.status = "completed"
        pdf.progress = 100
        db.commit()
        
        return all_qa_pairs
