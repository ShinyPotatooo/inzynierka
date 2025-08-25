// src/pages/ProductsListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { listProducts } from '../services/products';

const sorters = [
  { value: 'idAsc', label: 'ID rosnąco' },
  { value: 'idDesc', label: 'ID malejąco' },
  { value: 'nameAsc', label: 'Nazwa A→Z' },
  { value: 'nameDesc', label: 'Nazwa Z→A' },
];

function bySorter(v) {
  if (v === 'idDesc') return (a, b) => b.id - a.id;
  if (v === 'nameAsc') return (a, b) => (a.name || '').localeCompare(b.name || '');
  if (v === 'nameDesc') return (a, b) => (b.name || '').localeCompare(a.name || '');
  return (a, b) => a.id - b.id; // idAsc (domyślnie)
}

export default function ProductsListPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [q, setQ] = useState('');
  const [sort, setSort] = useState('idAsc');

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const timer = useRef(null);

  const load = async (_page = page, _q = q) => {
    try {
      setLoading(true);
      const { products, pagination } = await listProducts({
        page: _page,
        limit,
        search: _q || undefined,
      });
      setRows(products || []);
      if (pagination) {
        setPage(pagination.currentPage);
        setPages(pagination.totalPages);
        setTotal(pagination.totalItems);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd ładowania produktów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce wyszukiwarki
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(1, q), 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const visible = useMemo(() => {
    const srt = bySorter(sort);
    return [...rows].sort(srt);
  }, [rows, sort]);

  const next = () => page < pages && load(page + 1, q);
  const prev = () => page > 1 && load(page - 1, q);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Produkty</h1>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '10px 0 16px' }}>
        <input
          placeholder="Szukaj (nazwa / SKU / opis)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {sorters.map((s) => (
            <option key={s.value} value={s.value}>
              {`Sort: ${s.label}`}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: 13 }}>
            {loading ? 'Ładowanie…' : `Wyniki: ${total}`}
          </span>
          <button disabled={page <= 1} onClick={prev}>
            ←
          </button>
          <span style={{ minWidth: 60, textAlign: 'center' }}>
            {page} / {pages}
          </span>
          <button disabled={page >= pages} onClick={next}>
            →
          </button>
          <button onClick={() => navigate('/products/new')} style={{ marginLeft: 8 }}>
            + Dodaj produkt
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>ID</th>
              <th style={{ textAlign: 'left', padding: 10 }}>SKU</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Nazwa</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Kategoria</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Marka</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Min</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Reorder</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Max</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Stan</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ padding: 16 }}>
                  Ładowanie…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: 16 }}>
                  Brak produktów
                </td>
              </tr>
            ) : (
              visible.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 10, width: 60 }}>{p.id}</td>
                  <td style={{ padding: 10, width: 140 }}>{p.sku}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: '#777', fontSize: 12 }}>{p.description}</div>
                  </td>
                  <td style={{ padding: 10, width: 140 }}>{p.category || '—'}</td>
                  <td style={{ padding: 10, width: 140 }}>{p.brand || '—'}</td>
                  <td style={{ padding: 10, width: 80, textAlign: 'right' }}>
                    {p.minStockLevel ?? '—'}
                  </td>
                  <td style={{ padding: 10, width: 90, textAlign: 'right' }}>
                    {p.reorderPoint ?? '—'}
                  </td>
                  <td style={{ padding: 10, width: 80, textAlign: 'right' }}>
                    {p.maxStockLevel ?? '—'}
                  </td>
                  <td style={{ padding: 10, width: 80, textAlign: 'right' }}>
                    {p.totalStock ?? '—'}
                  </td>
                  <td style={{ padding: 10, width: 120 }}>
                    <span style={{ textTransform: 'capitalize' }}>{p.status || 'active'}</span>
                  </td>
                  <td style={{ padding: 10, minWidth: 160 }}>
                    <Link to={`/products/${p.id}`} style={{ marginRight: 8 }}>
                      Edytuj
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
