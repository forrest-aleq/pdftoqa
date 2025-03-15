#!/bin/bash
# PDF to Q&A Backend Setup Script
# This script sets up the entire project structure and installs dependencies

# Exit on error
set -e

echo "=== Setting up PDF to Q&A Backend ==="

# Create main project directory
echo "Creating project directory structure..."
mkdir -p pdf_qa_backend
cd pdf_qa_backend

# Create app structure
mkdir -p app/models app/schemas app/services app/utils app/routers
mkdir -p storage/pdfs storage/results

# Create __init__.py files
touch app/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
touch app/services/__init__.py
touch app/utils/__init__.py
touch app/routers/__init__.py

# Create main.py
echo "Creating application files..."
cat > app/main.py << 'EOL'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pdf
from app.database import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PDF to Q&A API",
    description="API for converting PDFs to Q&A pairs for training data",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf.router, prefix="/api/v1", tags=["pdf"])

@app.get("/")
async def root():
    return {"message": "Welcome to PDF to Q&A API"}
EOL

# Create database.py
cat > app/database.py << 'EOL'
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Default to SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pdf_qa.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOL

# Create models/pdf.py
cat > app/models/pdf.py << 'EOL'
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class PDF(Base):
    __tablename__ = "pdfs"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    page_count = Column(Integer, nullable=True)
    status = Column(String, default="uploaded")  # uploaded, processing, completed, failed
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship with Q&A pairs
    qa_pairs = relationship("QAPair", back_populates="pdf", cascade="all, delete-orphan")

class QAPair(Base):
    __tablename__ = "qa_pairs"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    pdf_id = Column(String, ForeignKey("pdfs.id", ondelete="CASCADE"))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    section = Column(String, nullable=True)  # Section or heading where this Q&A was derived
    page_number = Column(Integer, nullable=True)  # Page number for reference
    confidence = Column(Float, nullable=True)  # Optional confidence score
    metadata = Column(JSON, nullable=True)  # Additional metadata
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship with PDF
    pdf = relationship("PDF", back_populates="qa_pairs")
EOL

# Create schemas/pdf.py
cat > app/schemas/pdf.py << 'EOL'
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# PDF Schemas
class PDFBase(BaseModel):
    original_name: str

class PDFCreate(PDFBase):
    pass

class PDFStatus(BaseModel):
    id: str
    status: str
    progress: Optional[float] = None
    message: Optional[str] = None

class QAPairBase(BaseModel):
    question: str
    answer: str
    section: Optional[str] = None
    page_number: Optional[int] = None
    confidence: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class QAPairCreate(QAPairBase):
    pdf_id: str

class QAPair(QAPairBase):
    id: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class PDF(PDFBase):
    id: str
    filename: str
    file_path: str
    page_count: Optional[int] = None
    status: str
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    qa_pairs: List[QAPair] = []
    
    class Config:
        orm_mode = True

class PDFSummary(BaseModel):
    id: str
    original_name: str
    status: str
    page_count: Optional[int] = None
    qa_count: int
    created_at: datetime
    
    class Config:
        orm_mode = True
EOL

# Create services/pdf_service.py
cat > app/services/pdf_service.py << 'EOL'
import os
import uuid
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.models.pdf import PDF, QAPair
from app.schemas.pdf import PDFCreate
import PyPDF2
from pdf2image import convert_from_path
import pytesseract
import logging

logger = logging.getLogger(__name__)

class PDFService:
    def __init__(self, upload_dir="storage/pdfs"):
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)
        
    async def save_pdf(self, file: UploadFile, db: Session):
        """Save uploaded PDF and create database entry"""
        try:
            # Generate unique filename
            file_id = str(uuid.uuid4())
            filename = f"{file_id}.pdf"
            file_path = os.path.join(self.upload_dir, filename)
            
            # Create directory if not exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Save file
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Create PDF entry in database
            pdf_data = PDFCreate(original_name=file.filename)
            pdf_db = PDF(
                id=file_id,
                filename=filename,
                original_name=pdf_data.original_name,
                file_path=file_path,
                status="uploaded"
            )
            
            db.add(pdf_db)
            db.commit()
            db.refresh(pdf_db)
            
            return pdf_db
        except Exception as e:
            logger.error(f"Error saving PDF: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error saving PDF: {str(e)}")
    
    async def extract_text(self, pdf_id: str, db: Session):
        """Extract text from PDF, with OCR fallback"""
        # Get PDF from database
        pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
        if not pdf:
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Update status
        pdf.status = "processing"
        db.commit()
        
        try:
            # Try standard extraction first
            extracted_text = self._extract_with_pdfminer(pdf.file_path)
            
            # Check if we got meaningful text
            if not extracted_text or len(extracted_text.strip()) < 100:
                # Fallback to OCR
                extracted_text = self._extract_with_ocr(pdf.file_path)
            
            # Update page count
            with open(pdf.file_path, "rb") as f:
                pdf_reader = PyPDF2.PdfReader(f)
                pdf.page_count = len(pdf_reader.pages)
            
            # Store result
            result_path = f"storage/results/{pdf.id}_text.txt"
            os.makedirs(os.path.dirname(result_path), exist_ok=True)
            
            with open(result_path, "w", encoding="utf-8") as f:
                f.write(extracted_text)
            
            return extracted_text
        except Exception as e:
            pdf.status = "failed"
            pdf.error = str(e)
            db.commit()
            logger.error(f"Error extracting text: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")
    
    def _extract_with_pdfminer(self, file_path):
        """Extract text using PDFMiner"""
        from pdfminer.high_level import extract_text
        return extract_text(file_path)
    
    def _extract_with_ocr(self, file_path):
        """Extract text using OCR (Tesseract)"""
        # Convert PDF to images
        images = convert_from_path(file_path)
        
        # Extract text from each image
        text = ""
        for i, image in enumerate(images):
            page_text = pytesseract.image_to_string(image)
            text += f"\n\n--- Page {i+1} ---\n\n"
            text += page_text
        
        return text
EOL

# Create services/text_service.py
cat > app/services/text_service.py << 'EOL'
import re
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class TextService:
    def chunk_text(self, text: str, strategy: str = "semantic"):
        """Split text into chunks based on strategy"""
        if strategy == "semantic":
            return self.chunk_by_headings(text)
        elif strategy == "fixed":
            return self.chunk_by_size(text)
        else:
            # Default to paragraph chunking
            return self.chunk_by_paragraphs(text)
    
    def chunk_by_headings(self, text: str) -> List[Dict]:
        """Split text by headings"""
        # Common heading patterns
        patterns = [
            r'(?:\n|^)#+\s+(.+?)(?:\n|$)',                # Markdown headings
            r'(?:\n|^)(?:CHAPTER|Section)\s+\d+[.:]\s*(.+?)(?:\n|$)',  # Chapter/Section headers
            r'(?:\n|^)(?:[A-Z][A-Za-z\s]+)(?:\n|$)',      # All caps headings
        ]
        
        # Combine patterns
        combined_pattern = '|'.join(f'({p})' for p in patterns)
        
        # Find potential headings
        headings = re.finditer(combined_pattern, text)
        
        chunks = []
        last_end = 0
        current_heading = "Introduction"
        
        for match in headings:
            # Extract heading text
            heading_text = match.group(0).strip()
            start = match.start()
            
            # Add previous chunk
            if start > last_end:
                chunk_text = text[last_end:start].strip()
                if chunk_text:
                    chunks.append({
                        "heading": current_heading,
                        "content": chunk_text
                    })
            
            # Update heading and position
            current_heading = heading_text
            last_end = match.end()
        
        # Add final chunk
        if last_end < len(text):
            chunks.append({
                "heading": current_heading,
                "content": text[last_end:].strip()
            })
        
        return chunks
    
    def chunk_by_paragraphs(self, text: str, min_length: int = 200) -> List[Dict]:
        """Split text by paragraphs"""
        # Split by double newline (common paragraph separator)
        paragraphs = re.split(r'\n\s*\n', text)
        
        chunks = []
        current_chunk = ""
        current_heading = "Text"
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # Check if this might be a heading
            if len(para) < 100 and para.endswith((':', '.')):
                current_heading = para
                current_chunk = ""
                continue
            
            current_chunk += para + "\n\n"
            
            # If chunk is long enough, add it
            if len(current_chunk) >= min_length:
                chunks.append({
                    "heading": current_heading,
                    "content": current_chunk.strip()
                })
                current_chunk = ""
        
        # Add remaining text
        if current_chunk:
            chunks.append({
                "heading": current_heading,
                "content": current_chunk.strip()
            })
        
        return chunks
    
    def chunk_by_size(self, text: str, max_tokens: int = 1000, overlap: int = 100) -> List[Dict]:
        """Split text by fixed size chunks with overlap"""
        # Approximate tokens by splitting on whitespace
        tokens = text.split()
        chunks = []
        
        for i in range(0, len(tokens), max_tokens - overlap):
            chunk_text = " ".join(tokens[i:i + max_tokens])
            
            # Try to find a good title for this chunk
            lines = chunk_text.split('\n')
            potential_title = None
            
            for line in lines[:5]:  # Check first few lines
                line = line.strip()
                if 10 < len(line) < 100 and line.endswith((':', '.')):
                    potential_title = line
                    break
            
            title = potential_title or f"Chunk {len(chunks) + 1}"
            
            chunks.append({
                "heading": title,
                "content": chunk_text
            })
        
        return chunks
EOL

# Create services/qa_service.py
cat > app/services/qa_service.py << 'EOL'
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
        
        # Generate Q&A pairs for each chunk
        for i, chunk in enumerate(chunks):
            # Update processing status
            pdf.status = f"processing_chunk_{i+1}_of_{len(chunks)}"
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
                    metadata={"type": qa.get("type", "unknown")}
                )
                db.add(db_qa)
                all_qa_pairs.append(db_qa)
            
            # Commit in batches
            db.commit()
        
        # Update PDF status to completed
        pdf.status = "completed"
        db.commit()
        
        return all_qa_pairs
EOL

# Create utils/file_utils.py
cat > app/utils/file_utils.py << 'EOL'
import os
import shutil
from fastapi import UploadFile
import uuid

def save_upload_file(upload_file: UploadFile, destination: str) -> str:
    """Save an upload file to the specified destination"""
    # Ensure directory exists
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    
    # Write file
    with open(destination, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    return destination

def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving extension"""
    file_id = str(uuid.uuid4())
    
    # Get file extension
    ext = os.path.splitext(original_filename)[1]
    if not ext:
        ext = ".pdf"  # Default to PDF if no extension
    
    return f"{file_id}{ext}"

def delete_file(file_path: str) -> bool:
    """Delete a file"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception:
        return False
EOL

# Create routers/pdf.py
cat > app/routers/pdf.py << 'EOL'
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import List
import asyncio

from app.database import get_db, SessionLocal
from app.models.pdf import PDF, QAPair
from app.schemas.pdf import PDFSummary, PDFStatus, QAPair as QAPairSchema, PDF as PDFSchema
from app.services.pdf_service import PDFService
from app.services.text_service import TextService
from app.services.qa_service import QAService

router = APIRouter()
pdf_service = PDFService()
text_service = TextService()
qa_service = QAService()

@router.post("/upload/", response_model=PDFStatus)
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Upload a PDF file"""
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Save PDF
    pdf = await pdf_service.save_pdf(file, db)
    
    # Process PDF in background
    background_tasks.add_task(process_pdf_background, pdf.id)
    
    return PDFStatus(
        id=pdf.id,
        status="uploaded",
        progress=0,
        message="PDF uploaded successfully. Processing will begin shortly."
    )

@router.get("/status/{pdf_id}", response_model=PDFStatus)
async def get_pdf_status(pdf_id: str, db: Session = Depends(get_db)):
    """Get PDF processing status"""
    pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Calculate progress based on status
    progress = 0
    message = "Processing not started"
    
    if pdf.status == "uploaded":
        progress = 0
        message = "PDF uploaded. Waiting for processing."
    elif pdf.status == "processing":
        progress = 25
        message = "Extracting text from PDF..."
    elif pdf.status.startswith("processing_chunk"):
        # Extract chunk info from status (e.g., "processing_chunk_1_of_10")
        parts = pdf.status.split("_")
        if len(parts) >= 4:
            current = int(parts[2])
            total = int(parts[4])
            progress = 25 + (current / total * 70)
            message = f"Generating Q&A pairs ({current}/{total} chunks)..."
    elif pdf.status == "completed":
        progress = 100
        message = "Processing completed successfully."
    elif pdf.status == "failed":
        progress = 0
        message = f"Processing failed: {pdf.error or 'Unknown error'}"
    
    return PDFStatus(
        id=pdf.id,
        status=pdf.status,
        progress=progress,
        message=message
    )

@router.get("/list/", response_model=List[PDFSummary])
async def list_pdfs(db: Session = Depends(get_db)):
    """List all PDFs"""
    pdfs = db.query(PDF).order_by(PDF.created_at.desc()).all()
    
    # Add Q&A count to each PDF
    pdf_summaries = []
    for pdf in pdfs:
        qa_count = db.query(QAPair).filter(QAPair.pdf_id == pdf.id).count()
        pdf_summaries.append(PDFSummary(
            id=pdf.id,
            original_name=pdf.original_name,
            status=pdf.status,
            page_count=pdf.page_count,
            qa_count=qa_count,
            created_at=pdf.created_at
        ))
    
    return pdf_summaries

@router.get("/{pdf_id}", response_model=PDFSchema)
async def get_pdf(pdf_id: str, db: Session = Depends(get_db)):
    """Get PDF details with Q&A pairs"""
    pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return pdf

@router.get("/{pdf_id}/qa", response_model=List[QAPairSchema])
async def get_qa_pairs(pdf_id: str, db: Session = Depends(get_db)):
    """Get Q&A pairs for a PDF"""
    # Check if PDF exists
    pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Get Q&A pairs
    qa_pairs = db.query(QAPair).filter(QAPair.pdf_id == pdf_id).all()
    
    return qa_pairs

# Background task helper function
def process_pdf_background(pdf_id: str):
    """Run PDF processing in background using asyncio"""
    asyncio.create_task(process_pdf(pdf_id))

# Background task for processing PDF
async def process_pdf(pdf_id: str):
    """Process PDF in background"""
    # Create a new DB session for this background task
    db = SessionLocal()
    try:
        # Extract text
        text = await pdf_service.extract_text(pdf_id, db)
        
        # Chunk text
        chunks = text_service.chunk_text(text, strategy="semantic")
        
        # Generate Q&A pairs
        await qa_service.generate_qa_from_chunks(chunks, pdf_id, db)
        
    except Exception as e:
        # Update PDF status to failed
        pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
        if pdf:
            pdf.status = "failed"
            pdf.error = str(e)
            db.commit()
    finally:
        db.close()
EOL

# Create run.py
cat > run.py << 'EOL'
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Create storage directories if they don't exist
    os.makedirs("storage/pdfs", exist_ok=True)
    os.makedirs("storage/results", exist_ok=True)
    
    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Enable auto-reload for development
    )
EOL

# Create requirements.txt
cat > requirements.txt << 'EOL'
fastapi>=0.68.0
uvicorn>=0.15.0
python-multipart>=0.0.5
sqlalchemy>=1.4.23
pydantic>=1.8.2
python-dotenv>=0.19.0
PyPDF2>=2.0.0
pdfminer.six>=20200517
pdf2image>=1.16.0
pytesseract>=0.3.8
httpx>=0.19.0
EOL

# Create .env.example
cat > .env.example << 'EOL'
# Database connection
DATABASE_URL=sqlite:///./pdf_qa.db

# API Keys
ANTHROPIC_API_KEY=your_claude_api_key

# Ollama configuration (optional)
OLLAMA_ENDPOINT=http://localhost:11434/api/generate
OLLAMA_MODEL=llama2:13b

# Processing settings
CHUNK_STRATEGY=semantic  # semantic, fixed, or paragraph
MAX_CHUNK_SIZE=1000
CHUNK_OVERLAP=100
EOL

# Create initial .env
cp .env.example .env

echo "Setting up virtual environment..."
# Check if Python is available
if command -v python3 &>/dev/null; then
    python3 -m venv venv
    # Activate venv
    source venv/bin/activate
    # Install dependencies
    pip install -r requirements.txt
elif command -v python &>/dev/null; then
    python -m venv venv
    # Activate venv
    source venv/bin/activate
    # Install dependencies
    pip install -r requirements.txt
else
    echo "Python not found. Please install Python 3.6+ to continue."
    exit 1
fi

# Make the run.py executable
chmod +x run.py

echo "==========================================="
echo "PDF to Q&A Backend setup complete!"
echo ""
echo "System dependencies needed:"
echo "- Tesseract OCR: for image-based PDFs"
echo "- Poppler: for PDF image conversion"
echo ""
echo "On Ubuntu/Debian, install them with:"
echo "sudo apt-get install -y tesseract-ocr poppler-utils"
echo ""
echo "On macOS, install them with:"
echo "brew install tesseract poppler"
echo ""
echo "Next steps:"
echo "1. Edit .env file to add your Claude API key"
echo "2. Start the application:"
echo "   python run.py"
echo "3. API will be available at: http://localhost:8000"
echo "4. API documentation at: http://localhost:8000/docs"
echo "==========================================="