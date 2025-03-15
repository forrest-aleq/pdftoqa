/**
 * React Query hooks for PDF operations
 * Provides easy-to-use hooks for all PDF API operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pdfService, PDFStatus, PDFSummary, PDF, QAPair } from '../lib/services/pdf-service';

/**
 * Hook for uploading a PDF file
 * Returns a mutation function and state (loading, error, etc.)
 */
export const usePDFUpload = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => pdfService.uploadPDF(file),
    onSuccess: () => {
      // Invalidate the PDFs list query to refresh it after upload
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
    },
  });
};

/**
 * Hook for getting the status of a PDF processing job
 * @param pdfId - The ID of the PDF to check status for
 */
export const usePDFStatus = (pdfId: string) => {
  return useQuery({
    queryKey: ['pdf-status', pdfId],
    queryFn: () => pdfService.getPDFStatus(pdfId),
    enabled: !!pdfId, // Only run if pdfId is provided
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true, // Continue polling even when page is in background
    retry: 5, // Retry 5 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff with max 10s
    staleTime: 1000, // Consider data stale after 1 second
  });
};

/**
 * Hook for listing all PDFs
 * Returns query result with data, loading state, and error
 */
export const usePDFList = () => {
  return useQuery({
    queryKey: ['pdfs'],
    queryFn: () => pdfService.listPDFs(),
  });
};

/**
 * Hook for getting detailed information about a specific PDF
 * @param pdfId - The ID of the PDF to retrieve
 */
export const usePDF = (pdfId: string) => {
  return useQuery({
    queryKey: ['pdf', pdfId],
    queryFn: () => pdfService.getPDF(pdfId),
    enabled: !!pdfId, // Only run if pdfId is provided
  });
};

/**
 * Hook for getting Q&A pairs for a specific PDF
 * @param pdfId - The ID of the PDF to get Q&A pairs for
 */
export const useQAPairs = (pdfId: string) => {
  return useQuery({
    queryKey: ['qa-pairs', pdfId],
    queryFn: () => pdfService.getQAPairs(pdfId),
    enabled: !!pdfId, // Only run if pdfId is provided
  });
};

/**
 * Hook for canceling PDF processing
 * Returns a mutation function to cancel processing and state (loading, error, etc.)
 */
export const useCancelPDFProcessing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (pdfId: string) => pdfService.cancelPDFProcessing(pdfId),
    onSuccess: (data) => {
      // Invalidate and refetch PDF status
      queryClient.invalidateQueries({ queryKey: ['pdf-status', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pdf', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pdfs'] });
    },
  });
};
