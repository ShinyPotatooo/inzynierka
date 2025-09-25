// src/pages/InventoryListPage.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import {
  fetchInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
} from '../services/inventory';
import { getProductOptions } from '../services/products';
import { getLocationOptions } from '../services/locations';
import { downloadInventoryCSV, downloadInventoryPDF } from '../services/download';
import OperationModal from '../components/Inventory/OperationModal';
import LocationSelect from '../components/Inventory/LocationSelect';
import '../components/styles/InventoryListPage.css';

const sorters = [
  { value: 'idAsc', label: 'ID rosnąco' },
  { value: 'idDesc', label: 'ID malejąco' },
];

function bySorter(v) {
  if (v === 'idDesc') return (a, b) => b.id - a.id;
  return (a, b) => a.id - b.id;
}

const DEBOUNCE_MS = 300;
const normalize = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const extractSku = (label = '') => {
  const m = String(label).match(/\(([^()]+)\)\s*$/);
  return m ? m[1].trim() : null;
};
const nameBeforeParen = (label = '') => String(label).split('(')[0].trim();

// UWAGA: bez „reserved” – na potrzeby filtra w UI
const FLOW_STATUSES = [
  { value: '', label: '— dowolny —' },
  { value: 'available', label: 'Dostępny' },
  { value: 'in_transit', label: 'W tranzycie' },
  { value: 'damaged', label: 'Uszkodzony' },
];

function FlowBadge({ status }) {
  const map = {
    available: { bg: '#DCFCE7', fg: '#166534', label: 'available' },
    in_transit: { bg: '#DBEAFE', fg: '#1E40AF', label: 'in_transit' },
    reserved: { bg: '#FEF3C7', fg: '#92400E', label: 'reserved' },
    damaged: { bg: '#FEE2E2', fg: '#991B1B', label: 'damaged' },
  };
  const s = map[status] || { bg: '#E5E7EB', fg: '#374151', label: status || '—' };
  return (
    <span style={{
      background: s.bg, color: s.fg, borderRadius: 999, padding: '2px 8px',
      fontSize: 12, fontWeight: 600, textTransform: 'none'
    }}>
      {s.label}
    </span>
  );
}

/* ---------- AUTO STATUS (empty/low) ---------- */
function getAutoStatus(row) {
  const qty = Number(row?.quantity ?? 0);
  const res = Number(row?.reservedQuantity ?? 0);
  const available = Math.max(0, qty - res);
  if (available <= 0) return 'empty';

  const min = Number(row?.product?.minStockLevel ?? row?.product?.reorderPoint ?? 0) || 0;
  if (min > 0 && available <= min) return 'low';
  return null;
}

function AutoBadge({ value }) {
  if (!value) return null;
  const map = {
    low:   { bg: '#FEF3C7', fg: '#92400E', label: 'low' },
    empty: { bg: '#E5E7EB', fg: '#374151', label: 'empty' },
  };
  const s = map[value];
  if (!s) return null;
  return (
    <span style={{
      background: s.bg, color: s.fg, borderRadius: 999, padding: '1px 6px',
      fontSize: 11, fontWeight: 700, textTransform: 'none'
    }}>
      {s.label}
    </span>
  );
}

export default function InventoryListPage() {
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? 1;
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FILTRY ---
  const [productInput, setProductInput] = useState('');
  const [productId, setProductId] = useState(null);
  const [prodOptions, setProdOptions] = useState([]);

  // lokalizacja (z podpowiedziami po 1 znaku)
  const [loc, setLoc] = useState('');
  const [locOptions, setLocOptions] = useState([]);

  const [onlyLow, setOnlyLow] = useState(false);
  const [flowStatus, setFlowStatus] = useState('');
  const [sort, setSort] = useState('idAsc');

  // --- EDYCJA ---
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  // --- MODAL OPERACJI ---
  const [opModal, setOpModal] = useState({ open: false, type: 'in', item: null });
  const openOp = (row, type) => setOpModal({ open: true, type, item: row });
  const closeOp = () => setOpModal({ open: false, type: 'in', item: null });

  // --- LOAD LISTY ---
  const load = async () => {
    try {
      setLoading(true);
      const { items: list = [] } = await fetchInventoryItems({
        productId: productId || undefined,
        location: loc || undefined,
        lowStock: onlyLow || undefined,
        flowStatus: flowStatus || undefined,
        limit: 50,
      });
      setItems(Array.isArray(list) ? list : []);
      if (onlyLow && (!list || list.length === 0)) toast.info('Brak pozycji o niskim stanie.');
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd ładowania magazynu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, []);

  const visible = useMemo(() => {
    const srt = bySorter(sort);
    return Array.isArray(items) ? [...items].sort(srt) : [];
  }, [items, sort]);

  // --- AUTOCOMPLETE PRODUKTU ---
  const timer = useRef(null);
  const inflight = useRef(null);

  const findLocalId = (q, list = prodOptions) => {
    const n = normalize(q);
    const sku = extractSku(q);

    const exact = list.find(o => normalize(o.label) === n);
    if (exact) return exact.id;

    if (sku) {
      const bySku = list.find(o => normalize(o.label).endsWith(`(${normalize(sku)})`));
      if (bySku) return bySku.id;
    }

    const fuzzy = list.filter(o => normalize(o.label).includes(n));
    if (fuzzy.length === 1) return fuzzy[0].id;

    return null;
  };

  useEffect(() => {
    const q = productInput.trim();
    if (timer.current) clearTimeout(timer.current);

    if (q.length < 2) {
      setProdOptions([]);
      setProductId(null);
      return;
    }

    timer.current = setTimeout(async () => {
      try {
        if (inflight.current) inflight.current.abort();
        inflight.current = new AbortController();

        const sku = extractSku(q);
        const search = sku || nameBeforeParen(q) || q;

        const list = await getProductOptions(search, 20, { signal: inflight.current.signal });
        setProdOptions(list || []);
        setProductId(findLocalId(q, list || []));
      } catch (_e) {
        setProdOptions([]);
      } finally {
        inflight.current = null;
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer.current);
    // eslint-disable-next-line
  }, [productInput]);

  const finalizeProduct = async () => {
    if (productId) return;
    const q = productInput.trim();
    if (q.length < 2) return;

    const local = findLocalId(q);
    if (local) { setProductId(local); return; }

    try {
      const list = await getProductOptions(nameBeforeParen(q) || q, 20);
      setProdOptions(list || []);
      setProductId(findLocalId(q, list || []));
    } catch (_e) { /* ignore */ }
  };

  // --- AUTOCOMPLETE LOKALIZACJI (filtr) — po 1 znaku ---
  const locDebounce = useRef(null);
  useEffect(() => {
    const q = (loc || '').trim();
    if (locDebounce.current) clearTimeout(locDebounce.current);

    if (q.length < 1) {
      setLocOptions([]);
      return;
    }

    locDebounce.current = setTimeout(async () => {
      try {
        const opts = await getLocationOptions(q, 20);
        setLocOptions(opts || []);
      } catch (_e) {
        setLocOptions([]);
      }
    }, 200);

    return () => clearTimeout(locDebounce.current);
  }, [loc]);

  // --- EDYCJA WIERSZA ---
  const startEdit = (row) => {
    setEditId(row.id);
    setDraft({
      location: row.location || '',
      quantity: row.quantity,
      reservedQuantity: row.reservedQuantity,
      condition: row.condition || 'new',
      flowStatus: row.flowStatus || 'available',
    });
  };
  const cancelEdit = () => { setEditId(null); setDraft({}); };
  const changeDraft = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const saveEdit = async (id) => {
    try {
      const payload = {
        location: (draft.location || '').trim(),
        quantity: Number(draft.quantity ?? 0),
        reservedQuantity: Number(draft.reservedQuantity ?? 0),
        condition: draft.condition,
        flowStatus: draft.flowStatus,
        lastUpdatedBy: userId,
      };

      if (!Number.isFinite(payload.quantity) || !Number.isFinite(payload.reservedQuantity)) {
        toast.error('Podaj poprawne liczby w polach Ilość / Zarezerw.');
        return;
      }
      if (payload.quantity < 0 || payload.reservedQuantity < 0) {
        toast.error('Ilości nie mogą być ujemne.');
        return;
      }

      const updated = await updateInventoryItem(id, payload);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updated } : it)));
      toast.success('Zapisano zmiany.');
      cancelEdit();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd aktualizacji pozycji');
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

  const applyFilters = async () => {
    await finalizeProduct();
    load();
  };

  const resetFilters = () => {
    setProductInput('');
    setProductId(null);
    setLoc('');
    setOnlyLow(false);
    setFlowStatus('');
    setSort('idAsc');
    load();
  };

  // --- EKSPORT ---
  const makeExportParams = () => ({
    productId: productId || undefined,
    location: loc || undefined,
    lowStock: onlyLow || undefined,
    flowStatus: flowStatus || undefined,
  });

  const onExportCSV = async () => {
    try {
      await finalizeProduct();
      await downloadInventoryCSV(makeExportParams());
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Nie udało się wyeksportować CSV');
    }
  };

  const onExportPDF = async () => {
    try {
      await finalizeProduct();
      await downloadInventoryPDF(makeExportParams());
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Nie udało się wyeksportować PDF');
    }
  };

  return (
    <div className="inventory-page">
      <h1>Magazyn</h1>

      {/* FILTRY */}
      <div className="filters">
        <input
          list="product-filter-options"
          placeholder="Produkt (nazwa / SKU)"
          value={productInput}
          onChange={(e) => { setProductInput(e.target.value); setProductId(findLocalId(e.target.value)); }}
          onBlur={finalizeProduct}
          style={{ minWidth: 240 }}
        />
        <datalist id="product-filter-options">
          {prodOptions.map((o) => <option key={o.id} value={o.label} />)}
        </datalist>

        {/* Lokalizacja – podpowiedzi po 1 znaku */}
        <input
          list="loc-filter-options"
          placeholder="Lokalizacja"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <datalist id="loc-filter-options">
          {locOptions.map(o => <option key={o.id} value={o.label} />)}
        </datalist>

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {sorters.map((s) => (
            <option key={s.value} value={s.value}>{`Sort: ${s.label}`}</option>
          ))}
        </select>

        <select value={flowStatus} onChange={(e) => setFlowStatus(e.target.value)} style={{ minWidth: 170 }}>
          {FLOW_STATUSES.map(o => <option key={o.value || 'any'} value={o.value}>{o.label}</option>)}
        </select>

        <label className="checkbox-label">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Niski stan
        </label>

        <button onClick={applyFilters}>Szukaj</button>
        <button onClick={resetFilters}>Reset</button>

        {/* EKSPORT */}
        <div className="export-buttons">
          <button onClick={onExportCSV}>Eksport CSV</button>
          <button onClick={onExportPDF}>Eksport PDF</button>
          <button onClick={() => navigate('/inventory/new')}>+ Dodaj pozycję</button>
        </div>
      </div>

      {/* TABELA */}
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Produkt</th>
              <th>Lokalizacja</th>
              <th>Ilość</th>
              <th>Zarezerw.</th>
              <th>Dostępna</th>
              <th>Stan</th>
              <th>Status (przepływ)</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 16 }}>Ładowanie…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 16 }}>Brak pozycji</td></tr>
            ) : (
              visible.map((row) => {
                const available = Math.max(0, (row.quantity || 0) - (row.reservedQuantity || 0));
                const isEdit = editId === row.id;
                const auto = getAutoStatus(row);

                const disableOut = row.flowStatus === 'damaged' || row.flowStatus === 'in_transit' || available <= 0;
                const disableTransfer = row.flowStatus === 'damaged' || available <= 0;

                return (
                  <tr key={row.id}>
                    <td style={{ width: 80 }}>{row.id}</td>

                    <td>
                      <div className="product-cell">
                        <strong>{row.product?.name || '—'}</strong>
                        <span className="sku">
                          {row.product?.sku ? `(${row.product.sku})` : ''}
                        </span>
                      </div>
                    </td>

                    <td style={{ width: 200 }}>
                      {isEdit ? (
                        <LocationSelect value={draft.location} onChange={(v) => changeDraft('location', v)} />
                      ) : (
                        row.location || '—'
                      )}
                    </td>

                    <td style={{ width: 120 }}>
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

                    <td style={{ width: 120 }}>
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

                    <td style={{ width: 100 }}>{available}</td>

                    <td style={{ width: 160 }}>
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

                    <td style={{ width: 220 }}>
                      {isEdit ? (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <select
                            value={draft.flowStatus}
                            onChange={(e) => changeDraft('flowStatus', e.target.value)}
                          >
                            <option value="available">available</option>
                            <option value="in_transit">in_transit</option>
                            <option value="damaged">damaged</option>
                          </select>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            auto:{' '}<AutoBadge value={getAutoStatus({ ...row, ...draft })} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <FlowBadge status={row.flowStatus} />
                          {auto && (
                            <>
                              <span style={{ fontSize: 12, color: '#6b7280' }}>auto:</span>
                              <AutoBadge value={auto} />
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="actions-cell">
                      <div className="actions">
                        {isEdit ? (
                          <>
                            <button className="btn btn-primary" onClick={() => saveEdit(row.id)}>Zapisz</button>
                            <button className="btn" onClick={cancelEdit}>Anuluj</button>
                          </>
                        ) : (
                          <>
                            <button className="btn" onClick={() => openOp(row, 'in')}>Przyjęcie</button>
                            <button
                              className="btn"
                              onClick={() => openOp(row, 'out')}
                              disabled={disableOut}
                              title={disableOut ? 'Brak dostępnej ilości / pozycja uszkodzona / w tranzycie' : ''}
                            >
                              Wydanie
                            </button>
                            <button
                              className="btn"
                              onClick={() => openOp(row, 'transfer')}
                              disabled={disableTransfer}
                              title={disableTransfer ? 'Brak dostępnej ilości / pozycja uszkodzona' : ''}
                            >
                              Przenieś
                            </button>
                            <button className="btn" onClick={() => startEdit(row)}>Edytuj</button>
                            <Link className="linklike" to={`/inventory/${row.id}`}>Szczegóły</Link>
                            <button className="btn danger" onClick={() => removeRow(row)}>Usuń</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pływający pasek zapisu – zawsze dostępny w trybie edycji */}
      {editId && (
        <div className="edit-floating-bar">
          <span>Edytujesz pozycję #{editId}</span>
          <button className="btn btn-primary" onClick={() => saveEdit(editId)}>Zapisz</button>
          <button className="btn" onClick={cancelEdit}>Anuluj</button>
        </div>
      )}

      <OperationModal
        open={opModal.open}
        type={opModal.type}
        item={opModal.item}
        onClose={closeOp}
        onDone={load}
      />
    </div>
  );
}
