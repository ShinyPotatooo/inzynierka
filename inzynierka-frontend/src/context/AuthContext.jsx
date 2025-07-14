// src/context/AuthContext.jsx
import { createContext, useEffect, useState } from 'react';
import { getCurrentUser, logout as apiLogout } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getCurrentUser());

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  useEffect(() => {
    console.log("🧠 AuthContext -> user:", user);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};






