// src/services/auth.js
import API from './api';

/**
 * Logowanie użytkownika
 */
export async function login(username, password) {
  try {
    const res = await API.post('/auth/login', { username, password });

    const { data } = res;

    if (!data.success || !data.data?.user) {
      throw new Error(data.error || 'Błąd logowania');
    }

    const user = data.data.user;
    const token = data.data.token;

    // ✅ Zapisz użytkownika i token
    const userToStore = { ...user, token };
    localStorage.setItem("user", JSON.stringify(userToStore));

    return userToStore;
  } catch (err) {
    const message = err.response?.data?.error || err.message || "Błąd połączenia z serwerem";
    throw new Error(message);
  }
}

/**
 * Wylogowanie użytkownika
 */
export function logout() {
  localStorage.removeItem("user");
}

/**
 * Pobranie aktualnego użytkownika
 */
export function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}






