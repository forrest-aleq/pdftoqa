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

_background_tasks = set()

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
    
    # Use the progress value from the database
    progress = pdf.progress or 0
    message = "Processing not started"
    
    if pdf.status == "uploaded":
        message = "PDF uploaded. Waiting for processing."
    elif pdf.status == "processing":
        message = "Extracting text from PDF..."
    elif pdf.status.startswith("analyzing_chunk"):
        # Extract chunk info from status (e.g., "analyzing_chunk_1_of_10")
        parts = pdf.status.split("_")
        if len(parts) >= 4:
            current = int(parts[2])
            total = int(parts[4])
            message = f"Generating Q&A pairs ({current}/{total} chunks)..."
    elif pdf.status == "completed":
        progress = 100
        message = "Processing completed successfully."
    elif pdf.status == "failed":
        message = f"Processing failed: {pdf.error}"
    elif pdf.status == "canceled":
        message = "Processing was canceled by the user"
    
    return PDFStatus(
        id=pdf.id,
        status=pdf.status,
        progress=progress,
        message=message
    )

@router.post("/cancel/{pdf_id}", response_model=PDFStatus)
async def cancel_pdf_processing(pdf_id: str, db: Session = Depends(get_db)):
    """Cancel PDF processing"""
    pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Can only cancel processing if it's in progress
    if pdf.status not in ["processing", "uploaded", "extracting", "analyzing"]:
        raise HTTPException(status_code=400, detail="PDF is not being processed")
    
    # Update status to canceled
    pdf.status = "canceled"
    pdf.error = "Processing was canceled by the user"
    db.commit()
    db.refresh(pdf)
    
    return PDFStatus(
        id=pdf.id,
        status=pdf.status,
        progress=0,
        message="PDF processing has been canceled"
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

@router.get("/pdf/{pdf_id}", response_model=PDFSchema)
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
    # Create a new task in the event loop
    loop = asyncio.get_event_loop()
    task = loop.create_task(process_pdf(pdf_id))
    # Ensure task doesn't get garbage collected by keeping a reference
    # This prevents the task from being cancelled when the function returns
    _background_tasks.add(task)
    # When task completes, remove it from the set
    task.add_done_callback(lambda t: _background_tasks.remove(t))

# Background task for processing PDF
async def process_pdf(pdf_id: str):
    """Process PDF in background"""
    # Create a new DB session for this background task
    db = SessionLocal()
    try:
        # Update status to show processing has started
        pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
        if pdf:
            pdf.status = "processing"
            pdf.progress = 10  # Show initial progress
            db.commit()
            
        # Extract text
        text = await pdf_service.extract_text(pdf_id, db)
        
        # Update progress after text extraction
        pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
        if pdf and pdf.status != "canceled":
            pdf.progress = 30
            db.commit()
        
        # Chunk text
        chunks = text_service.chunk_text(text, strategy="semantic")
        
        # Update progress after chunking
        pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
        if pdf and pdf.status != "canceled":
            pdf.progress = 50
            db.commit()
        
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
