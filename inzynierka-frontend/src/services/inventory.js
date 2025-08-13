// src/services/inventory.js
import API from './api';

/** Pobierz listę pozycji magazynowych */
export async function fetchInventoryItems(params = {}) {
  const res = await API.get('/inventory', { params });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania magazynu');
  return res.data.data.inventoryItems;
}

/** Utwórz nową pozycję magazynową */
export async function createInventoryItem(payload) {
  const res = await API.post('/inventory', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia pozycji');
  return res.data.data.inventoryItem;
}

/** Zaktualizuj pozycję magazynową */
export async function updateInventoryItem(id, payload) {
  const res = await API.put(`/inventory/${id}`, payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd aktualizacji pozycji');
  return res.data.data.inventoryItem;
}

/** Usuń pozycję magazynową */
export async function deleteInventoryItem(id) {
  const res = await API.delete(`/inventory/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania pozycji');
  return res.data.data.message;
}

