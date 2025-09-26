import React, { useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { composeAdminManagerMessage } from '../services/notifications';
import { getUserOptions } from '../services/users';

const PRIORITIES = [
  { value: 'low',    label: 'Niski'  },
  { value: 'medium', label: 'Średni' },
  { value: 'high',   label: 'Wysoki' },
  { value: 'urgent', label: 'Pilny'  },
];

export default function AdminComposeNotification() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const canSend = user && ['admin', 'manager'].includes(user.role);
  const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Manager';

  const [title, setTitle]       = useState('');
  const [message, setMessage]   = useState('');
  const [priority, setPriority] = useState('medium');

  // Adresowanie
  const [audience, setAudience]         = useState('all'); // 'all'|'manager'|'worker'|'user'
  const [userQuery, setUserQuery]       = useState('');
  const [userList, setUserList]         = useState([]);
  const [recipientId, setRecipientId]   = useState(null);
  const debounce = useRef(null);

  const [saving, setSaving] = useState(false);

  if (!canSend) {
    return (
      <div className="page">
        <h1>Nowe powiadomienie</h1>
        <p>Brak uprawnień. Opcja dostępna dla ról <b>admin</b> i <b>manager</b>.</p>
      </div>
    );
  }

  // Autocomplete użytkownika
  const onUserInput = (v) => {
    setUserQuery(v);
    setRecipientId(null);
    if (debounce.current) clearTimeout(debounce.current);

    const q = v.trim();
    if (q.length < 2) { setUserList([]); return; }

    debounce.current = setTimeout(async () => {
      try {
        const opts = await getUserOptions(q, 12);
        setUserList(opts || []);
      } catch {
        setUserList([]);
      }
    }, 250);
  };

  const resolvePickedUserId = (label) => {
    const n = String(label || '').toLowerCase().trim();
    const exact = userList.find(o => String(o.label || '').toLowerCase().trim() === n);
    return exact?.id ?? null;
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    try {
      if (!title.trim() || !message.trim()) {
        toast.error('Podaj tytuł i treść wiadomości');
        return;
      }
      if (audience === 'user') {
        const uid = resolvePickedUserId(userQuery);
        if (!uid) {
          toast.error('Wybierz odbiorcę z listy');
          return;
        }
        setRecipientId(uid);
      }

      setSaving(true);
      await composeAdminManagerMessage({
        title: title.trim().slice(0, 200),
        message: message.trim(),
        priority,
        audience,
        recipientId: audience === 'user' ? resolvePickedUserId(userQuery) : null,
      });

      toast.success(`Wiadomość wysłana (${roleLabel})`);
      navigate('/notifications');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Nie udało się utworzyć powiadomienia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <h1>Nowe powiadomienie ({roleLabel})</h1>

      <form onSubmit={submit} className="card">
        <div className="grid">
          <div className="field">
            <label>Tytuł</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>

          <div className="field">
            <label>Priorytet</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Treść</label>
          <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>

        <fieldset className="fieldset">
          <legend>Adresaci</legend>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Tryb</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">Wszyscy</option>
              <option value="manager">Tylko managerowie</option>
              <option value="worker">Tylko pracownicy</option>
              <option value="user">Pojedynczy użytkownik…</option>
            </select>
          </div>

          {audience === 'user' && (
            <div className="field" style={{ maxWidth: 560 }}>
              <label>Wybierz użytkownika (imię/nazwisko/nick/email)</label>
              <input
                list="user-options"
                value={userQuery}
                onChange={(e) => onUserInput(e.target.value)}
                placeholder="np. Jan Kowalski / j.kowalski / jan@example.com"
              />
              <datalist id="user-options">
                {userList.map(o => <option key={o.id} value={o.label} />)}
              </datalist>
              <small style={{ color: '#6b7280' }}>Wybierz pozycję z listy — ID zostanie rozpoznane automatycznie.</small>
            </div>
          )}
        </fieldset>

        <div className="actions">
          <button type="button" onClick={() => navigate(-1)} disabled={saving}>Anuluj</button>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Wysyłanie…' : 'Wyślij'}
          </button>
        </div>
      </form>

      <style>{`
        .page { padding: 16px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px; max-width:860px; }
        .grid { display:grid; grid-template-columns: 1fr 220px; gap:12px; }
        .field { margin-bottom:12px; }
        .field label { display:block; font-weight:600; margin-bottom:6px; }
        .field input, .field select, .field textarea { width:100%; }
        .fieldset { border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin:12px 0; }
        .fieldset legend { padding:0 6px; color:#374151; }
        .actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
        .primary { background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:8px; }
      `}</style>
    </div>
  );
}
