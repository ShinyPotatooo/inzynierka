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

export async function getProductOptions(query = '', limit = 20) {
  const res = await API.get('/products/options', { params: { query, limit } });
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania opcji produktów');
  return res.data.data.options; // [{id,label}]
}

export async function getProductById(id) {
  const res = await API.get(`/products/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania produktu');
  return res.data.data.product;
}
