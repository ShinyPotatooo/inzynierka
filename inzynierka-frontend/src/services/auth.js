// src/services/auth.js
import API, { syncAuthHeader } from './api';

/**
 * Logowanie (identifier = email lub nazwa użytkownika)
 * Obsługuje 2FA:
 * - jeśli backend zwróci pending2FA, NIE zapisujemy usera ani tokena
 *   i zwracamy obiekt { pending2FA, userId, message }
 * - jeśli 2FA nie jest wymagane, zapisujemy usera + token jak wcześniej
 */
export async function login(identifier, password) {
  const res = await API.post('/auth/login', { identifier, password });
  const { data } = res;

  if (!data?.success) {
    throw new Error(data?.error || 'Błąd logowania');
  }

  // Ścieżka 2FA: backend nie zwraca tokena, tylko sygnalizuje drugi krok
  if (data?.data?.pending2FA) {
    // NIC nie zapisujemy do localStorage i nie ustawiamy nagłówka
    return {
      pending2FA: true,
      userId: data.data.userId,
      message: data.data.message || 'Na maila wysłano kod 2FA.'
    };
  }

  // Stary scenariusz (brak 2FA) — spodziewamy się user + token
  if (!data?.data?.user) {
    throw new Error(data?.error || 'Błąd logowania (brak danych użytkownika)');
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

/**
 * Weryfikacja kodu 2FA (krok 2)
 * Po sukcesie zapisuje użytkownika i token do localStorage oraz ustawia Authorization header.
 */
export async function verifyTwoFactor(userId, code) {
  const res = await API.post('/auth/verify-2fa', { userId, code });
  const { data } = res;

  if (!data?.success || !data?.data?.user || !data?.data?.token) {
    throw new Error(data?.error || 'Błąd weryfikacji 2FA');
  }

  const user = data.data.user;
  const token = data.data.token;

  // ustaw nagłówek autoryzacji
  syncAuthHeader(token);

  // zapisz użytkownika wraz z tokenem
  const userToStore = { ...user, token };
  localStorage.setItem('user', JSON.stringify(userToStore));
  return userToStore;
}

/**
 * Ponowna wysyłka kodu 2FA
 */
export async function resendTwoFactor(userId) {
  const res = await API.post('/auth/resend-2fa', { userId });
  const { data } = res;
  if (!data?.success) {
    throw new Error(data?.error || 'Nie udało się wysłać kodu 2FA');
  }
  return data?.data?.message || 'Wysłano nowy kod.';
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
