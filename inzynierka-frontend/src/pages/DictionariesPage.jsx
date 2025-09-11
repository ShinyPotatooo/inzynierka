// src/pages/DictionariesPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  listCategories, createCategory, updateCategory, deleteCategory,
} from '../services/categories';
import {
  listLocations, createLocation, updateLocation, deleteLocation,
} from '../services/locations';

function usePager(defaultLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [total, setTotal] = useState(0);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  return { page, setPage, limit, setLimit, total, setTotal, pages };
}

export default function DictionariesPage() {
  const [tab, setTab] = useState('categories'); // 'categories' | 'locations'

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', color: '#222' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>📖 Słowniki</h1>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <button
          onClick={() => setTab('categories')}
          disabled={tab === 'categories'}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid #ccc',
            background: tab === 'categories' ? '#4a6fa5' : '#f3f4f6',
            color: tab === 'categories' ? 'white' : '#333',
            cursor: tab === 'categories' ? 'default' : 'pointer',
            fontWeight: 600,
          }}
        >
          Kategorie
        </button>
        <button
          onClick={() => setTab('locations')}
          disabled={tab === 'locations'}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid #ccc',
            background: tab === 'locations' ? '#4a6fa5' : '#f3f4f6',
            color: tab === 'locations' ? 'white' : '#333',
            cursor: tab === 'locations' ? 'default' : 'pointer',
            fontWeight: 600,
          }}
        >
          Lokalizacje
        </button>
      </div>

      {tab === 'categories'
        ? <DictTable kind="categories" />
        : <DictTable kind="locations" />}
    </div>
  );
}

function DictTable({ kind }) {
  const isCat = kind === 'categories';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const pager = usePager(20);
  const [query, setQuery] = useState('');

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const fn = isCat ? listCategories : listLocations;
      const { items, pagination } = await fn({ query, page: pager.page, limit: pager.limit });
      setItems(items || []);
      pager.setTotal(pagination?.totalItems || 0);
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się pobrać danych');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [query, pager.page, pager.limit, isCat]);

  const onAdd = async (e) => {
    e.preventDefault();
    try {
      const fn = isCat ? createCategory : createLocation;
      await fn({ name: name.trim(), description: desc.trim() || undefined });
      setName(''); setDesc('');
      toast.success('Dodano');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Błąd dodawania');
    }
  };

  const startEdit = (it) => {
    setEditId(it.id);
    setEditName(it.name || '');
    setEditDesc(it.description || '');
  };
  const cancelEdit = () => { setEditId(null); setEditName(''); setEditDesc(''); };
  const saveEdit = async (id) => {
    try {
      const fn = isCat ? updateCategory : updateLocation;
      await fn(id, { name: editName.trim(), description: editDesc.trim() || undefined });
      toast.success('Zapisano');
      cancelEdit();
      await load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Błąd zapisu');
    }
  };

  const onDelete = async (it) => {
    if (!window.confirm(`Usunąć "${it.name}"?`)) return;
    try {
      const fn = isCat ? deleteCategory : deleteLocation;
      await fn(it.id);
      toast.success('Usunięto');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Nie można usunąć');
    }
  };

  return (
    <>
      {/* Filtry i dodawanie */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px,1fr) 160px 1fr',
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <input
          placeholder="🔍 Szukaj po nazwie…"
          value={query}
          onChange={(e) => { pager.setPage(1); setQuery(e.target.value); }}
          style={{
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #ccc',
          }}
        />
        <select
          value={pager.limit}
          onChange={e => { pager.setPage(1); pager.setLimit(Number(e.target.value)); }}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
        >
          {[10,20,50,100].map(n => <option key={n} value={n}>{n} / stronę</option>)}
        </select>
        <div style={{ textAlign: 'right', color: '#555', fontSize: '0.9rem' }}>
          {loading ? 'Ładowanie…' : `Łącznie: ${pager.total}`}
        </div>
      </div>

      <form
        onSubmit={onAdd}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 140px',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <input
          placeholder={isCat ? 'Nowa kategoria…' : 'Nowa lokalizacja…'}
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          placeholder="Opis (opcjonalnie)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            background: '#4a6fa5',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '8px 12px',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontWeight: 600,
          }}
        >
          ➕ Dodaj
        </button>
      </form>

      {/* Tabela */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Nazwa</th>
              <th style={th}>Opis</th>
              <th style={th}>Użycia</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan={4} style={{ padding: 14, textAlign: 'center', color: '#666' }}>Brak wpisów</td></tr>
            )}
            {items.map(it => {
              const editing = editId === it.id;
              return (
                <tr key={it.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                  <td style={td}>
                    {editing
                      ? <input value={editName} onChange={e => setEditName(e.target.value)} style={inputInline} />
                      : <strong>{it.name}</strong>}
                  </td>
                  <td style={td}>
                    {editing
                      ? <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={inputInline} />
                      : (it.description || '—')}
                  </td>
                  <td style={{ ...td, width: 80, textAlign: 'center' }}>{it.usageCount}</td>
                  <td style={{ ...td, width: 240 }}>
                    {editing ? (
                      <>
                        <button onClick={() => saveEdit(it.id)} style={btnSecondary}>💾 Zapisz</button>
                        <button onClick={cancelEdit} style={btnGray}>✖ Anuluj</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(it)} style={btnSecondary}>✏ Edytuj</button>
                        <button
                          onClick={() => onDelete(it)}
                          disabled={it.usageCount > 0}
                          style={{
                            ...btnDanger,
                            opacity: it.usageCount > 0 ? 0.5 : 1,
                            cursor: it.usageCount > 0 ? 'not-allowed' : 'pointer',
                          }}
                          title={it.usageCount > 0 ? 'Nie można usunąć – używane' : ''}
                        >
                          🗑 Usuń
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginacja */}
      {pager.pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, fontSize: '0.95rem' }}>
          <button onClick={() => pager.setPage(1)} disabled={pager.page === 1} style={btnGray}>⏮</button>
          <button onClick={() => pager.setPage(p => Math.max(1, p - 1))} disabled={pager.page === 1} style={btnGray}>◀</button>
          <span>Strona {pager.page} / {pager.pages}</span>
          <button onClick={() => pager.setPage(p => Math.min(pager.pages, p + 1))} disabled={pager.page === pager.pages} style={btnGray}>▶</button>
          <button onClick={() => pager.setPage(pager.pages)} disabled={pager.page === pager.pages} style={btnGray}>⏭</button>
        </div>
      )}
    </>
  );
}

const th = { textAlign: 'left', padding: '12px 10px', fontWeight: 700, fontSize: '0.95rem' };
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
  marginRight: 8,
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
