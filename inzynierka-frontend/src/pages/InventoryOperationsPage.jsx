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
function extractSku(label = '') {
  const m = String(label).match(/\(([^()]+)\)\s*$/);
  return m ? m[1] : '';
}

export default function InventoryOperationsPage() {
  const [params, setParams] = useSearchParams();

  const pageFromUrl = Number(params.get('page') || 1);
  const limitFromUrl = Number(params.get('limit') || 10);
  const productIdFromUrl = params.get('productId') || '';
  const typeFromUrl = params.get('type') || '';
  const allowedTypes = new Set(['in','out','transfer','adjustment','reservation','release']);
  const safeTypeFromUrl = allowedTypes.has(typeFromUrl) ? typeFromUrl : '';
  const userIdFromUrl = params.get('userId') || '';
  const startFromUrl = params.get('start') || '';
  const endFromUrl = params.get('end') || '';

  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(pageFromUrl);
  const [limit, setLimit] = useState(limitFromUrl);
  const [operationType, setOperationType] = useState(safeTypeFromUrl);
  const [startDate, setStartDate] = useState(startFromUrl);
  const [endDate, setEndDate] = useState(endFromUrl);

  const [productInput, setProductInput] = useState('');
  const [productId, setProductId] = useState(productIdFromUrl);
  const [productOpts, setProductOpts] = useState([]);

  const [userInput, setUserInput] = useState('');
  const [userId, setUserId] = useState(userIdFromUrl);
  const [userOpts, setUserOpts] = useState([]);

  const [debouncedProd, setDebouncedProd] = useState(productInput);
  const [debouncedUser, setDebouncedUser] = useState(userInput);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedProd(productInput), DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [productInput]);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedUser(userInput), DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [userInput]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const opts = await getProductOptions({ q: extractSku(productInput) || normalize(productInput) });
        if (!ignore) setProductOpts(opts);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { ignore = true; };
  }, [debouncedProd]); // eslint-disable-line

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const opts = await getUserOptions({ q: normalize(userInput) });
        if (!ignore) setUserOpts(opts);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { ignore = true; };
  }, [debouncedUser]); // eslint-disable-line

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const next = new URLSearchParams();
        if (page !== 1) next.set('page', String(page));
        if (limit !== 10) next.set('limit', String(limit));
        if (productId) next.set('productId', String(productId));
        if (operationType) next.set('type', operationType);
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

  function onProductChange(val) {
    setProductInput(val);
    const byLabel = productOpts.find(o => o.label === val);
    if (byLabel) {
      setProductId(byLabel.id);
    } else if (/^\d+$/.test(val)) {
      setProductId(Number(val));
    } else {
      setProductId('');
    }
  }
  function onUserChange(val) {
    setUserInput(val);
    const byLabel = userOpts.find(o => o.label === val);
    if (byLabel) {
      setUserId(byLabel.id);
    } else if (/^\d+$/.test(val)) {
      setUserId(Number(val));
    } else {
      setUserId('');
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Operacje magazynowe</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 16px' }}>
        <input
          list="op-product-options"
          placeholder="Produkt (nazwa / SKU)"
          value={productInput}
          onChange={(e) => onProductChange(e.target.value)}
        />
        <datalist id="op-product-options">{productOpts.map(o => <option key={o.id} value={o.label} />)}</datalist>

        <select value={operationType} onChange={(e) => { setPage(1); setOperationType(e.target.value); }}>
          <option value="">Typ: dowolny</option>
          <option value="in">Przyjęcie (in)</option>
          <option value="out">Wydanie (out)</option>
          <option value="transfer">Transfer</option>
          <option value="adjustment">Korekta</option>
          <option value="reservation">Rezerwacja</option>
          <option value="release">Zwolnienie</option>
        </select>

        <input list="op-user-options" placeholder="Użytkownik (imię / nazwisko / login / email)" value={userInput} onChange={(e) => onUserChange(e.target.value)} />
        <datalist id="op-user-options">{userOpts.map(o => <option key={o.id} value={o.label} />)}</datalist>

        <input type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} />
        <input type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} />

        <button onClick={() => { setPage(1); setLimit(10); setProductInput(''); setProductId(''); setUserInput(''); setUserId(''); setOperationType(''); setStartDate(''); setEndDate(''); }}>
          Reset filtrów
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={async () => {
            try {
              await downloadOperationsCSV({
                page, limit,
                productId: productId || undefined,
                userId: userId || undefined,
                operationType: operationType || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              });
            } catch (e) {
              console.error(e);
              toast.error(e?.message || 'Błąd eksportu CSV');
            }
          }}>Eksport CSV (filtry)</button>

          <button onClick={async () => {
            try {
              await downloadOperationsPDF({
                page, limit,
                productId: productId || undefined,
                userId: userId || undefined,
                operationType: operationType || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              });
            } catch (e) {
              console.error(e);
              toast.error(e?.message || 'Błąd eksportu PDF');
            }
          }}>Eksport PDF (filtry)</button>
        </div>
      </div>

      {loading ? <p>Ładowanie…</p> : (
        <>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
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
              {ops.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 24, textAlign: 'center', color: '#777' }}>Nic nie znaleziono.</td></tr>
              ) : ops.map(op => (
                <tr key={op.id} style={rowStyle.body}>
                  <td style={cellStyle.body}>{formatDate(op.operationDate)}</td>
                  <td style={cellStyle.body}>{op.product?.name || '-'}{op.product?.sku ? ` (${op.product.sku})` : ''}</td>
                  <td style={cellStyle.body}>{typeLabel(op.operationType)}</td>
                  <td style={cellStyle.body}>{op.quantityBefore} → <strong>{op.quantityAfter}</strong> {op.quantity != null ? ` (${op.quantity >= 0 ? '+' : ''}${op.quantity})` : ''}</td>
                  <td style={cellStyle.body}>{`${op.user?.firstName || ''} ${op.user?.lastName || ''}`.trim() || op.user?.username || '-'}</td>
                  <td style={cellStyle.body}>{op.inventoryItem?.location || '-'}</td>
                  <td style={cellStyle.body}>{op.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <span>Wyniki: {startIdx}–{endIdx} z {total}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>« Poprzednia</button>
              <span>Strona {page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Następna »</button>
            </div>
            <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / str.</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function typeLabel(t) {
  switch (t) {
    case 'in': return 'Przyjęcie';
    case 'out': return 'Wydanie';
    case 'transfer': return 'Transfer';
    case 'receive': return 'Odbiór z tranzytu';
    case 'adjustment': return 'Korekta';
    case 'reservation': return 'Rezerwacja';
    case 'release': return 'Zwolnienie';
    default: return t || '—';
  }
}
function formatDate(d) { const dt = new Date(d); return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString(); }
const rowStyle = { head: { background: '#f5f5f5' }, body: { borderBottom: '1px solid #eee' } };
const cellStyle = { head: { textAlign: 'left', padding: '10px 8px', fontWeight: 600 }, body: { padding: '8px' } };
