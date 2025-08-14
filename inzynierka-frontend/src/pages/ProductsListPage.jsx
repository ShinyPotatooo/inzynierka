// src/pages/ProductsListPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { listProducts } from '../services/products';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const DEBOUNCE_MS = 350;

export default function ProductsListPage() {
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const pageFromUrl = Number(params.get('page') || 1);
  const searchFromUrl = params.get('q') || '';
  const limitFromUrl = Number(params.get('limit') || 10);

  const [page, setPage] = useState(pageFromUrl);
  const [search, setSearch] = useState(searchFromUrl);
  const [limit, setLimit] = useState(limitFromUrl);

  const debouncedSearch = useDebounce(search, DEBOUNCE_MS);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const next = new URLSearchParams();
        if (debouncedSearch) next.set('q', debouncedSearch);
        if (page !== 1) next.set('page', String(page));
        if (limit !== 10) next.set('limit', String(limit));
        setParams(next, { replace: true });

        const { products, pagination } = await listProducts({
          page,
          limit,
          search: debouncedSearch,
        });

        setItems(products || []);
        setTotalItems(pagination?.totalItems ?? 0);
        setPages(pagination?.totalPages || 1);
      } catch (e) {
        console.error(e);
        toast.error('Nie udało się pobrać listy produktów');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, limit, debouncedSearch, setParams]);

  const startIdx = useMemo(() => (page - 1) * limit + 1, [page, limit]);
  const endIdx = useMemo(
    () => Math.min(page * limit, totalItems),
    [page, limit, totalItems]
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, marginRight: 'auto' }}>Produkty</h1>
        <Link
          to="/products/new"
          style={{
            padding: '8px 12px',
            background: '#0d6efd',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none'
          }}
        >
          + Dodaj produkt
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Szukaj po nazwie / SKU / opisie…"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={{ minWidth: 360, padding: 8 }}
        />
        <select value={limit} onChange={e => { setPage(1); setLimit(Number(e.target.value)); }}>
          {[10, 20, 50].map(n => <option key={n} value={n}>{n} / stronę</option>)}
        </select>
        {loading && <span>Ładowanie…</span>}
      </div>

      <div style={{ marginBottom: 8, color: '#666' }}>
        {totalItems > 0
          ? <>Wyświetlam {startIdx}–{endIdx} z {totalItems}</>
          : <>Brak wyników</>}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={rowStyle.head}>
              <th style={cellStyle.head}>SKU</th>
              <th style={cellStyle.head}>Nazwa</th>
              <th style={cellStyle.head}>Kategoria</th>
              <th style={cellStyle.head}>Marka</th>
              <th style={cellStyle.head}>Cena</th>
              <th style={cellStyle.head}>Status</th>
              <th style={cellStyle.head}>Stan całkowity</th>
              <th style={cellStyle.head}>Dostępne</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 16 }}>
                  Nic nie znaleziono.
                </td>
              </tr>
            )}
            {items.map(p => (
              <tr key={p.id} style={rowStyle.body}>
                <td style={cellStyle.body}>{p.sku}</td>
                <td style={cellStyle.body}>{p.name}</td>
                <td style={cellStyle.body}>{p.category || '—'}</td>
                <td style={cellStyle.body}>{p.brand || '—'}</td>
                <td style={cellStyle.body}>{formatPrice(p.price)}</td>
                <td style={cellStyle.body}>{statusLabel(p.status)}</td>
                <td style={cellStyle.body}>{p.totalStock ?? 0}</td>
                <td style={cellStyle.body}>{p.totalAvailable ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

function useDebounce(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function statusLabel(s) {
  switch (s) {
    case 'active': return 'Aktywny';
    case 'inactive': return 'Nieaktywny';
    case 'discontinued': return 'Wycofany';
    default: return s || '—';
  }
}

function formatPrice(val) {
  const n = Number(val);
  if (Number.isFinite(n)) return `${n.toFixed(2)} zł`;
  return '—';
}

const rowStyle = {
  head: { background: '#f5f5f5' },
  body: { borderBottom: '1px solid #eee' },
};
const cellStyle = {
  head: { textAlign: 'left', padding: '10px 8px', fontWeight: 600 },
  body: { padding: '8px' },
};


