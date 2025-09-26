// src/services/auth.js
import API, { syncAuthHeader } from './api';

/** Logowanie (identifier = email lub nazwa użytkownika) */
export async function login(identifier, password) {
  const res = await API.post('/auth/login', { identifier, password });
  const { data } = res;

  if (!data?.success || !data?.data?.user) {
    throw new Error(data?.error || 'Błąd logowania');
  }

  const user = data.data.user;
  const token = data.data.token || null;

  // ustaw nagłówek w obu klientach (axios & API)
  syncAuthHeader(token);

  // zapisz użytkownika wraz z tokenem
  const userToStore = { ...user, token };
  localStorage.setItem('user', JSON.stringify(userToStore));
  return userToStore;
}

/** Wylogowanie */
export function logout() {
  localStorage.removeItem('user');
  syncAuthHeader(null);
}

/** Użytkownik z localStorage */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Ustaw nagłówek Authorization już przy starcie aplikacji */
export function initAuthHeaderFromStorage() {
  const user = getCurrentUser();
  syncAuthHeader(user?.token || null);
}
