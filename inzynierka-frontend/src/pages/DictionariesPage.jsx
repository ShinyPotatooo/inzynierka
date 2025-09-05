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
    <div style={{ padding: '2rem' }}>
      <h1>Słowniki</h1>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button onClick={() => setTab('categories')} disabled={tab==='categories'}>Kategorie</button>
        <button onClick={() => setTab('locations')} disabled={tab==='locations'}>Lokalizacje</button>
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
        display: 'grid', gridTemplateColumns: 'minmax(240px,1fr) 140px 1fr',
        gap: 8, alignItems: 'center', marginBottom: 12
      }}>
        <input
          placeholder="Szukaj po nazwie…"
          value={query}
          onChange={(e) => { pager.setPage(1); setQuery(e.target.value); }}
        />
        <select value={pager.limit} onChange={e => { pager.setPage(1); pager.setLimit(Number(e.target.value)); }}>
          {[10,20,50,100].map(n => <option key={n} value={n}>{n} / stronę</option>)}
        </select>
        <div style={{ textAlign: 'right', color: '#666' }}>
          {loading ? 'Ładowanie…' : `Łącznie: ${pager.total}`}
        </div>
      </div>

      <form onSubmit={onAdd} style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 8, marginBottom: 12
      }}>
        <input placeholder={isCat ? 'Nowa kategoria…' : 'Nowa lokalizacja…'} value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Opis (opcjonalnie)" value={desc} onChange={e => setDesc(e.target.value)} />
        <button type="submit" disabled={!name.trim()}>Dodaj</button>
      </form>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={th}>Nazwa</th>
              <th style={th}>Opis</th>
              <th style={th}>Użycia</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center' }}>Brak wpisów</td></tr>
            )}
            {items.map(it => {
              const editing = editId === it.id;
              return (
                <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>
                    {editing ? <input value={editName} onChange={e => setEditName(e.target.value)} /> : it.name}
                  </td>
                  <td style={td}>
                    {editing ? <input value={editDesc} onChange={e => setEditDesc(e.target.value)} /> : (it.description || '—')}
                  </td>
                  <td style={{ ...td, width: 80 }}>{it.usageCount}</td>
                  <td style={{ ...td, width: 220 }}>
                    {editing ? (
                      <>
                        <button onClick={() => saveEdit(it.id)} style={{ marginRight: 6 }}>Zapisz</button>
                        <button onClick={cancelEdit}>Anuluj</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(it)} style={{ marginRight: 6 }}>Edytuj</button>
                        <button onClick={() => onDelete(it)} disabled={it.usageCount > 0} title={it.usageCount>0 ? 'Nie można usunąć – używane' : ''}>
                          Usuń
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button onClick={() => pager.setPage(1)} disabled={pager.page === 1}>⏮</button>
          <button onClick={() => pager.setPage(p => Math.max(1, p - 1))} disabled={pager.page === 1}>◀</button>
          <span>Strona {pager.page} / {pager.pages}</span>
          <button onClick={() => pager.setPage(p => Math.min(pager.pages, p + 1))} disabled={pager.page === pager.pages}>▶</button>
          <button onClick={() => pager.setPage(pager.pages)} disabled={pager.page === pager.pages}>⏭</button>
        </div>
      )}
    </>
  );
}

const th = { textAlign: 'left', padding: '10px 8px', fontWeight: 600 };
const td = { padding: 8 };
