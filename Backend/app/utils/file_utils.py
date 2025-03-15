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
