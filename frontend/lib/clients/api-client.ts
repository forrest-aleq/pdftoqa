import axios from 'axios';

// Create axios instance with base URL
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for adding auth tokens if needed in the future
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth headers here in the future if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors here
    if (error.response?.status === 401) {
      // Handle unauthorized errors
      console.error('Unauthorized request');
    }
    
    return Promise.reject(error);
  }
);
