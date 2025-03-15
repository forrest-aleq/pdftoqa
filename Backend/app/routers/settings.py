from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.models.settings import Setting
from pydantic import BaseModel
import os

router = APIRouter(
    tags=["settings"],
    responses={404: {"description": "Not found"}}
)

class ApiKeyRequest(BaseModel):
    apiKey: str

@router.get("/api-key-status")
async def get_api_key_status(db: Session = Depends(get_db)):
    """Check if API key is set"""
    # First check environment variable
    if os.getenv("ANTHROPIC_API_KEY"):
        return {"isSet": True}
    
    # Then check database
    setting = db.query(Setting).filter(Setting.key == "anthropic_api_key").first()
    return {"isSet": setting is not None and setting.value != ""}

@router.post("/api-key")
async def save_api_key(request: ApiKeyRequest, db: Session = Depends(get_db)):
    """Save API key to database and set in environment"""
    # Validate API key format (basic check)
    if not request.apiKey.startswith("sk-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key format"
        )
    
    # Save to database
    setting = db.query(Setting).filter(Setting.key == "anthropic_api_key").first()
    if setting:
        setting.value = request.apiKey
    else:
        setting = Setting(key="anthropic_api_key", value=request.apiKey)
        db.add(setting)
    
    db.commit()
    
    # Set in environment for current session
    os.environ["ANTHROPIC_API_KEY"] = request.apiKey
    
    return {"success": True}
