# PDF QA Generator

A powerful application for extracting question-answer pairs from PDF documents using AI. This tool processes PDF files, extracts text content, and generates high-quality question-answer pairs that capture the key information in the document.

## Features

- **PDF Processing**: Upload and process PDF documents with text extraction and OCR fallback
- **AI-Powered Q&A Generation**: Generate relevant question-answer pairs from document content using Anthropic Claude AI
- **Real-time Progress Tracking**: Monitor processing status with detailed progress indicators
- **Interactive UI**: Modern, responsive interface for uploading documents and viewing results
- **API Key Management**: Securely save and manage your Anthropic API key

## Architecture

The application consists of two main components:

### Backend (FastAPI)

- **PDF Processing**: Extracts text from PDFs with OCR fallback for image-based documents
- **Text Processing**: Semantically chunks text to maintain context
- **Q&A Generation**: Uses Anthropic's Claude API to generate high-quality question-answer pairs
- **REST API**: Provides endpoints for document management and processing

### Frontend (Next.js)

- **Modern UI**: Built with Next.js and Tailwind CSS
- **Real-time Updates**: Monitors processing status
- **API Integration**: Communicates with the backend API

## Prerequisites

- Python 3.8+
- Node.js 18+
- Anthropic API key (Claude)

## Setup Instructions

### Backend Setup

1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your configuration:
   ```
   # Optional: Set your Anthropic API key here or use the UI to set it
   ANTHROPIC_API_KEY=your_api_key_here
   
   # Database configuration (defaults to SQLite)
   DATABASE_URL=sqlite:///./pdf_qa.db
   ```

5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## Usage Guide

1. **Set Your API Key**:
   - Click the API key button in the top right
   - Enter your Anthropic API key
   - Click Save

2. **Upload a PDF**:
   - Click the Upload button on the home page
   - Select a PDF file from your computer
   - Click Upload to start processing

3. **View Processing Status**:
   - The application will show the processing status with a progress bar
   - Processing includes text extraction, chunking, and Q&A generation

4. **Explore Generated Q&A Pairs**:
   - Once processing is complete, you'll be redirected to the document view
   - Browse through the generated questions and answers
   - Use the search functionality to find specific information

## API Documentation

### PDF Endpoints

- `POST /api/v1/upload/`: Upload a new PDF for processing
- `GET /api/v1/status/{pdf_id}`: Get processing status for a PDF
- `GET /api/v1/pdf/{pdf_id}`: Get PDF details and Q&A pairs
- `GET /api/v1/qa/{pdf_id}`: Get all Q&A pairs for a PDF
- `POST /api/v1/cancel/{pdf_id}`: Cancel processing of a PDF

### Settings Endpoints

- `GET /api/v1/settings/api-key-status`: Check if the API key is set
- `POST /api/v1/settings/api-key`: Save an API key

## Troubleshooting

### Common Issues

1. **Processing Not Starting**:
   - Ensure your Anthropic API key is correctly set
   - Verify the backend is running and accessible

2. **PDF Text Extraction Failing**:
   - For scanned documents, OCR will be used automatically
   - Very large PDFs might take longer to process

3. **Connection Issues**:
   - Check that both frontend and backend servers are running
   - Verify there are no network restrictions blocking connections

### Getting Help

If you encounter any issues:

1. Check the backend logs for error messages
2. Verify all dependencies are installed correctly
3. Ensure your API key has sufficient credits and permissions

## License

[MIT License](LICENSE)

## Acknowledgements

- [Anthropic Claude](https://www.anthropic.com/) for AI text generation
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [Next.js](https://nextjs.org/) for the frontend framework
- [PyPDF2](https://pypdf2.readthedocs.io/) and [PDF2Image](https://github.com/Belval/pdf2image) for PDF processing
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) for optical character recognition
