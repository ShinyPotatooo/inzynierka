import React, { useEffect, useState, useContext } from 'react';
import { toast } from 'react-toastify';
import {
  listNotifications,
  markNotificationRead,
  markAllRead,          // ⬅️ poprawna nazwa eksportu
  deleteNotification,
} from '../services/notifications';
import { AuthContext } from '../context/AuthContext';

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString();
}

export default function NotificationsPage() {
  const { user } = useContext(AuthContext);

  // lista
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });

  // filtry
  const [type, setType] = useState('');            // low_stock, expiry_warning, system_alert, user_activity
  const [priority, setPriority] = useState('');    // low, medium, high, urgent
  const [readFilter, setReadFilter] = useState('unread'); // '', 'unread', 'read'

  async function load(page = 1) {
    try {
      setLoading(true);
      const { notifications, pagination } = await listNotifications({
        page,
        limit: pagination.itemsPerPage || 20,
        type: type || undefined,
        priority: priority || undefined,
        isRead:
          readFilter === ''
            ? undefined
            : readFilter === 'unread'
            ? false
            : true,
      });
      setItems(notifications);
      setPagination(pagination);
    } catch (e) {
      console.error(e);
      toast.error('Błąd sieci lub serwera');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, priority, readFilter]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      await load(pagination.currentPage);
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się oznaczyć jako przeczytane');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Usunąć to powiadomienie?')) return;
    try {
      await deleteNotification(id);
      await load(pagination.currentPage);
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się usunąć powiadomienia');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead(user?.role);  // opcjonalnie przekaż rolę (endpoint wspiera targetRole)
      toast.success('Oznaczono wszystkie jako przeczytane');
      await load(pagination.currentPage);
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się oznaczyć wszystkich');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Powiadomienia</h1>

      {/* FILTRY */}
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 16px' }}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Wszystkie</option>
          <option value="low_stock">Niski stan</option>
          <option value="expiry_warning">Zbliżający się termin</option>
          <option value="system_alert">Alert systemowy</option>
          <option value="user_activity">Aktywność użytkownika</option>
        </select>

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Wszystkie</option>
          <option value="low">Niski</option>
          <option value="medium">Średni</option>
          <option value="high">Wysoki</option>
          <option value="urgent">Pilny</option>
        </select>

        <select value={readFilter} onChange={(e) => setReadFilter(e.target.value)}>
          <option value="unread">Nieprzeczytane</option>
          <option value="">Wszystkie</option>
          <option value="read">Przeczytane</option>
        </select>

        <button onClick={handleMarkAll} style={{ marginLeft: 'auto' }}>
          Oznacz wszystkie jako przeczytane
        </button>
      </div>

      {/* TABELA */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={th}>Data</th>
              <th style={th}>Typ</th>
              <th style={th}>Tytuł</th>
              <th style={th}>Produkt</th>
              <th style={th}>Priorytet</th>
              <th style={th}>Status</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ padding: 14, textAlign: 'center' }}>
                  Brak powiadomień
                </td>
              </tr>
            )}
            {items.map((n) => (
              <tr key={n.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{formatDate(n.createdAt)}</td>
                <td style={td}>{n.type || '—'}</td>
                <td style={td}>{n.title}</td>
                <td style={td}>{n.product ? `${n.product.name} (${n.product.sku})` : '—'}</td>
                <td style={td}>{n.priority}</td>
                <td style={td}>{n.isRead ? 'Przeczytane' : 'Nieprzeczytane'}</td>
                <td style={td}>
                  {!n.isRead && (
                    <button onClick={() => handleMarkRead(n.id)} style={{ marginRight: 6 }}>
                      Oznacz jako przeczytane
                    </button>
                  )}
                  <button onClick={() => handleDelete(n.id)}>Usuń</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINACJA */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button onClick={() => load(1)} disabled={pagination.currentPage === 1}>
            ⏮
          </button>
          <button onClick={() => load(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}>
            ◀
          </button>
          <span>
            {pagination.currentPage} / {pagination.totalPages}
          </span>
          <button
            onClick={() => load(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
          >
            ▶
          </button>
          <button
            onClick={() => load(pagination.totalPages)}
            disabled={pagination.currentPage === pagination.totalPages}
          >
            ⏭
          </button>
        </div>
      )}

      {loading && <div style={{ marginTop: 8, color: '#666' }}>Ładowanie…</div>}
    </div>
  );
}

const th = { textAlign: 'left', padding: '10px 8px', fontWeight: 600 };
const td = { padding: '8px' };

