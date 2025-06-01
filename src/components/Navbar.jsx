import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/inventory">Magazyn</Link>
      <Link to="/">Wyloguj</Link>
    </nav>
  );
}
