// src/services/auth.js
import API from './api';

/**
 * Logowanie użytkownika (identifier = email LUB nazwa)
 */
export async function login(identifier, password) {
  try {
    const res = await API.post('/auth/login', { identifier, password });
    const { data } = res;

    if (!data?.success || !data?.data?.user) {
      throw new Error(data?.error || 'Błąd logowania');
    }

    const user = data.data.user;
    const token = data.data.token || null;

    // Ustaw nagłówek autoryzacji tylko jeśli token jest zwrócony
    if (token) {
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete API.defaults.headers.common['Authorization'];
    }

    // Zapis do localStorage (token może być null)
    const userToStore = { ...user, token };
    localStorage.setItem('user', JSON.stringify(userToStore));

    return userToStore;
  } catch (err) {
    const message =
      err?.response?.data?.error ||
      err?.message ||
      'Błąd połączenia z serwerem';
    throw new Error(message);
  }
}

/**
 * Wylogowanie użytkownika
 */
export function logout() {
  localStorage.removeItem('user');
  delete API.defaults.headers.common['Authorization'];
}

/**
 * Pobranie aktualnego użytkownika z localStorage
 */
export function getCurrentUser() {
  const raw = localStorage.getItem('user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * (Opcjonalnie) Inicjalizacja nagłówka Authorization na starcie aplikacji
 * Wywołaj np. w index.js po zainicjowaniu aplikacji.
 */
export function initAuthHeaderFromStorage() {
  const user = getCurrentUser();
  if (user?.token) {
    API.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
  } else {
    delete API.defaults.headers.common['Authorization'];
  }
}







