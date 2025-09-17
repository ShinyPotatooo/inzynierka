import API from './api';

/** Lista pozycji magazynowych z paginacją */
export async function fetchInventoryItems(params = {}) {
  const res = await API.get('/inventory', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      productId: params.productId || undefined,
      location: params.location || undefined,
      condition: params.condition || undefined,
      supplier: params.supplier || undefined,
      lowStock: params.lowStock ?? undefined,
      flowStatus: params.flowStatus || undefined, // <= NOWE
    },
  });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania listy');
  const { inventoryItems, pagination } = res.data.data || {};
  return {
    items: inventoryItems || [],
    pagination: pagination || {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: params.limit ?? 50,
    },
  };
}

/** Szczegóły pozycji */
export async function getInventoryItem(id) {
  const res = await API.get(`/inventory/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania pozycji');
  return res.data.data.inventoryItem;
}

/** Utworzenie pozycji */
export async function createInventoryItem(payload) {
  const res = await API.post('/inventory', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia pozycji');
  return res.data.data.inventoryItem;
}

/** Aktualizacja pozycji */
export async function updateInventoryItem(id, payload) {
  const res = await API.put(`/inventory/${id}`, payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd aktualizacji pozycji');
  return res.data.data.inventoryItem;
}

/** Usunięcie pozycji */
export async function deleteInventoryItem(id) {
  const res = await API.delete(`/inventory/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania pozycji');
  return true;
}

/** Utworzenie operacji magazynowej (in/out/transfer/adjustment...) */
export async function createInventoryOperation(payload) {
  const res = await API.post('/inventory/operations', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia operacji');
  return res.data.data.operation;
}

/** Backendowy skrót do statystyk (Dashboard) */
export async function getInventorySummary() {
  const res = await API.get('/inventory/summary');
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania podsumowania');
  return res.data.data.summary;
}
