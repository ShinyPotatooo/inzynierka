import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  listNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllRead,
} from '../services/notifications';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const TYPES = [
  { value: '', label: 'Wszystkie' },
  { value: 'low_stock', label: 'Niski stan' },
  { value: 'expiry_warning', label: 'Przeterminowanie' },
  { value: 'system_alert', label: 'Alert systemowy' },
  { value: 'user_activity', label: 'Aktywność użytkownika' },
];

const PRIORITIES = [
  { value: '', label: 'Wszystkie' },
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
  { value: 'urgent', label: 'Pilny' },
];

const READ_FILTER = [
  { value: 'unread', label: 'Nieprzeczytane' },
  { value: 'read', label: 'Przeczytane' },
  { value: 'all', label: 'Wszystkie' },
];

export default function NotificationsPage() {
  const { user } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();

  const typeFromUrl = params.get('type') || '';
  const priorityFromUrl = params.get('priority') || '';
  const readFromUrl = params.get('read') || 'unread';
  const pageFromUrl = Number(params.get('page') || 1);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [type, setType] = useState(typeFromUrl);
  const [priority, setPriority] = useState(priorityFromUrl);
  const [read, setRead] = useState(readFromUrl);
  const [page, setPage] = useState(pageFromUrl);

  const isReadBool = useMemo(() => {
    if (read === 'read') return true;
    if (read === 'unread') return false;
    return undefined;
  }, [read]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (type) q.set('type', type);
      if (priority) q.set('priority', priority);
      if (read !== 'all') q.set('read', read);
      if (page !== 1) q.set('page', String(page));
      setParams(q, { replace: true });

      const { notifications, pagination } = await listNotifications({
        page,
        limit: 20,
        type: type || undefined,
        priority: priority || undefined,
        isRead: typeof isReadBool === 'boolean' ? isReadBool : undefined,
        role: user?.role || 'all',
        userId: user?.id,
      });

      setRows(notifications || []);
      setPages(pagination?.totalPages || 1);
      setTotal(pagination?.totalItems || 0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error(e.message || 'Błąd sieci lub serwera');
    } finally {
      setLoading(false);
    }
  }, [type, priority, read, page, isReadBool, user?.id, user?.role, setParams]);

  useEffect(() => {
    reload();
  }, [reload]);

  const notifyNavbar = () => window.dispatchEvent(new Event('notifications:update'));

  const onRead = async (id) => {
    try {
      await markNotificationRead(id, user?.id);
      setRows(prev =>
        read === 'unread'
          ? prev.filter(r => r.id !== id)
          : prev.map(r => (r.id === id ? { ...r, isReadForUser: true } : r))
      );
      notifyNavbar();
      toast.success('Oznaczono jako przeczytane');
    } catch (e) {
      toast.error(e.message || 'Nie udało się oznaczyć');
    }
  };

  const onUnread = async (id) => {
    try {
      await markNotificationUnread(id, user?.id);
      setRows(prev =>
        read === 'read'
          ? prev.filter(r => r.id !== id)
          : prev.map(r => (r.id === id ? { ...r, isReadForUser: false } : r))
      );
      notifyNavbar();
      toast.success('Oznaczono jako nieprzeczytane');
    } catch (e) {
      toast.error(e.message || 'Nie udało się odznaczyć');
    }
  };

  const markAll = async () => {
    try {
      await markAllRead(user?.id, user?.role || 'all');
      setPage(1);
      setRead('read');
      notifyNavbar();
      reload();
    } catch (e) {
      toast.error(e.message || 'Nie udało się oznaczyć wszystkich');
    }
  };

  const startIdx = (page - 1) * 20 + 1;
  const endIdx = Math.min(page * 20, total);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Powiadomienia</h1>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
        <select value={type} onChange={(e) => { setPage(1); setType(e.target.value); }}>
          {TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }}>
          {PRIORITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={read} onChange={(e) => { setPage(1); setRead(e.target.value); }}>
          {READ_FILTER.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button onClick={markAll} style={{ marginLeft: 'auto' }}>
          Oznacz wszystkie jako przeczytane
        </button>
      </div>

      <div style={{ color: '#666', marginBottom: 8 }}>
        {total ? <>Wyświetlam {startIdx}–{endIdx} z {total}</> : <>Brak powiadomień</>}
        {loading && <span style={{ marginLeft: 8 }}>Ładowanie…</span>}
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>Data</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Typ</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Tytuł</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Produkt</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Priorytet</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 10, width: 260 }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ padding: 16 }}>Brak powiadomień</td></tr>
            )}
            {rows.map((n) => {
              const isReadForUser = !!n.isReadForUser;
              return (
                <tr key={n.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : '—'}</td>
                  <td style={{ padding: 10 }}>{n.type || '—'}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>
                      <Link
                        to={`/notifications/${n.id}`}
                        onClick={() => {
                          if (!n.isReadForUser) {
                            markNotificationRead(n.id, user?.id)
                              .then(() => {
                                setRows(prev =>
                                  read === 'unread'
                                    ? prev.filter(r => r.id !== n.id)
                                    : prev.map(r => (r.id === n.id ? { ...r, isReadForUser: true } : r))
                                );
                                notifyNavbar();
                              })
                              .catch(() => {});
                          }
                        }}
                      >
                        {n.title}
                      </Link>
                    </div>
                    <div style={{ color: '#666' }}>{n.message}</div>
                  </td>
                  <td style={{ padding: 10 }}>
                    {n.product ? (
                      <Link to={`/products/${n.product.id}`}>
                        {n.product.name}{n.product.sku ? ` (${n.product.sku})` : ''}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ padding: 10 }}>{n.priority || '—'}</td>
                  <td style={{ padding: 10 }}>{isReadForUser ? 'Przeczytane' : 'Nieprzeczytane'}</td>
                  <td style={{ padding: 10 }}>
                    {!isReadForUser ? (
                      <button onClick={() => onRead(n.id)} style={{ marginRight: 8 }}>
                        Oznacz jako przeczytane
                      </button>
                    ) : (
                      <button onClick={() => onUnread(n.id)} style={{ marginRight: 8 }}>
                        Oznacz jako nieprzeczytane
                      </button>
                    )}
                    {n.product && (
                      <Link to={`/products/${n.product.id}`} style={{ marginRight: 8 }}>
                        Otwórz produkt
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button onClick={() => setPage(1)} disabled={page === 1}>⏮</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>◀</button>
          <span>Strona {page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>▶</button>
          <button onClick={() => setPage(pages)} disabled={page === pages}>⏭</button>
        </div>
      )}
    </div>
  );
}
