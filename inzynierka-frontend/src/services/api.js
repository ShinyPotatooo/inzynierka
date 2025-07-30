// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  const token = user ? JSON.parse(user)?.token : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Dodaj interceptor odpowiedzi dla lepszej obsługi błędów
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Serwer odpowiedział z kodem statusu spoza 2xx
      return Promise.reject(error);
    } else if (error.request) {
      // Żądanie zostało wysłane, ale nie otrzymano odpowiedzi
      error.response = {
        data: {
          error: 'Brak odpowiedzi z serwera. Sprawdź połączenie internetowe.'
        }
      };
      return Promise.reject(error);
    } else {
      // Coś poszło nie tak podczas konfigurowania żądania
      error.response = {
        data: {
          error: 'Wystąpił błąd podczas wysyłania żądania'
        }
      };
      return Promise.reject(error);
    }
  }
);

export default API;