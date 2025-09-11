import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getNotification, markNotificationUnread, markNotificationRead } from '../services/notifications';
import { toast } from 'react-toastify';

export default function NotificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [n, setN] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getNotification(Number(id), {
        userId: user?.id,
        role: user?.role || 'all',
        markRead: true, // ⬅️ auto-READ przy wejściu
      });
      setN(data || null);
      // zaktualizuj dzwonek
      window.dispatchEvent(new Event('notifications:update'));
    } catch (e) {
      toast.error(e.message || 'Nie udało się pobrać szczegółów');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id, user?.role]);

  const toggleRead = async () => {
    if (!n) return;
    try {
      if (n.isReadForUser) {
        await markNotificationUnread(n.id, user?.id);
        setN({ ...n, isReadForUser: false });
      } else {
        await markNotificationRead(n.id, user?.id);
        setN({ ...n, isReadForUser: true });
      }
      window.dispatchEvent(new Event('notifications:update'));
    } catch (e) {
      toast.error(e.message || 'Operacja nie powiodła się');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Ładowanie…</div>;
  if (!n) return <div style={{ padding: '2rem' }}>Nie znaleziono powiadomienia</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Wróć</button>

      <h1 style={{ margin: 0 }}>{n.title}</h1>
      <div style={{ color: '#666', marginBottom: 16 }}>
        {new Date(n.createdAt).toLocaleString()} • {n.type} • Priorytet: {n.priority}
      </div>

      <div style={{
        background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 16
      }}>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{n.message}</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {n.product ? (
          <Link to={`/products/${n.product.id}`}>Przejdź do produktu: {n.product.name}{n.product.sku ? ` (${n.product.sku})` : ''}</Link>
        ) : <span>Brak powiązanego produktu</span>}
      </div>

      {/* (opcjonalnie) meta */}
      {n.metadata && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Dodatkowe dane</div>
          <pre style={{ margin: 0, background: '#111', color: '#ddd', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(n.metadata, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
        <button onClick={toggleRead}>
          {n.isReadForUser ? 'Oznacz jako nieprzeczytane' : 'Oznacz jako przeczytane'}
        </button>
        <button onClick={() => navigate('/notifications')}>Przejdź do listy</button>
      </div>
    </div>
  );
}
