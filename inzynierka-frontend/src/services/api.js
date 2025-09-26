// src/services/api.js
import axios from 'axios';

// --- wspólny helper do zsynchronizowania nagłówka w obu klientach ---
export function syncAuthHeader(token) {
  if (token) {
    const value = `Bearer ${token}`;
    axios.defaults.headers.common['Authorization'] = value;
    API.defaults.headers.common['Authorization'] = value;
  } else {
    delete axios.defaults.headers.common['Authorization'];
    delete API.defaults.headers.common['Authorization'];
  }
}

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  // JWT w nagłówku – cookies nie są potrzebne:
  withCredentials: false,
  timeout: 10000,
  // akceptuj 304 jako OK
  validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
});

// mała pauza do retry
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- REQUEST: dołącz JWT z localStorage (gdyby ktoś zapomniał syncAuthHeader) ---
API.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('user');
    const token = raw ? JSON.parse(raw)?.token : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

// --- RESPONSE: prosty backoff na 429/503 + czytelne komunikaty ---
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
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 400 * cfg.__retried;
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

    console.warn(
      '[API error]',
      cfg.method?.toUpperCase(),
      cfg.url,
      'status:', status,
      'retries:', cfg.__retried || 0,
      'payload:', cfg.data || cfg.params || null
    );

    error.message = message;
    if (!error.response) error.response = { data: { error: message } };
    return Promise.reject(error);
  }
);

export default API;
