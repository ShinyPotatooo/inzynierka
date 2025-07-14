import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/inventory">Magazyn</NavLink>
      <NavLink to="/products">Produkty</NavLink> {/* ✅ DODANE */}
      <NavLink to="/admin">Admin</NavLink>
      <button onClick={handleLogout} style={{ marginLeft: '1rem' }}>
        Wyloguj
      </button>
    </nav>
  );
}



