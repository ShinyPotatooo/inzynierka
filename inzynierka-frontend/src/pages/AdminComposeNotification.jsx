// src/pages/AdminComposeNotification.jsx
import React, { useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { createSystemMessage } from '../services/notifications';
import { getProductOptions } from '../services/products';
import { getUserOptions } from '../services/users';

const PRIORITIES = [
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
  { value: 'urgent', label: 'Pilny' },
];
const ROLES = [
  { value: 'all', label: 'Wszyscy' },
  { value: 'worker', label: 'Pracownicy' },
  { value: 'manager', label: 'Managerowie' },
  { value: 'admin', label: 'Admini' },
];

function nowLocalDatetimeValue(deltaMin = 0) {
  const d = new Date(Date.now() + deltaMin * 60000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminComposeNotification() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const canSend = useMemo(
    () => ['admin', 'manager'].includes(String(user?.role || '').toLowerCase()),
    [user]
  );

  // formularz
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');

  // adresat (rola vs user-by-name)
  const [audienceMode, setAudienceMode] = useState('role'); // 'role' | 'user'
  const [targetRole, setTargetRole] = useState('all');

  // wybór użytkownika po nazwie (datalist)
  const [userQuery, setUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const userDebounce = useRef(null);

  // produkt (opcjonalnie)
  const [productInput, setProductInput] = useState('');
  const [productId, setProductId] = useState(null);
  const [prodOptions, setProdOptions] = useState([]);
  const prodDebounce = useRef(null);

  // planowanie (opcjonalnie)
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(nowLocalDatetimeValue());

  const [saving, setSaving] = useState(false);

  if (!canSend) {
    return (
      <div className="page">
        <h1>Nowe powiadomienie</h1>
        <p>Brak uprawnień. Opcja dostępna dla ról <strong>admin</strong> i <strong>manager</strong>.</p>
      </div>
    );
  }

  const enforcedType = String(user?.role || '').toLowerCase() === 'admin'
    ? 'admin_message'
    : 'manager_message';

  /* --------- USER AUTOCOMPLETE ---------- */
  const onUserInput = (val) => {
    setUserQuery(val);
    setSelectedUserId(null);

    const q = String(val || '').trim();
    if (userDebounce.current) clearTimeout(userDebounce.current);

    if (q.length < 2) {
      setUserOptions([]);
      return;
    }
    userDebounce.current = setTimeout(async () => {
      try {
        const opts = await getUserOptions(q, 20);
        setUserOptions(opts || []);
        // jeżeli pojedyncze dopasowanie – wybierz
        if ((opts || []).length === 1) setSelectedUserId(opts[0].id);
      } catch {
        setUserOptions([]);
      }
    }, 250);
  };

  const resolveUserIdFromLabel = (label) => {
    const n = String(label || '').toLowerCase().trim();
    const exact = (userOptions || []).find(
      (o) => String(o.label || '').toLowerCase().trim() === n
    );
    return exact?.id ?? null;
  };

  /* --------- PRODUCT AUTOCOMPLETE ---------- */
  const onProductInput = (v) => {
    setProductInput(v);
    setProductId(null);
    const q = v.trim();
    if (prodDebounce.current) clearTimeout(prodDebounce.current);

    if (q.length < 2) {
      setProdOptions([]);
      return;
    }
    prodDebounce.current = setTimeout(async () => {
      try {
        const opts = await getProductOptions(q, 15);
        setProdOptions(opts || []);
      } catch (_) {
        setProdOptions([]);
      }
    }, 250);
  };
  const resolveProductIdFromLabel = (label) => {
    const n = String(label || '').toLowerCase().trim();
    const exact = (prodOptions || []).find(
      (o) => String(o.label || '').toLowerCase().trim() === n
    );
    return exact?.id ?? null;
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    try {
      if (!title.trim() || !message.trim()) {
        toast.error('Podaj tytuł i treść wiadomości');
        return;
      }

      const payload = {
        authorId: user?.id,
        role: user?.role,             // backend wymusi typ na admin_message/manager_message
        title: title.trim().slice(0, 200),
        message: message.trim(),
        priority,
        metadata: { uiType: enforcedType },
      };

      if (audienceMode === 'role') {
        payload.targetRole = targetRole;
      } else {
        const uid = selectedUserId || resolveUserIdFromLabel(userQuery);
        if (!uid) {
          toast.error('Wybierz użytkownika z listy (po nazwie)');
          return;
        }
        payload.targetUserId = uid;
      }

      const resolvedProductId = productId || resolveProductIdFromLabel(productInput);
      if (resolvedProductId) payload.productId = resolvedProductId;

      if (schedule && when) {
        payload.scheduledAt = new Date(when).toISOString();
      }

      setSaving(true);
      await createSystemMessage(payload);
      toast.success('Powiadomienie utworzone');
      // poinformuj navbar o możliwej zmianie licznika
      window.dispatchEvent(new Event('notifications:update'));
      navigate('/notifications');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Błąd tworzenia powiadomienia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <h1>Nowe powiadomienie</h1>

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

          <div className="field">
            <label>Typ</label>
            <input value={enforcedType} disabled readOnly />
            <small style={{ color: '#64748b' }}>
              Typ jest ustawiany automatycznie na podstawie Twojej roli.
            </small>
          </div>
        </div>

        <div className="field">
          <label>Treść</label>
          <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>

        <fieldset className="fieldset">
          <legend>Adresaci</legend>

          <div className="row" style={{ gap: 16 }}>
            <label className="radio">
              <input
                type="radio"
                checked={audienceMode === 'role'}
                onChange={() => setAudienceMode('role')}
              />
              <span>Po roli</span>
            </label>
            <label className="radio">
              <input
                type="radio"
                checked={audienceMode === 'user'}
                onChange={() => setAudienceMode('user')}
              />
              <span>Konkretny użytkownik (po nazwie)</span>
            </label>
          </div>

          {audienceMode === 'role' ? (
            <div className="field" style={{ maxWidth: 280, marginTop: 8 }}>
              <label>Rola docelowa</label>
              <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          ) : (
            <div className="field" style={{ maxWidth: 420, marginTop: 8 }}>
              <label>Użytkownik (wpisz imię/nazwę i wybierz z listy)</label>
              <input
                list="user-options"
                value={userQuery}
                onChange={(e) => onUserInput(e.target.value)}
                placeholder="np. Jan Kowalski (jkowalski)"
              />
              <datalist id="user-options">
                {(userOptions || []).map(o => <option key={o.id} value={o.label} />)}
              </datalist>
              <small style={{ color: '#64748b' }}>
                Odbiorca zostanie rozpoznany po wybraniu pozycji z listy.
              </small>
            </div>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend>Powiązanie z produktem (opcjonalnie)</legend>
          <div className="field" style={{ maxWidth: 520 }}>
            <label>Szukaj produktu (nazwa lub SKU)</label>
            <input
              list="product-options"
              value={productInput}
              onChange={(e) => onProductInput(e.target.value)}
              placeholder="np. Monitor (MONITOR-001)"
            />
            <datalist id="product-options">
              {prodOptions.map(o => <option key={o.id} value={o.label} />)}
            </datalist>
            <small style={{ color: '#64748b' }}>
              Zostanie zapisany produkt wskazany z listy, jeśli nazwa dokładnie pasuje.
            </small>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Planowanie (opcjonalnie)</legend>
          <label className="row">
            <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
            <span>Wyślij w określonym czasie</span>
          </label>
          <div className="field" style={{ maxWidth: 260, marginTop: 8 }}>
            <label>Data i czas</label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              disabled={!schedule}
            />
          </div>
        </fieldset>

        <div className="actions">
          <button type="button" onClick={() => navigate(-1)} disabled={saving}>Anuluj</button>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Wysyłanie…' : 'Wyślij / Zapisz'}
          </button>
        </div>
      </form>

      <style>{`
        .page { padding: 16px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px; max-width:920px; }
        .grid { display:grid; grid-template-columns: 1fr 200px 220px; gap:12px; }
        .field { margin-bottom:12px; }
        .field label { display:block; font-weight:600; margin-bottom:6px; }
        .field input, .field select, .field textarea { width:100%; }
        .fieldset { border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin:12px 0; }
        .fieldset legend { padding:0 6px; color:#374151; }
        .row { display:flex; align-items:center; gap:8px; }
        .radio { display:flex; align-items:center; gap:6px; }
        .actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
        .primary { background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:8px; }
      `}</style>
    </div>
  );
}
