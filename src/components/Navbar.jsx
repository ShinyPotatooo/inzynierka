import React, { useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/inventory">Magazyn</Link>
      {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      <Link to="/">Wyloguj</Link>
    </nav>
  );
}

