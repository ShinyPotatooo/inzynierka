// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

// 👉 Interceptor – dodaj Authorization header jeśli jest token
API.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  const token = user ? JSON.parse(user)?.token : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;



