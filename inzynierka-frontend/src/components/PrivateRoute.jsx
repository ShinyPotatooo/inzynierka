// src/components/PrivateRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function PrivateRoute({ children, requiredRole, allowedRoles }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  // Nie zalogowany → na login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Preferuj wielorólkowe sprawdzanie
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/inventory" replace />;
    }
  } else if (requiredRole && user.role !== requiredRole) {
    // Wstecznie zgodne: pojedyncza rola
    return <Navigate to="/inventory" replace />;
  }

  return children;
}


