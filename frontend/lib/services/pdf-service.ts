/**
 * PDF Service Module
 * Provides methods for interacting with the PDF API endpoints
 */
import apiClient from '../api-client';

/**
 * PDF Status interface - matches backend schema
 * Used for tracking the processing status of uploaded PDFs
 */
export interface PDFStatus {
  id: string;
  status: string;
  progress?: number;
  message?: string;
}

/**
 * PDF Summary interface - matches backend schema
 * Used for listing PDFs in the dashboard
 */
export interface PDFSummary {
  id: string;
  original_name: string;
  status: string;
  page_count?: number;
  qa_count: number;
  created_at: string;
}

/**
 * QA Pair interface - matches backend schema
 * Represents a question-answer pair generated from a PDF
 */
export interface QAPair {
  id: string;
  question: string;
  answer: string;
  section?: string;
  page_number?: number;
  confidence?: number;
  metadata?: any;
  created_at: string;
}

/**
 * Complete PDF interface - matches backend schema
 * Extends summary with additional fields and includes QA pairs
 */
export interface PDF extends PDFSummary {
  filename: string;
  file_path: string;
  error?: string;
  updated_at: string;
  qa_pairs: QAPair[];
}

/**
 * PDF Service - methods for interacting with PDF API endpoints
 */
export const pdfService = {
  /**
   * Upload a PDF file to generate Q&A pairs
   * @param file - The PDF file to upload
   * @returns PDF status information including ID for status tracking
   */
  uploadPDF: async (file: File): Promise<PDFStatus> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  /**
   * Get the current processing status of a PDF
   * @param pdfId - The ID of the PDF to check
   * @returns Current status with progress information
   */
  getPDFStatus: async (pdfId: string): Promise<PDFStatus> => {
    const response = await apiClient.get(`/status/${pdfId}`);
    return response.data;
  },
  
  /**
   * Get a list of all PDFs
   * @returns Array of PDF summary information
   */
  listPDFs: async (): Promise<PDFSummary[]> => {
    const response = await apiClient.get('/list/');
    return response.data;
  },
  
  /**
   * Get detailed information about a specific PDF
   * @param pdfId - The ID of the PDF to retrieve
   * @returns Detailed PDF information including QA pairs
   */
  getPDF: async (pdfId: string): Promise<PDF> => {
    const response = await apiClient.get(`/pdf/${pdfId}`);
    return response.data;
  },
  
  /**
   * Get all Q&A pairs for a specific PDF
   * @param pdfId - The ID of the PDF to get Q&A pairs for
   * @returns Array of QA pairs
   */
  getQAPairs: async (pdfId: string): Promise<QAPair[]> => {
    const response = await apiClient.get(`/qa/${pdfId}`);
    return response.data;
  },
  
  /**
   * Cancel processing of a PDF
   * @param pdfId - The ID of the PDF to cancel processing for
   * @returns Updated PDF status
   */
  cancelPDFProcessing: async (pdfId: string): Promise<PDFStatus> => {
    const response = await apiClient.post(`/cancel/${pdfId}`);
    return response.data;
  }
};
