from pydantic import BaseModel
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
    meta_data: Optional[Dict[str, Any]] = None

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
    progress: Optional[int] = 0
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
    progress: Optional[int] = 0
    page_count: Optional[int] = None
    qa_count: int
    created_at: datetime
    
    class Config:
        orm_mode = True
