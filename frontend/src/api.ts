import axios from 'axios';

// Create an Axios instance pointing to your FastAPI local server
const api = axios.create({
  baseURL: 'https://library-backend-aman123.azurewebsites.net',
});

// Interceptor to automatically attach the JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
