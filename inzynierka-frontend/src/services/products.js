// src/services/products.js
import API from './api';

export const createProduct = async (product) => {
  const response = await API.post('/products', product);
  return response.data.data.product;
};

// Dodaj pozostałe metody CRUD jeśli potrzebne
export const fetchProducts = async () => {
  const response = await API.get('/products');
  return response.data.data.products;
};

export const updateProduct = async (id, product) => {
  const response = await API.put(`/products/${id}`, product);
  return response.data.data.product;
};

export const deleteProduct = async (id) => {
  const response = await API.delete(`/products/${id}`);
  return response.data.data.message;
};