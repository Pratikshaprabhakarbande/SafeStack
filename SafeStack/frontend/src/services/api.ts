import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120s timeout for git clone and dependency scanning
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
