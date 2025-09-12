import API from './api';

/** Lista użytkowników (paginacja) */
export async function listUsers({ page = 1, limit = 100, role } = {}) {
  const params = { page, limit };
  // nie doklejaj role, jeśli brak konkretnej wartości
  if (role != null && role !== '' && role !== 'all') params.role = role;

  const res = await API.get('/users', { params });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania użytkowników');
  return res.data.data; // { users, pagination }
}

export async function createUser({ email, username, firstName, lastName, role = 'worker', password, mustChangePassword }) {
  const res = await API.post('/users', { email, username, firstName, lastName, role, password, mustChangePassword });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd dodawania użytkownika');
  return res.data.data.user;
}

export async function updateUserRole(id, { role }) {
  const res = await API.put(`/users/${id}`, { role });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd zmiany roli');
  return res.data.data.user;
}

export async function setUserPassword(id, { password, requesterId, currentAdminPassword, currentPassword }) {
  const res = await API.put(`/users/${id}`, { password, requesterId, currentAdminPassword, currentPassword });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd ustawiania hasła');
  return res.data.data.user;
}

export async function deleteUserById(id, { requesterId, currentAdminPassword }) {
  const res = await API.delete(`/users/${id}`, { data: { requesterId, currentAdminPassword } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania użytkownika');
  return true;
}

export async function updateUserProfile(id, patch) {
  const res = await API.put(`/users/${id}`, patch);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd edycji użytkownika');
  return res.data.data.user;
}

export async function getUserOptions(query = '', limit = 20) {
  const res = await API.get('/users/options', { params: { query, limit } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania użytkowników');
  return res.data.data.options;
}
