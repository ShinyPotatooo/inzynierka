// src/components/Navbar.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUnreadCount } from '../services/notifications';

export default function Navbar() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const timer = useRef(null);

  async function refreshUnread() {
    try {
      const count = await getUnreadCount(user?.role); // ⬅️ przekaż rolę
      setUnread(count);
    } catch {
      // cicho — licznik nie powinien crashować navbaru
    }
  }

  useEffect(() => {
    refreshUnread();
    timer.current = setInterval(refreshUnread, 30000);
    const onFocus = () => refreshUnread();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer.current);
      window.removeEventListener('focus', onFocus);
    };
    // zależność od roli – jeśli się zmieni (login/zmiana roli), przelicz
  }, [user?.role]);

  const linkStyle = ({ isActive }) => ({
    color: isActive ? '#fff' : '#e5e7eb',
    textDecoration: 'none',
    padding: '8px 10px',
    borderRadius: 6,
    background: isActive ? 'rgba(255,255,255,.12)' : 'transparent'
  });

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: '#282c34', color: '#fff' }}>
      <div style={{ fontWeight: 800 }}>WMS</div>
      <NavLink to="/inventory" style={linkStyle}>Magazyn</NavLink>
      <NavLink to="/inventory/operations" style={linkStyle}>Operacje</NavLink>
      <NavLink to="/products" style={linkStyle}>Produkty</NavLink>
      <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
      {user?.role === 'admin' && <NavLink to="/admin" style={linkStyle}>Admin</NavLink>}

      <div
        onClick={() => navigate('/notifications')}
        title="Powiadomienia"
        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
      >
        <span aria-hidden="true" style={{ fontSize: 18 }}>🔔</span>
        {unread > 0 && (
          <span style={{
            background: '#ef4444', color: '#fff', borderRadius: 999,
            padding: '2px 8px', fontSize: 12, fontWeight: 700, minWidth: 22, textAlign: 'center'
          }}>
            {unread}
          </span>
        )}
      </div>

      <div style={{ marginLeft: 12, opacity: .9, fontSize: 13 }}>
        {user ? `${user.firstName || ''} ${user.lastName || ''} (${user.role})` : '—'}
      </div>
    </div>
  );
}


