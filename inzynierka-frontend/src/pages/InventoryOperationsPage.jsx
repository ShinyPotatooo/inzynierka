// src/pages/InventoryOperationsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchOperations, exportOperationsCSV } from '../services/operations';
import { getProductOptions } from '../services/products';
import { getUserOptions } from '../services/users';
import '../components/styles/InventoryListPage.css';

const TYPES = [
  { value: '', label: '— dowolny —' },
  { value: 'in', label: 'Przyjęcie' },
  { value: 'out', label: 'Wydanie' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'receive', label: 'Odbiór z tranzytu' },
  { value: 'adjustment', label: 'Korekta' },
  { value: 'reservation', label: 'Rezerwacja' },
  { value: 'release', label: 'Zwolnienie rezerwacji' },
];

function fmtUser(u) {
  if (!u) return '';
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return full || u.username || String(u.id || '');
}
function fmtDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return d || ''; }
}
function qtyCell(op) {
  const before = op?.quantityBefore ?? 0;
  const after  = op?.quantityAfter ?? 0;
  const delta  = (op?.quantity ?? (after - before)) ?? 0;
  const sign   = delta >= 0 ? '+' : '';
  return `${before} → ${after} (${sign}${delta})`;
}

export default function InventoryOperationsPage() {
  // --- FILTRY
  const [type, setType] = useState('');
  const [userInput, setUserInput] = useState('');
  const [userId, setUserId] = useState(null);
  const [userOptions, setUserOptions] = useState([]);

  const [productInput, setProductInput] = useState('');
  const [productId, setProductId] = useState(null);
  const [prodOptions, setProdOptions] = useState([]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- DANE
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);

  // --- AUTOCOMPLETE USER
  const userDebounce = useRef(null);
  useEffect(() => {
    const q = (userInput || '').trim();
    if (userDebounce.current) clearTimeout(userDebounce.current);
    if (q.length < 2) {
      setUserOptions([]);
      setUserId(null);
      return;
    }
    userDebounce.current = setTimeout(async () => {
      try {
        const opts = await getUserOptions(q, 15);
        setUserOptions(opts || []);
        const exact = (opts || []).find(
          (o) => String(o.label || '').toLowerCase().trim() === String(q).toLowerCase().trim()
        );
        setUserId(exact?.id ?? null);
      } catch {
        setUserOptions([]);
      }
    }, 250);
    return () => clearTimeout(userDebounce.current);
  }, [userInput]);

  // --- AUTOCOMPLETE PRODUCT
  const prodDebounce = useRef(null);
  useEffect(() => {
    const q = (productInput || '').trim();
    if (prodDebounce.current) clearTimeout(prodDebounce.current);
    if (q.length < 2) {
      setProdOptions([]);
      setProductId(null);
      return;
    }
    prodDebounce.current = setTimeout(async () => {
      try {
        const opts = await getProductOptions(q, 20);
        setProdOptions(opts || []);
        const exact = (opts || []).find(
          (o) => String(o.label || '').toLowerCase().trim() === String(q).toLowerCase().trim()
        );
        setProductId(exact?.id ?? null);
      } catch {
        setProdOptions([]);
      }
    }, 250);
    return () => clearTimeout(prodDebounce.current);
  }, [productInput]);

  // --- LOAD
  async function load(p = page) {
    try {
      setLoading(true);
      const { items: list, pagination } = await fetchOperations({
        page: p,
        limit,
        operationType: type || undefined,
        userId: userId || undefined,
        productId: productId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setItems(Array.isArray(list) ? list : []);
      setPage(pagination.currentPage || 1);
      setPages(pagination.totalPages || 1);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd pobierania operacji');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); /* eslint-disable react-hooks/exhaustive-deps */ }, []);

  const applyFilters = () => load(1);
  const resetFilters = () => {
    setType('');
    setUserInput('');
    setUserId(null);
    setProductInput('');
    setProductId(null);
    setStartDate('');
    setEndDate('');
    setLimit(25);
    load(1);
  };

  const onExport = async () => {
    try {
      await exportOperationsCSV({
        operationType: type || undefined,
        userId: userId || undefined,
        productId: productId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 5000,
      });
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Nie udało się wyeksportować CSV');
    }
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="inventory-page">
      <h1>Operacje magazynowe</h1>

      {/* FILTRY */}
      <div className="filters">
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ minWidth: 180 }}>
          {TYPES.map((t) => (
            <option key={t.value || 'any'} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          list="user-options"
          placeholder="Użytkownik (imię/nazwisko/login)"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <datalist id="user-options">
          {userOptions.map((o) => (
            <option key={o.id} value={o.label} />
          ))}
        </datalist>

        <input
          list="product-options"
          placeholder="Produkt (nazwa / SKU)"
          value={productInput}
          onChange={(e) => setProductInput(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <datalist id="product-options">
          {prodOptions.map((o) => (
            <option key={o.id} value={o.label} />
          ))}
        </datalist>

        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Data od"
        />
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="Data do"
        />

        <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); load(1); }}>
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {`Na stronę: ${n}`}
            </option>
          ))}
        </select>

        <button onClick={applyFilters}>Szukaj</button>
        <button onClick={resetFilters}>Reset</button>

        <div className="export-buttons">
          <button onClick={onExport}>Eksport CSV</button>
        </div>
      </div>

      {/* TABELA (tylko potrzebne kolumny) */}
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produkt</th>
              <th>Typ</th>
              <th>Ilość</th>
              <th>Użytkownik</th>
              <th>Pozycja</th>
              <th>Notatki</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 16 }}>Ładowanie…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 16 }}>Brak wyników</td>
              </tr>
            ) : (
              rows.map((op) => (
                <tr key={op.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(op.operationDate)}</td>

                  <td>
                    <div className="product-cell">
                      <strong>{op?.product?.name || '—'}</strong>
                      <span className="sku">{op?.product?.sku ? `(${op.product.sku})` : ''}</span>
                    </div>
                  </td>

                  <td>{op.operationType}</td>
                  <td>{qtyCell(op)}</td>
                  <td>{fmtUser(op.user)}</td>
                  <td>{op?.inventoryItem?.location || ''}</td>
                  <td style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {op.notes || ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACJA */}
      <div className="pagination" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button disabled={page <= 1} onClick={() => load(page - 1)}>‹ Poprzednia</button>
        <span style={{ alignSelf: 'center' }}>Strona {page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => load(page + 1)}>Następna ›</button>
      </div>
    </div>
  );
}
