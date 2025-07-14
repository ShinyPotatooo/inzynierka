// src/services/inventory.js
import API from './api';

// ✅ Pobierz wszystkie elementy magazynowe
export async function fetchInventoryItems() {
  const response = await API.get('/inventory');
  return response.data.data.inventoryItems;
}

// ✅ Utwórz nowy element magazynowy
export async function createInventoryItem(item) {
  const response = await API.post('/inventory', item);
  return response.data.data.inventoryItem;
}

// ✅ Aktualizuj element magazynowy
export async function updateInventoryItem(id, updatedFields) {
  const response = await API.put(`/inventory/${id}`, updatedFields);
  return response.data.data.inventoryItem;
}

// ✅ Usuń element magazynowy
export async function deleteInventoryItem(id) {
  const response = await API.delete(`/inventory/${id}`);
  return response.data.data.message;
}
