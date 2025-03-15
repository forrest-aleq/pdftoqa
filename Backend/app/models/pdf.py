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
    progress = Column(Integer, default=0)  # 0-100 progress percentage
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
    meta_data = Column(JSON, nullable=True)  # Additional metadata - renamed from "metadata" which is reserved
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship with PDF
    pdf = relationship("PDF", back_populates="qa_pairs")
