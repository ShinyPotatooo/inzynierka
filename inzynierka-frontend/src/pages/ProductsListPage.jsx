// src/pages/ProductsListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { listProducts } from '../services/products';
import { downloadProductsCSV, downloadProductsPDF } from '../services/download';

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
  return (a, b) => a.id - b.id; // idAsc (domyślne)
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

  const [showSequential, setShowSequential] = useState(true);
  const rowNo = (idx) => (page - 1) * limit + idx + 1;

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

  useEffect(() => { load(1, q); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(1, q), 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line
  }, [q]);

  const visible = useMemo(() => {
    const srt = bySorter(sort);
    return [...rows].sort(srt);
  }, [rows, sort]);

  const next = () => page < pages && load(page + 1, q);
  const prev = () => page > 1 && load(page - 1, q);

  const exportParams = { search: q || undefined };
  const onExportCSV = async () => {
    try {
      await downloadProductsCSV(exportParams);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Nie udało się wyeksportować CSV');
    }
  };
  const onExportPDF = async () => {
    try {
      await downloadProductsPDF(exportParams);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Nie udało się wyeksportować PDF');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI, Roboto, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 700 }}>📦 Produkty</h1>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '10px 0 16px' }}>
        <input
          placeholder="Szukaj (nazwa / SKU / opis)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...inputInline, minWidth: 260 }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={inputInline}>
          {sorters.map((s) => (
            <option key={s.value} value={s.value}>
              {`Sort: ${s.label}`}
            </option>
          ))}
        </select>

        <button onClick={() => setShowSequential(v => !v)} style={btnGray}>
          {showSequential ? 'Pokaż ID' : 'Numeruj od 1'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onExportCSV} title="Eksportuj listę produktów do CSV" style={btnGray}>Eksport CSV</button>
          <button onClick={onExportPDF} title="Eksportuj listę produktów do PDF" style={btnGray}>Eksport PDF</button>

          <span style={{ color: '#666', fontSize: 13 }}>
            {loading ? 'Ładowanie…' : `Wyniki: ${total}`}
          </span>
          <button disabled={page <= 1} onClick={prev} style={btnGray}>←</button>
          <span style={{ minWidth: 60, textAlign: 'center' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={next} style={btnGray}>→</button>
          <button onClick={() => navigate('/products/new')} style={btnSecondary}>
            ➕ Dodaj produkt
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>{showSequential ? 'Lp.' : 'ID'}</th>
              <th style={th}>SKU</th>
              <th style={th}>Nazwa</th>
              <th style={th}>Kategoria</th>
              <th style={th}>Marka</th>
              <th style={{ ...th, textAlign: 'right' }}>Min</th>
              <th style={{ ...th, textAlign: 'right' }}>Reorder</th>
              <th style={{ ...th, textAlign: 'right' }}>Max</th>
              <th style={{ ...th, textAlign: 'right' }}>Stan</th>
              <th style={th}>Status</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: 16 }}>Ładowanie…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 16 }}>Brak produktów</td></tr>
            ) : (
              visible.map((p, idx) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f1f1f1' }}>
                  <td style={td}>{showSequential ? rowNo(idx) : p.id}</td>
                  <td style={td}>{p.sku}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: '#777', fontSize: 12 }}>{p.description}</div>
                  </td>
                  <td style={td}>{p.category || '—'}</td>
                  <td style={td}>{p.brand || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{p.minStockLevel ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{p.reorderPoint ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{p.maxStockLevel ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{p.totalStock ?? '—'}</td>
                  <td style={td}><span style={{ textTransform: 'capitalize' }}>{p.status || 'active'}</span></td>
                  <td style={{ ...td, minWidth: 160 }}>
                    <Link to={`/products/${p.id}`} style={{ ...btnGray, textDecoration: 'none', padding: '4px 8px', display: 'inline-block' }}>
                      ✏ Edytuj
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

// --- wspólne style ---
const th = { textAlign: 'left', padding: '10px 8px', fontWeight: 600 };
const td = { padding: 10, verticalAlign: 'middle' };

const inputInline = {
  padding: '6px 8px',
  border: '1px solid #ccc',
  borderRadius: 6,
  width: '100%',
};

const btnSecondary = {
  background: '#4a6fa5',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 600,
};

const btnGray = {
  background: '#f3f4f6',
  color: '#333',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 600,
};

const btnDanger = {
  background: '#b0413e',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
  marginLeft: 8,
  fontWeight: 600,
};
