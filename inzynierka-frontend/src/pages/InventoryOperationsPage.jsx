// src/pages/InventoryOperationsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function InventoryOperationsPage() {
  const [params, setParams] = useSearchParams();

  // UI state
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // filters from URL
  const pageFromUrl = Number(params.get('page') || 1);
  const limitFromUrl = Number(params.get('limit') || 10);
  const productIdFromUrl = params.get('productId') || '';
  const typeFromUrl = params.get('type') || ''; // in/out/...
  const userIdFromUrl = params.get('userId') || '';
  const startFromUrl = params.get('start') || '';
  const endFromUrl = params.get('end') || '';

  // state
  const [page, setPage] = useState(pageFromUrl);
  const [limit, setLimit] = useState(limitFromUrl);
  const [productId, setProductId] = useState(productIdFromUrl);
  const [operationType, setOperationType] = useState(typeFromUrl);
  const [userId, setUserId] = useState(userIdFromUrl);
  const [startDate, setStartDate] = useState(startFromUrl);
  const [endDate, setEndDate] = useState(endFromUrl);

  // fetch inside effect → brak ostrzeżenia o brakującej zależności 'load'
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // sync URL
        const next = new URLSearchParams();
        if (page !== 1) next.set('page', String(page));
        if (limit !== 10) next.set('limit', String(limit));
        if (productId) next.set('productId', String(productId));
        if (operationType) next.set('type', operationType);
        if (userId) next.set('userId', String(userId));
        if (startDate) next.set('start', startDate);
        if (endDate) next.set('end', endDate);
        setParams(next, { replace: true });

        // query backend
        const res = await API.get('/inventory/operations', {
          params: {
            page,
            limit,
            productId: productId || undefined,
            operationType: operationType || undefined,
            userId: userId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        });

        if (!res.data?.success) {
          throw new Error(res.data?.error || 'Błąd pobierania operacji');
        }

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
  }, [page, limit, productId, operationType, userId, startDate, endDate, setParams]);

  const startIdx = useMemo(() => (page - 1) * limit + 1, [page, limit]);
  const endIdx = useMemo(
    () => Math.min(page * limit, total),
    [page, limit, total]
  );

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Operacje magazynowe</h1>

      {/* Filtry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))', gap: 8, margin: '12px 0' }}>
        <input
          type="number"
          placeholder="Product ID"
          value={productId}
          onChange={(e) => { setPage(1); setProductId(e.target.value); }}
        />
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
        <input
          type="number"
          placeholder="User ID"
          value={userId}
          onChange={(e) => { setPage(1); setUserId(e.target.value); }}
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setPage(1); setStartDate(e.target.value); }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setPage(1); setEndDate(e.target.value); }}
        />
        <select value={limit} onChange={e => { setPage(1); setLimit(Number(e.target.value)); }}>
          {[10, 20, 50].map(n => <option key={n} value={n}>{n} / stronę</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 8, color: '#666' }}>
        {total > 0
          ? <>Wyświetlam {startIdx}–{endIdx} z {total}</>
          : <>Brak wyników</>}
        {loading && <span style={{ marginLeft: 8 }}>Ładowanie…</span>}
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
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString();
  } catch {
    return String(d);
  }
}

const rowStyle = {
  head: { background: '#f5f5f5' },
  body: { borderBottom: '1px solid #eee' },
};
const cellStyle = {
  head: { textAlign: 'left', padding: '10px 8px', fontWeight: 600 },
  body: { padding: '8px' },
};
