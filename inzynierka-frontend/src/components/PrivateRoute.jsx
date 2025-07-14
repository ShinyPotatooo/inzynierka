import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  // Brak użytkownika - przekieruj na login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Brak wymaganej roli - przekieruj na login
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;

