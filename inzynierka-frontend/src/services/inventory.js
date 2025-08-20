// src/services/inventory.js
import API from './api';

/** Pobierz listę pozycji magazynowych (z filtrami) */
export async function fetchInventoryItems(params = {}) {
  const res = await API.get('/inventory', { params: { page: 1, limit: 50, ...params } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania magazynu');
  return res.data.data.inventoryItems;
}

/** Szczegóły pozycji */
export async function getInventoryItem(id) {
  const res = await API.get(`/inventory/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania pozycji');
  return res.data.data.inventoryItem;
}

/** Utwórz pozycję */
export async function createInventoryItem(payload) {
  const res = await API.post('/inventory', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia pozycji');
  return res.data.data.inventoryItem;
}

/** Edycja pozycji (meta / ilość => rejestruje adjustment po stronie backendu) */
export async function updateInventoryItem(id, payload) {
  // Upewnij się, że liczby są liczbami
  const toSend = { ...payload };
  if (toSend.quantity !== undefined)  toSend.quantity = parseInt(toSend.quantity, 10);
  if (toSend.reservedQuantity !== undefined) toSend.reservedQuantity = parseInt(toSend.reservedQuantity, 10);

  const res = await API.put(`/inventory/${id}`, toSend);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd aktualizacji pozycji');
  return res.data.data.inventoryItem;
}

/** Usuń pozycję (tylko przy ilości 0) */
export async function deleteInventoryItem(id) {
  const res = await API.delete(`/inventory/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania pozycji');
  return true;
}

/** Utwórz operację magazynową (przyjęcie / wydanie / adjust) */
export async function createInventoryOperation(payload) {
  // sanity coercion
  const body = { ...payload, quantity: parseInt(payload.quantity, 10) };
  const res = await API.post('/inventory/operations', body);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia operacji');
  return res.data.data.operation;
}

/** Lista operacji (opcjonalnie) */
export async function listInventoryOperations(params = {}) {
  const res = await API.get('/inventory/operations', { params });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania operacji');
  return res.data.data; // { operations, pagination }
}





