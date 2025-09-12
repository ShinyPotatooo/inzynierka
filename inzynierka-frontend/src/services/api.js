// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  timeout: 10000,
  // ❗️Akceptuj 304 (warunkowe odpowiedzi) jako OK
  validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
});

// prosty helper do opóźnienia
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- REQUEST: dopnij token jak masz teraz
API.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  const token = user ? JSON.parse(user)?.token : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- RESPONSE: retry/backoff dla 429/503 + lepsze komunikaty
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config || {};
    const status = error.response?.status;

    if (axios.isCancel?.(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    if ((status === 429 || status === 503) && (cfg.__retried || 0) < 2) {
      cfg.__retried = (cfg.__retried || 0) + 1;
      const retryAfter = Number(error.response?.headers?.['retry-after']);
      const delay = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : 400 * cfg.__retried; // 400ms, potem 800ms
      await sleep(delay);
      return API(cfg);
    }

    const message =
      error.response?.data?.error ||
      (status === 429
        ? 'Za dużo zapytań — spróbuj ponownie za chwilę.'
        : status === 401
        ? 'Sesja wygasła — zaloguj się ponownie.'
        : 'Błąd sieci lub serwera');

    // eslint-disable-next-line no-console
    console.warn(
      '[API error]',
      cfg.method?.toUpperCase(),
      cfg.url,
      'status:', status,
      'retries:', cfg.__retried || 0,
      'payload:', cfg.data || cfg.params || null
    );

    error.message = message;

    if (!error.response) {
      error.response = { data: { error: message } };
    }

    return Promise.reject(error);
  }
);

export default API;