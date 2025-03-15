/**
 * API Client for PDF Q&A application
 * Provides a configured Axios instance for making API requests to the backend
 */
import axios from 'axios';

// Default API URL points to local development server
// In production, set NEXT_PUBLIC_API_URL in the environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Configured Axios instance with common settings
 * - Base URL from environment or default local server
 * - Common headers
 * - JSON content type for requests
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
