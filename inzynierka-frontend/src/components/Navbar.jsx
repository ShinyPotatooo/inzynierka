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
      if (inFlight.current?.abort) inFlight.current.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;

      const count = await getUnreadCount({
        userId: user.id,
        role: user.role || 'all',
        signal: ctrl.signal, // ok jeśli w serwisie przekazujesz dalej do axiosa
      });
      setUnread(prev => (prev !== count ? count : prev));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('🔔 unread refresh failed:', e?.message || e);
      }
    }
  }

  useEffect(() => {
    refreshUnread();
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
    color: isActive ? '#ffffff' : '#e5e7eb',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 6,
    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
    fontWeight: 600,
    fontSize: 14,
    transition: 'all 0.2s',
    cursor: 'pointer',
  });

  function handleLogout() {
    if (typeof logout === 'function') {
      logout();
    } else {
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } catch {}
      navigate('/', { replace: true });
    }
  }

  const canSeeDictionaries = user && ['admin', 'manager'].includes(user.role);
  const canComposeNotification = user && ['admin', 'manager'].includes(user.role);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: '#1f2937',
        color: '#e5e7eb',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        fontSize: 14,
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: 0.5, fontSize: 18, color: '#f9fafb' }}>WMS</div>

      <NavLink to="/inventory" style={linkStyle}>Magazyn</NavLink>
      <NavLink to="/inventory/operations" style={linkStyle}>Operacje</NavLink>
      <NavLink to="/products" style={linkStyle}>Produkty</NavLink>
      {canSeeDictionaries && <NavLink to="/dictionaries" style={linkStyle}>Słowniki</NavLink>}
      <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
      {user?.role === 'admin' && <NavLink to="/admin" style={linkStyle}>Admin</NavLink>}

      {/* PRAWY BLOK AKCJI */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {canComposeNotification && (
          <button
            onClick={() => navigate('/admin/notifications/new')}
            title="Utwórz nowe powiadomienie"
            aria-label="Utwórz nowe powiadomienie"
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 10px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
          >
            + Nowe powiadomienie
          </button>
        )}

        <button
          onClick={() => navigate('/notifications')}
          title="Powiadomienia"
          aria-label={`Powiadomienia${unread > 0 ? `: ${unread} nieprzeczytanych` : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            padding: 0,
            transition: 'all 0.2s',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 20 }}>🔔</span>
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
                textAlign: 'center',
              }}
            >
              {unread}
            </span>
          )}
        </button>

        <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ opacity: 0.9, fontSize: 13 }}>
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
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#4b5563'}
            onMouseLeave={e => e.currentTarget.style.background = '#374151'}
          >
            Wyloguj
          </button>
        </div>
      </div>
    </div>
  );
}
