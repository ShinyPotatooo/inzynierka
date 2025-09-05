// src/services/categories.js
import API from './api';

const clean = (o = {}) =>
  Object.fromEntries(Object.entries(o).filter(([_, v]) => v !== '' && v !== null && v !== undefined));

export async function getCategoryOptions(query = '', limit = 20) {
  const res = await API.get('/dictionaries/categories/options', { params: { query, limit } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania kategorii');
  return res.data.data.options; // [{id,label}]
}

export async function ensureCategory(name) {
  const res = await API.post('/dictionaries/categories/ensure', { name });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia kategorii');
  return res.data.data.category;
}

// CRUD do widoku słownika
export async function listCategories(params = {}) {
  const res = await API.get('/dictionaries/categories', { params: clean(params) });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania kategorii');
  return res.data.data; // {items, pagination}
}
export async function createCategory(payload) {
  const res = await API.post('/dictionaries/categories', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia kategorii');
  return res.data.data.item;
}
export async function updateCategory(id, payload) {
  const res = await API.put(`/dictionaries/categories/${id}`, payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd edycji kategorii');
  return res.data.data.item;
}
export async function deleteCategory(id) {
  const res = await API.delete(`/dictionaries/categories/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania kategorii');
  return true;
}
