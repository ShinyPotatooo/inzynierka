// src/components/Navbar.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUnreadCount } from '../services/notifications';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const timer = useRef(null);
  const inFlight = useRef(null);

  async function refreshUnread() {
    try {
      if (!user?.id) { setUnread(0); return; }
      // anuluj poprzednie żądanie (jeśli jeszcze trwa)
      if (inFlight.current?.abort) inFlight.current.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;

      const count = await getUnreadCount({
        userId: user.id,
        role: user.role || 'all',
        signal: ctrl.signal,
      });
      setUnread((prev) => (prev !== count ? count : prev));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('🔔 unread refresh failed:', e?.message || e);
      }
    }
  }

  useEffect(() => {
    refreshUnread();
    // odświeżanie co 30s
    timer.current = setInterval(refreshUnread, 30000);

    const onFocus = () => refreshUnread();
    const onBcast = () => refreshUnread();
    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications:update', onBcast);

    return () => {
      if (timer.current) clearInterval(timer.current);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications:update', onBcast);
      if (inFlight.current?.abort) inFlight.current.abort();
    };
  }, [user?.id, user?.role]);

  const linkStyle = ({ isActive }) => ({
    color: isActive ? '#fff' : '#e5e7eb',
    textDecoration: 'none',
    padding: '8px 10px',
    borderRadius: 6,
    background: isActive ? 'rgba(255,255,255,.12)' : 'transparent'
  });

  function handleLogout() {
    if (typeof logout === 'function') {
      logout();
    } else {
      // fallback: wyczyść lokalne dane i skocz do logowania (/)
      try {
        localStorage.removeItem('user');   // <- to czyta Twój axios interceptor
        localStorage.removeItem('token');  // (na wszelki wypadek)
      } catch {}
      navigate('/', { replace: true });
    }
  }

  const canSeeDictionaries = user && ['admin', 'manager'].includes(user.role);

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '10px 14px',
        background: '#282c34',
        color: '#fff'
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: .5 }}>WMS</div>

      <NavLink to="/inventory" style={linkStyle}>Magazyn</NavLink>
      <NavLink to="/inventory/operations" style={linkStyle}>Operacje</NavLink>
      <NavLink to="/products" style={linkStyle}>Produkty</NavLink>
      {canSeeDictionaries && <NavLink to="/dictionaries" style={linkStyle}>Słowniki</NavLink>}
      <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
      {user?.role === 'admin' && <NavLink to="/admin" style={linkStyle}>Admin</NavLink>}

      <button
        onClick={() => navigate('/notifications')}
        title="Powiadomienia"
        aria-label={`Powiadomienia${unread > 0 ? `: ${unread} nieprzeczytanych` : ''}`}
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          padding: 0
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 18 }}>🔔</span>
        {unread > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 12,
              fontWeight: 700,
              minWidth: 22,
              textAlign: 'center'
            }}
          >
            {unread}
          </span>
        )}
      </button>

      <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ opacity: .9, fontSize: 13 }}>
          {user ? `${user.firstName || ''} ${user.lastName || ''} (${user.role})` : '—'}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer'
          }}
        >
          Wyloguj
        </button>
      </div>
    </div>
  );
}
