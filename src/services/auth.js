import API from './api'; // zakładamy że axios z baseURL już masz

export const loginUser = async (credentials) => {
  const response = await API.post('/auth/login', credentials);
  return response.data.token; // oczekujemy że backend zwraca token
};
