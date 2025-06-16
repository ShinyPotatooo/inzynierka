import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // możesz rozszerzyć o role
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  useEffect(() => {
    if (token) {
      // przykład dekodowania tokena JWT
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ ...payload });
    }
  }, [token]);

  const login = (jwt) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken('');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
