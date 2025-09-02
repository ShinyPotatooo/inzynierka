// src/services/products.js
import API from './api';

export async function listProducts({ page = 1, limit = 10, search = '' } = {}) {
  const res = await API.get('/products', { params: { page, limit, search } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania produktów');
  return res.data.data; // { products, pagination }
}

export async function createProduct(payload) {
  const res = await API.post('/products', payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd tworzenia produktu');
  return res.data.data.product;
}

export async function updateProduct(id, payload) {
  const res = await API.put(`/products/${id}`, payload);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd aktualizacji produktu');
  return res.data.data.product;
}

export async function deleteProduct(id) {
  const res = await API.delete(`/products/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd usuwania produktu');
  return true;
}

/** Podpowiedzi (nazwa/SKU) */
export async function getProductOptions(query = '', limit = 20, opts = {}) {
  const q = String(query).trim();
  if (q.length < 2) return [];
  const res = await API.get('/products/options', {
    params: { query: q, limit },
    signal: opts.signal,
  });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania opcji produktów');
  return res.data.data.options; // [{ id, label }]
}

/** Pojedynczy produkt */
export async function getProductById(id) {
  if (!id) throw new Error('Brak identyfikatora produktu'); // <-- zabezpieczenie
  const res = await API.get(`/products/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania produktu');
  return res.data.data.product;
}
