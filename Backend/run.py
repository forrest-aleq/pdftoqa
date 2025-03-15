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
