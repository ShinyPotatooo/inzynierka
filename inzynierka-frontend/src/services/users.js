import API from './api';

/** Lista użytkowników (paginated). */
export async function listUsers({ page = 1, limit = 100, role } = {}) {
  const res = await API.get('/users', { params: { page, limit, role } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania użytkowników');
  return res.data.data; // { users, pagination }
}

/** Utwórz użytkownika. */
export async function createUser({ email, username, firstName, lastName, role = 'worker', password }) {
  const res = await API.post('/users', { email, username, firstName, lastName, role, password });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd dodawania użytkownika');
  return res.data.data.user;
}

/** Zmień rolę użytkownika. */
export async function updateUserRole(id, { role }) {
  const res = await API.put(`/users/${id}`, { role });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd zmiany roli');
  return res.data.data.user;
}

/** Ustaw hasło (wymaga requesterId + currentAdminPassword). */
export async function setUserPassword(id, { password, requesterId, currentAdminPassword }) {
  const res = await API.put(`/users/${id}`, { password, requesterId, currentAdminPassword });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd ustawiania hasła');
  return res.data.data.user;
}

/** Usuń użytkownika (jeśli admin: requesterId + currentAdminPassword). */
export async function deleteUserById(id, { requesterId, currentAdminPassword }) {
  const res = await API.delete(`/users/${id}`, { data: { requesterId, currentAdminPassword } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania użytkownika');
  return true;
}

/** Autocomplete użytkowników (do filtrów). */
export async function getUserOptions(query = '', limit = 20) {
  const res = await API.get('/users/options', { params: { query, limit } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania użytkowników');
  return res.data.data.options; // [{id,label}]
}

/** EDYCJA profilu: email/username/firstName/lastName (bez hasła/roli). */
export async function updateUserProfile(id, patch) {
  const res = await API.put(`/users/${id}`, patch);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd edycji użytkownika');
  return res.data.data.user;
}

