import React, { useEffect, useState } from 'react';
import { listProducts } from '../services/products';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const ProductsListPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ products: [], pagination: { currentPage: 1, totalPages: 1 } });
  const [loading, setLoading] = useState(true);

  const load = async (p = page, s = search) => {
    try {
      setLoading(true);
      const res = await listProducts({ page: p, limit: 10, search: s });
      setData(res);
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się pobrać listy produktów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, ''); }, []); // start

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const { products, pagination } = data;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Produkty</h1>

      <form onSubmit={onSearch} style={{ marginBottom: '1rem', display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Szukaj po nazwie, SKU lub opisie"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <button type="submit">Szukaj</button>
        <Link to="/products/new" style={{ marginLeft: 'auto' }}>
          <button type="button">+ Dodaj produkt</button>
        </Link>
      </form>

      {loading ? (
        <p>Ładowanie…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>SKU</th>
              <th style={th}>Nazwa</th>
              <th style={th}>Kategoria</th>
              <th style={th}>Marka</th>
              <th style={th}>Cena</th>
              <th style={th}>Stan</th>
              <th style={th}>Dostępne</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={td}>{p.id}</td>
                <td style={td}>{p.sku}</td>
                <td style={td}>{p.name}</td>
                <td style={td}>{p.category}</td>
                <td style={td}>{p.brand || '-'}</td>
                <td style={td}>{Number(p.price).toFixed(2)}</td>
                <td style={td}>{p.totalStock ?? 0}</td>
                <td style={td}>{p.totalAvailable ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={pagination.currentPage <= 1} onClick={() => { const np = page - 1; setPage(np); load(np, search); }}>
          ←
        </button>
        <span>Strona {pagination.currentPage} / {pagination.totalPages}</span>
        <button disabled={pagination.currentPage >= pagination.totalPages} onClick={() => { const np = page + 1; setPage(np); load(np, search); }}>
          →
        </button>
      </div>
    </div>
  );
};

const th = { borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8 };
const td = { borderBottom: '1px solid #f0f0f0', padding: 8 };

export default ProductsListPage;
