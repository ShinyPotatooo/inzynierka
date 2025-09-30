import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { getInventoryItem, updateInventoryItem } from '../services/inventory';
import LocationSelect from '../components/Inventory/LocationSelect';

function FlowBadge({ status }) {
  const map = {
    available:   { bg: '#DCFCE7', fg: '#166534', label: 'available' },
    in_transit:  { bg: '#DBEAFE', fg: '#1E40AF', label: 'in_transit' },
    reserved:    { bg: '#FEF3C7', fg: '#92400E', label: 'reserved' },
    damaged:     { bg: '#FEE2E2', fg: '#991B1B', label: 'damaged' },
    empty:       { bg: '#E5E7EB', fg: '#374151', label: 'empty' },
    low:         { bg: '#FFEDD5', fg: '#9A3412', label: 'low' },
    reserved_all:{ bg: '#FFF7ED', fg: '#7C2D12', label: 'reserved_all' },
  };
  const s = map[status] || { bg: '#E5E7EB', fg: '#374151', label: status || '—' };
  return (
    <span style={{
      background: s.bg, color: s.fg, borderRadius: 999, padding: '2px 8px',
      fontSize: 12, fontWeight: 600
    }}>
      {s.label}
    </span>
  );
}

function computeAutoStatus(item) {
  const qty = Number(item.quantity || 0);
  const res = Number(item.reservedQuantity || 0);
  const avail = Math.max(0, qty - res);
  if (qty === 0) return 'empty';
  if (avail === 0) return 'reserved_all';
  if (item.flowStatus === 'in_transit') return 'in_transit';
  if (item.flowStatus === 'damaged') return 'damaged';
  const reorder = Number(item.product?.reorderPoint || 0);
  if (reorder > 0 && avail < reorder) return 'low';
  return 'available';
}

function toDateInputValue(d) {
  if (!d) return '';
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function InventoryItemDetailsPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? 1;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({});

  // ---- FIX: wrap load in useCallback and depend on [id] ----
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventoryItem(id);
      setItem(data);
      setDraft({
        location: data.location || '',
        batchNumber: data.batchNumber || '',
        purchaseOrderNumber: data.purchaseOrderNumber || '',
        supplier: data.supplier || '',
        condition: data.condition || 'new',
        flowStatus: data.flowStatus || 'available',
        reservedQuantity: data.reservedQuantity ?? 0,
        expiryDate: toDateInputValue(data.expiryDate),
        manufacturingDate: toDateInputValue(data.manufacturingDate),
        notes: data.notes || '',
      });
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd pobierania pozycji');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const changeDraft = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    try {
      const payload = {
        ...draft,
        reservedQuantity: draft.reservedQuantity === '' ? 0 : parseInt(draft.reservedQuantity, 10),
        expiryDate: draft.expiryDate || null,
        manufacturingDate: draft.manufacturingDate || null,
        lastUpdatedBy: userId,
      };
      const updated = await updateInventoryItem(item.id, payload);
      setItem((prev) => ({ ...prev, ...updated }));
      toast.success('Zapisano zmiany');
      setEdit(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd zapisu');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Ładowanie…</div>;
  if (!item) return <div style={{ padding: '2rem' }}>Nie znaleziono pozycji</div>;

  const available = (item.quantity || 0) - (item.reservedQuantity || 0);
  const auto = computeAutoStatus(item);

  return (
    <div style={{ padding: '2rem', maxWidth: 980 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/inventory">← wróć do magazynu</Link>
      </div>

      <h1>Pozycja #{item.id}</h1>
      <p>
        <strong>Produkt:</strong> {item.product?.name}{' '}
        {item.product?.sku ? `(${item.product.sku})` : ''}
      </p>

      {item.flowStatus === 'damaged' && (
        <div style={{
          padding: '10px 12px', border: '1px solid #fecaca', background: '#fff1f2',
          color: '#7f1d1d', borderRadius: 8, marginBottom: 12, fontWeight: 600
        }}>
          Pozycja oznaczona jako <em>damaged</em> – wydanie zablokowane.
        </div>
      )}

      <div style={{ margin: '16px 0', padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Lokalizacja</label>
            {edit ? (
              <LocationSelect
                value={draft.location}
                onChange={(v) => changeDraft('location', v)}
                required
              />
            ) : (<div>{item.location || '—'}</div>)}
          </div>

          <div>
            <label>Stan</label>
            {edit ? (
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
            ) : (<div>{item.condition || '—'}</div>)}
          </div>

          <div>
            <label>Status (przepływ)</label>
            {edit ? (
              <>
                <select
                  value={draft.flowStatus}
                  onChange={(e) => changeDraft('flowStatus', e.target.value)}
                >
                  <option value="available">available</option>
                  <option value="in_transit">in_transit</option>
                  <option value="damaged">damaged</option>
                </select>
                <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                  auto teraz: <FlowBadge status={computeAutoStatus({ ...item, ...draft })} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlowBadge status={auto} />
                {auto !== item.flowStatus && (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    ({item.flowStatus})
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label>Ilość</label>
            <div>{item.quantity}</div>
          </div>

          <div>
            <label>Zarezerwowana</label>
            {edit ? (
              <input
                type="number"
                min={0}
                step={1}
                value={draft.reservedQuantity}
                onChange={(e) => changeDraft('reservedQuantity', e.target.value)}
              />
            ) : (<div>{item.reservedQuantity}</div>)}
          </div>

          <div>
            <label>Dostępna</label>
            <div>{available}</div>
          </div>

          <div>
            <label>Batch</label>
            {edit ? (
              <input
                value={draft.batchNumber}
                onChange={(e) => changeDraft('batchNumber', e.target.value)}
              />
            ) : (<div>{item.batchNumber || '—'}</div>)}
          </div>

          <div>
            <label>Nr zamówienia (PO)</label>
            {edit ? (
              <input
                value={draft.purchaseOrderNumber}
                onChange={(e) => changeDraft('purchaseOrderNumber', e.target.value)}
              />
            ) : (<div>{item.purchaseOrderNumber || '—'}</div>)}
          </div>

          <div>
            <label>Dostawca</label>
            {edit ? (
              <input value={draft.supplier} onChange={(e) => changeDraft('supplier', e.target.value)} />
            ) : (<div>{item.supplier || '—'}</div>)}
          </div>

          <div>
            <label>Data produkcji</label>
            {edit ? (
              <input
                type="date"
                value={draft.manufacturingDate}
                onChange={(e) => changeDraft('manufacturingDate', e.target.value)}
              />
            ) : (
              <div>{item.manufacturingDate ? new Date(item.manufacturingDate).toLocaleDateString() : '—'}</div>
            )}
          </div>

          <div>
            <label>Data ważności</label>
            {edit ? (
              <input
                type="date"
                value={draft.expiryDate}
                onChange={(e) => changeDraft('expiryDate', e.target.value)}
              />
            ) : (
              <div>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}</div>
            )}
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label>Notatki</label>
            {edit ? (
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(e) => changeDraft('notes', e.target.value)}
                style={{ width: '100%' }}
              />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{item.notes || '—'}</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {edit ? (
            <>
              <button onClick={save} style={{ marginRight: 8 }}>
                Zapisz
              </button>
              <button onClick={() => setEdit(false)}>Anuluj</button>
            </>
          ) : (
            <button onClick={() => setEdit(true)}>Edytuj szczegóły</button>
          )}
        </div>
      </div>
    </div>
  );
}
