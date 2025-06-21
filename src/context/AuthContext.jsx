import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('token');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) {
      setUser({ email: token.email, role: token.role });
    }
  }, [token]);

  const login = (data) => {
    localStorage.setItem('token', JSON.stringify(data));
    setToken(data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

