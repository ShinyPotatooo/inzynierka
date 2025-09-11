// src/pages/InventoryOperationsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProductOptions } from '../services/products';
import { getUserOptions } from '../services/users';
import {
  downloadOperationsCSV,
  downloadOperationsPDF,
} from '../services/download';

const DEBOUNCE_MS = 300;

function normalize(s = '') {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}
// z etykiety "Nazwa (SKU)" wyciąga "SKU"
function extractSku(label = '') {
  const m = String(label).match(/\(([^()]+)\)\s*$/);
  return m ? m[1].trim() : null;
}
// tekst przed nawiasem
function beforeParen(label = '') {
  return String(label).split('(')[0].trim();
}
// z etykiety "Imię Nazwisko (username)" wyciąga "username"
function extractUsername(label = '') {
  const m = String(label).match(/\(([^()]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

export default function InventoryOperationsPage() {
  const [params, setParams] = useSearchParams();

  // URL -> stan
  const pageFromUrl = Number(params.get('page') || 1);
  const limitFromUrl = Number(params.get('limit') || 10);
  const productIdFromUrl = params.get('productId') || '';
  const typeFromUrl = params.get('type') || '';
  const userIdFromUrl = params.get('userId') || '';
  const startFromUrl = params.get('start') || '';
  const endFromUrl = params.get('end') || '';

  // UI
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // filtry (wewnętrzne)
  const [page, setPage] = useState(pageFromUrl);
  const [limit, setLimit] = useState(limitFromUrl);
  const [operationType, setOperationType] = useState(typeFromUrl);
  const [startDate, setStartDate] = useState(startFromUrl);
  const [endDate, setEndDate] = useState(endFromUrl);

  // produkt: osobno input (etykieta) i wybrane id
  const [productInput, setProductInput] = useState('');
  const [productId, setProductId] = useState(productIdFromUrl);
  const [productOpts, setProductOpts] = useState([]);

  // użytkownik: osobno input (etykieta) i wybrane id
  const [userInput, setUserInput] = useState('');
  const [userId, setUserId] = useState(userIdFromUrl);
  const [userOpts, setUserOpts] = useState([]);

  const [debouncedProd, setDebouncedProd] = useState(productInput);
  const [debouncedUser, setDebouncedUser] = useState(userInput);

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedProd(productInput), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [productInput]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUser(userInput), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [userInput]);

  // pomocnicze dopasowanie id po bieżących opcjach
  const findProductIdLocally = (q) => {
    const n = normalize(q);
    const sku = extractSku(q);
    let exact = productOpts.find(o => normalize(o.label) === n);
    if (exact) return exact.id;
    if (sku) {
      const bySku = productOpts.find(o => o.label.endsWith(`(${sku})`));
      if (bySku) return bySku.id;
    }
    const fuzzy = productOpts.filter(o => normalize(o.label).includes(n));
    if (fuzzy.length === 1) return fuzzy[0].id;
    return null;
  };
  const findUserIdLocally = (q) => {
    const n = normalize(q);
    const uname = extractUsername(q);
    let exact = userOpts.find(o => normalize(o.label) === n);
    if (exact) return exact.id;
    if (uname) {
      const byU = userOpts.find(o => o.label.endsWith(`(${uname})`));
      if (byU) return byU.id;
    }
    const fuzzy = userOpts.filter(o => normalize(o.label).includes(n));
    if (fuzzy.length === 1) return fuzzy[0].id;
    return null;
  };

  // pobieranie opcji produktów
  useEffect(() => {
    const q = debouncedProd.trim();
    if (q.length < 2) {
      setProductOpts([]);
      return;
    }
    (async () => {
      try {
        const search = extractSku(q) || beforeParen(q) || q;
        const list = await getProductOptions(search, 20);
        setProductOpts(list || []);
        const localId = findProductIdLocally(q);
        setProductId(prev => (localId != null ? localId : prev));
      } catch (e) {
        console.error(e);
        setProductOpts([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedProd]);

  // pobieranie opcji użytkowników
  useEffect(() => {
    const q = debouncedUser.trim();
    if (q.length < 2) {
      setUserOpts([]);
      return;
    }
    (async () => {
      try {
        const list = await getUserOptions(q, 20);
        setUserOpts(list || []);
        const localId = findUserIdLocally(q);
        setUserId(prev => (localId != null ? localId : prev));
      } catch (e) {
        console.error(e);
        setUserOpts([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUser]);

  // główne pobranie listy operacji
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // sync URL
        const next = new URLSearchParams();
        if (page !== 1) next.set('page', String(page));
        if (limit !== 10) next.set('limit', String(limit));
        if (operationType) next.set('type', operationType);
        if (productId) next.set('productId', String(productId));
        if (userId) next.set('userId', String(userId));
        if (startDate) next.set('start', startDate);
        if (endDate) next.set('end', endDate);
        setParams(next, { replace: true });

        const res = await API.get('/inventory/operations', {
          params: {
            page,
            limit,
            operationType: operationType || undefined,
            productId: productId || undefined,
            userId: userId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        });

        if (!res.data?.success) throw new Error(res.data?.error || 'Błąd pobierania operacji');

        const { operations, pagination } = res.data.data || {};
        setOps(operations || []);
        setTotal(pagination?.totalItems ?? 0);
        setPages(pagination?.totalPages || 1);
      } catch (e) {
        console.error(e);
        toast.error('Nie udało się pobrać operacji magazynowych');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, limit, operationType, productId, userId, startDate, endDate, setParams]);

  const startIdx = useMemo(() => (page - 1) * limit + 1, [page, limit]);
  const endIdx = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  // Handlery inputów
  const onProductChange = (v) => {
    setPage(1);
    setProductInput(v);
    const id = findProductIdLocally(v);
    setProductId(id || '');
  };
  const onUserChange = (v) => {
    setPage(1);
    setUserInput(v);
    const id = findUserIdLocally(v);
    setUserId(id || '');
  };

  const clearDates = () => {
    setPage(1);
    setStartDate('');
    setEndDate('');
  };
  const resetFilters = () => {
    setPage(1);
    setLimit(10);
    setOperationType('');
    setProductInput('');
    setProductId('');
    setUserInput('');
    setUserId('');
    setStartDate('');
    setEndDate('');
  };

  // Eksporty po stronie BACKENDU (pełne dane wg filtrów)
  const exportFilters = useMemo(() => ({
    search: productInput.trim() || undefined,
    type: operationType || undefined,
    user: userInput.trim() || undefined,
    dateFrom: startDate || undefined,
    dateTo: endDate || undefined,
  }), [productInput, operationType, userInput, startDate, endDate]);

  const exportCsvAll = async () => {
    try { await downloadOperationsCSV(exportFilters); }
    catch (e) { console.error(e); toast.error(e?.message || 'Błąd eksportu CSV'); }
  };
  const exportPdfAll = async () => {
    try { await downloadOperationsPDF(exportFilters); }
    catch (e) { console.error(e); toast.error(e?.message || 'Błąd eksportu PDF'); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Operacje magazynowe</h1>

      {/* Filtry */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) 160px minmax(220px, 1fr) repeat(2, 160px) 140px 120px',
          gap: 8,
          margin: '12px 0'
        }}
      >
        {/* Produkt (datalist) */}
        <input
          list="op-product-options"
          placeholder="Produkt (nazwa / SKU)"
          value={productInput}
          onChange={(e) => onProductChange(e.target.value)}
        />
        <datalist id="op-product-options">
          {productOpts.map(o => <option key={o.id} value={o.label} />)}
        </datalist>

        {/* Typ */}
        <select
          value={operationType}
          onChange={(e) => { setPage(1); setOperationType(e.target.value); }}
        >
          <option value="">Typ: dowolny</option>
          <option value="in">Przyjęcie (in)</option>
          <option value="out">Wydanie (out)</option>
          <option value="transfer">Transfer</option>
          <option value="adjustment">Korekta</option>
          <option value="reservation">Rezerwacja</option>
          <option value="release">Zwolnienie</option>
        </select>

        {/* Użytkownik (datalist) */}
        <input
          list="op-user-options"
          placeholder="Użytkownik (imię / nazwisko / login / email)"
          value={userInput}
          onChange={(e) => onUserChange(e.target.value)}
        />
        <datalist id="op-user-options">
          {userOpts.map(o => <option key={o.id} value={o.label} />)}
        </datalist>

        {/* Daty */}
        <input type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} />
        <input type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} />
        <button onClick={clearDates}>Wyczyść daty</button>

        {/* Limit + Reset */}
        <select value={limit} onChange={e => { setPage(1); setLimit(Number(e.target.value)); }}>
          {[10, 20, 50].map(n => <option key={n} value={n}>{n} / stronę</option>)}
        </select>
        <button onClick={resetFilters}>Reset filtrów</button>
      </div>

      {/* Pasek akcji */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ color: '#666' }}>
          {total > 0 ? <>Wyświetlam {startIdx}–{endIdx} z {total}</> : <>Brak wyników</>}
          {loading && <span style={{ marginLeft: 8 }}>Ładowanie…</span>}
        </div>
        {/* tylko eksporty z backendu */}
        <button onClick={exportCsvAll} title="Eksport pełnego zestawu wg filtrów">Eksport CSV (filtry)</button>
        <button onClick={exportPdfAll} title="Eksport pełnego zestawu wg filtrów">Eksport PDF (filtry)</button>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={rowStyle.head}>
              <th style={cellStyle.head}>Data</th>
              <th style={cellStyle.head}>Produkt</th>
              <th style={cellStyle.head}>Typ</th>
              <th style={cellStyle.head}>Ilość</th>
              <th style={cellStyle.head}>Użytkownik</th>
              <th style={cellStyle.head}>Pozycja</th>
              <th style={cellStyle.head}>Notatki</th>
            </tr>
          </thead>
          <tbody>
            {ops.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 16 }}>Nic nie znaleziono.</td>
              </tr>
            )}
            {ops.map(op => (
              <tr key={op.id} style={rowStyle.body}>
                <td style={cellStyle.body}>{formatDate(op.operationDate)}</td>
                <td style={cellStyle.body}>
                  {op.product?.name || '—'}{op.product?.sku ? ` (${op.product.sku})` : ''}
                </td>
                <td style={cellStyle.body}>{opTypeLabel(op.operationType)}</td>
                <td style={cellStyle.body}>{op.quantity}</td>
                <td style={cellStyle.body}>
                  {op.user
                    ? `${op.user.firstName || ''} ${op.user.lastName || ''}`.trim() || op.user.username
                    : '—'}
                </td>
                <td style={cellStyle.body}>
                  {op.inventoryItem
                    ? `${op.inventoryItem.location}${op.inventoryItem.batchNumber ? ` / ${op.inventoryItem.batchNumber}` : ''}`
                    : '—'}
                </td>
                <td style={cellStyle.body}>{op.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginacja */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button onClick={() => setPage(1)} disabled={page === 1}>⏮</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>◀</button>
          <span>Strona {page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>▶</button>
          <button onClick={() => setPage(pages)} disabled={page === pages}>⏭</button>
        </div>
      )}
    </div>
  );
}

function opTypeLabel(t) {
  switch (t) {
    case 'in': return 'Przyjęcie';
    case 'out': return 'Wydanie';
    case 'transfer': return 'Transfer';
    case 'adjustment': return 'Korekta';
    case 'reservation': return 'Rezerwacja';
    case 'release': return 'Zwolnienie';
    default: return t || '—';
  }
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString();
}

const rowStyle = {
  head: { background: '#f5f5f5' },
  body: { borderBottom: '1px solid #eee' },
};
const cellStyle = {
  head: { textAlign: 'left', padding: '10px 8px', fontWeight: 600 },
  body: { padding: '8px' },
};

