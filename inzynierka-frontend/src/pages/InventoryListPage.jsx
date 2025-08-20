// src/pages/InventoryListPage.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import {
  fetchInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  createInventoryOperation,
} from '../services/inventory';

const sorters = [
  { value: 'idAsc', label: 'ID rosnąco' },
  { value: 'idDesc', label: 'ID malejąco' },
];

function bySorter(v) {
  if (v === 'idDesc') return (a, b) => b.id - a.id;
  // default
  return (a, b) => a.id - b.id;
}

export default function InventoryListPage() {
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? 1;
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtry
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [supplier, setSupplier] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [sort, setSort] = useState('idAsc');

  // edycja wiersza
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchInventoryItems({
        product: q || undefined,
        location: loc || undefined,
        supplier: supplier || undefined,
        lowStock: onlyLow || undefined,
      });
      setItems(data || []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd ładowania magazynu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const srt = bySorter(sort);
    return [...items].sort(srt);
  }, [items, sort]);

  /** start edycji */
  const startEdit = (row) => {
    setEditId(row.id);
    setDraft({
      location: row.location || '',
      quantity: row.quantity,
      reservedQuantity: row.reservedQuantity,
      condition: row.condition || 'new',
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setDraft({});
  };

  const changeDraft = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const saveEdit = async (id) => {
    try {
      const payload = {
        ...draft,
        lastUpdatedBy: userId,
      };
      const updated = await updateInventoryItem(id, payload);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updated } : it)));
      toast.success('Zapisano zmiany.');
      cancelEdit();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd aktualizacji pozycji');
    }
  };

  /** szybkie przyjęcie / wydanie */
  const quickOp = async (row, opType) => {
    try {
      const label = opType === 'in' ? 'przyjąć' : 'wydać';
      const val = window.prompt(`Ile sztuk chcesz ${label}?`, '1');
      if (!val) return;
      const qty = parseInt(val, 10);
      if (Number.isNaN(qty) || qty <= 0) {
        toast.warn('Podaj dodatnią liczbę całkowitą.');
        return;
      }
      await createInventoryOperation({
        inventoryItemId: row.id,
        operationType: opType,
        quantity: qty,
        userId,
        notes: opType === 'in' ? 'Szybkie przyjęcie z listy' : 'Szybkie wydanie z listy',
      });
      // odśwież stan (backend przelicza ilość)
      await load();
      toast.success(opType === 'in' ? 'Przyjęto' : 'Wydano');
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd operacji');
    }
  };

  const removeRow = async (row) => {
    if (row.quantity > 0) {
      toast.info('Najpierw ustaw ilość na 0 (lub wydaj), dopiero potem usuń.');
      return;
    }
    if (!window.confirm('Usunąć pozycję?')) return;
    try {
      await deleteInventoryItem(row.id);
      setItems((prev) => prev.filter((x) => x.id !== row.id));
      toast.success('Usunięto pozycję.');
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd usuwania');
    }
  };

  const applyFilters = () => load();
  const resetFilters = () => {
    setQ('');
    setLoc('');
    setSupplier('');
    setOnlyLow(false);
    setSort('idAsc');
    load();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Magazyn</h1>

      {/* FILTRY */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '10px 0 16px' }}>
        <input
          placeholder="Produkt (nazwa / SKU)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <input
          placeholder="Lokalizacja"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {sorters.map((s) => (
            <option key={s.value} value={s.value}>{`Sort: ${s.label}`}</option>
          ))}
        </select>
        <input
          placeholder="Dostawca"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Niski stan
        </label>
        <button onClick={applyFilters}>Szukaj</button>
        <button onClick={resetFilters}>Reset</button>
        <button onClick={() => navigate('/inventory/new')} style={{ marginLeft: 'auto' }}>
          + Dodaj pozycję
        </button>
      </div>

      {/* TABELA */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>ID</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Produkt</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Lokalizacja</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Ilość</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Zarezerw.</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Dostępna</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Stan</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 16 }}>Ładowanie…</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 16 }}>Brak pozycji</td>
              </tr>
            ) : (
              visible.map((row) => {
                const available = (row.quantity || 0) - (row.reservedQuantity || 0);
                const isEdit = editId === row.id;

                return (
                  <tr key={row.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 10, width: 60 }}>{row.id}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <strong>{row.product?.name || '—'}</strong>
                        <span style={{ color: '#777' }}>
                          {row.product?.sku ? `(${row.product.sku})` : ''}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: 10, width: 160 }}>
                      {isEdit ? (
                        <input
                          value={draft.location}
                          onChange={(e) => changeDraft('location', e.target.value)}
                        />
                      ) : (
                        row.location || '—'
                      )}
                    </td>

                    <td style={{ padding: 10, width: 120 }}>
                      {isEdit ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={draft.quantity}
                          onChange={(e) => changeDraft('quantity', e.target.value)}
                          style={{ width: 100 }}
                        />
                      ) : (
                        row.quantity
                      )}
                    </td>

                    <td style={{ padding: 10, width: 120 }}>
                      {isEdit ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={draft.reservedQuantity}
                          onChange={(e) => changeDraft('reservedQuantity', e.target.value)}
                          style={{ width: 100 }}
                        />
                      ) : (
                        row.reservedQuantity
                      )}
                    </td>

                    <td style={{ padding: 10, width: 100 }}>{available}</td>

                    <td style={{ padding: 10, width: 160 }}>
                      {isEdit ? (
                        <select
                          value={draft.condition}
                          onChange={(e) => changeDraft('condition', e.target.value)}
                        >
                          <option value="new">Nowy</option>
                          <option value="good">Dobry</option>
                          <option value="fair">Umiarkowany</option>
                          <option value="damaged">Uszkodzony</option>
                          <option value="expired">Przeterminowany</option>
                        </select>
                      ) : (
                        row.condition || '—'
                      )}
                    </td>

                    <td style={{ padding: 10, minWidth: 360 }}>
                      {isEdit ? (
                        <>
                          <button onClick={() => saveEdit(row.id)} style={{ marginRight: 8 }}>
                            Zapisz
                          </button>
                          <button onClick={cancelEdit}>Anuluj</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => quickOp(row, 'in')} style={{ marginRight: 8 }}>
                            Przyjęcie
                          </button>
                          <button onClick={() => quickOp(row, 'out')} style={{ marginRight: 8 }}>
                            Wydanie
                          </button>
                          {/* Korekta usunięta – edycja robi to samo */}
                          <button onClick={() => startEdit(row)} style={{ marginRight: 8 }}>
                            Edytuj
                          </button>
                          <Link to={`/inventory/${row.id}`} style={{ marginRight: 8 }}>
                            Szczegóły
                          </Link>
                          <button onClick={() => removeRow(row)} style={{ color: '#b3261e' }}>
                            Usuń
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}





