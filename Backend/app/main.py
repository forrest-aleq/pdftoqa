from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pdf, settings
from app.database import Base, engine

# Import models so they're registered with SQLAlchemy before creating tables
# These imports are needed even though they appear unused
import app.models.pdf  # noqa
import app.models.settings  # noqa

# Create database tables
Base.metadata.create_all(bind=engine)

# Load API key from environment or database
def load_api_key_to_env():
    import os
    from app.models.settings import Setting
    from app.dependencies import get_db
    
    try:
        # Check if already set in environment
        if os.getenv("ANTHROPIC_API_KEY"):
            return
            
        # Get DB session
        db = next(get_db())
        
        # Check if API key is stored in database
        setting = db.query(Setting).filter(Setting.key == "anthropic_api_key").first()
        if setting and setting.value:
            # Set API key in environment
            os.environ["ANTHROPIC_API_KEY"] = setting.value
            print("Loaded API key from database")
    except Exception as e:
        print(f"Error loading API key: {e}")

# Load API key on startup
load_api_key_to_env()

app = FastAPI(
    title="PDF QA API",
    description="API for converting PDFs to Q&A pairs for training data",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development frontend
        "http://127.0.0.1:3000",  # Alternative local address
        # Add production domains when deploying
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf.router, prefix="/api/v1", tags=["pdf"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["settings"])

@app.get("/")
def read_root():
    return {"message": "Welcome to PDF QA API"}
