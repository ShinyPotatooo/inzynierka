// src/services/locations.js
import API from './api';

const clean = (o = {}) =>
  Object.fromEntries(Object.entries(o).filter(([_, v]) => v !== '' && v !== null && v !== undefined));

export async function getLocationOptions(query = '', limit = 20) {
  const res = await API.get('/dictionaries/locations/options', { params: { query, limit } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania lokalizacji');
  return res.data.data.options;
}

export async function ensureLocation(name) {
  const res = await API.post('/dictionaries/locations/ensure', { name });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia lokalizacji');
  return res.data.data.location;
}

// CRUD do widoku słownika
export async function listLocations(params = {}) {
  const res = await API.get('/dictionaries/locations', { params: clean(params) });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania lokalizacji');
  return res.data.data;
}
export async function createLocation(payload) {
  const res = await API.post('/dictionaries/locations', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia lokalizacji');
  return res.data.data.item;
}
export async function updateLocation(id, payload) {
  const res = await API.put(`/dictionaries/locations/${id}`, payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd edycji lokalizacji');
  return res.data.data.item;
}
export async function deleteLocation(id) {
  const res = await API.delete(`/dictionaries/locations/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania lokalizacji');
  return true;
}
