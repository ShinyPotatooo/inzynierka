import API from './api';

/** Pomocniczo: autoStatus po ILOŚCI (quantity) — zwraca 'empty' | 'low' | null */
function computeAutoStatusByQuantity(row) {
  const qty = Number(row?.quantity ?? 0);
  if (qty === 0) return 'empty';
  const min = Number(row?.product?.minStockLevel ?? row?.product?.reorderPoint ?? 0) || 0;
  if (min > 0 && qty <= min) return 'low';
  return null; // było 'ok' -> zmieniamy na null, żeby nic nie renderować
}

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
      flowStatus: params.flowStatus || undefined,
    },
  });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania listy');

  const { inventoryItems, pagination } = res.data.data || {};
  const items = Array.isArray(inventoryItems)
    ? inventoryItems.map((it) => {
        // jeśli backend nie ma autoStatus, policz lokalnie
        let auto = it?.autoStatus ?? computeAutoStatusByQuantity(it);
        // jeżeli backend jednak zwrócił 'ok', zamieniamy na null (brak badge)
        if (auto === 'ok') auto = null;
        return { ...it, autoStatus: auto };
      })
    : [];

  return {
    items,
    pagination:
      pagination || {
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

/** Operacja magazynowa (in/out) */
export async function createInventoryOperation(payload) {
  const res = await API.post('/inventory/operations', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia operacji');
  return res.data.data.operation;
}

/** Transfer między lokalizacjami */
export async function createInventoryTransfer(payload) {
  const res = await API.post('/inventory/transfer', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd transferu');
  return res.data.data;
}

/** Odbiór z tranzytu (flowStatus: in_transit -> available, bez zmiany ilości) */
export async function receiveInTransit(payload) {
  const res = await API.post('/inventory/receive', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd oznaczenia odbioru');
  return res.data.data;
}

/** Alias dla legacy */
export async function transferInventory(payload) {
  return createInventoryTransfer(payload);
}

/** Dashboard summary */
export async function getInventorySummary() {
  const res = await API.get('/inventory/summary');
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania podsumowania');
  return res.data.data.summary;
}
