import axios from 'axios';

export const createProduct = async (product) => {
  const response = await axios.post('http://localhost:3001/api/products', product);
  return response.data.data.product;
};

