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
