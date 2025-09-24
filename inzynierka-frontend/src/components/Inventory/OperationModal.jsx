// src/components/Inventory/OperationModal.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  createInventoryOperation,
  createInventoryTransfer,
  updateInventoryItem,
} from '../../services/inventory';
import LocationSelect from './LocationSelect';
import { toast } from 'react-toastify';

function nowLocalDatetimeValue() {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function OperationModal({ open, type, item, onClose, onDone }) {
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? 1;

  const [qty, setQty] = useState('');
  const [when, setWhen] = useState(nowLocalDatetimeValue());
  const [notes, setNotes] = useState('');

  // transfer-only
  const [toLocation, setToLocation] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQty('');
      setWhen(nowLocalDatetimeValue());
      setNotes('');
      setToLocation('');
    }
  }, [open]);

  const available = useMemo(() => {
    if (!item) return 0;
    return Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0));
  }, [item]);

  if (!open || !item) return null;

  const titleMap = {
    in: 'Przyjęcie towaru',
    out: 'Wydanie towaru',
    transfer: 'Transfer między lokalizacjami',
    receive: 'Odbiór z tranzytu',
  };
  const title = titleMap[type] || 'Operacja';

  const submit = async () => {
    try {
      const q = Number(qty);

      if (type === 'in' || type === 'out' || type === 'transfer') {
        if (!q || q <= 0) {
          toast.error('Podaj dodatnią ilość');
          return;
        }
      }
      if (type === 'out' && q > available) {
        toast.error('Brak dostępnej ilości do wydania');
        return;
      }

      setSaving(true);

      if (type === 'in' || type === 'out') {
        await createInventoryOperation({
          inventoryItemId: item.id,
          operationType: type,
          quantity: q,
          userId,
          operationDate: when,
          notes: notes || undefined,
        });
        toast.success('Operacja zapisana');
      } else if (type === 'transfer') {
        if (!toLocation) {
          toast.error('Wybierz lokalizację docelową');
          setSaving(false);
          return;
        }
        if (toLocation.trim().toLowerCase() === String(item.location || '').trim().toLowerCase()) {
          toast.error('Lokalizacja docelowa nie może być taka sama');
          setSaving(false);
          return;
        }

        await createInventoryTransfer({
          fromItemId: item.id,
          toLocation,
          quantity: q,
          userId,
          operationDate: when,
          notes: notes || undefined,
        });
        toast.success('Transfer zarejestrowany');
      } else if (type === 'receive') {
        // tylko zmiana statusu z in_transit -> available (bez zmiany ilości)
        await updateInventoryItem(item.id, {
          flowStatus: 'available',
          lastUpdatedBy: userId,
          operationDate: when, // backend użyje tego do logu
          notes: notes || undefined,
        });
        toast.success('Odebrano z tranzytu');
      } else {
        toast.error('Nieobsługiwany typ operacji w UI');
        setSaving(false);
        return;
      }

      onClose?.();
      onDone?.();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || 'Błąd zapisu operacji');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: 8, color: '#64748b' }}>
            <div><strong>{item.product?.name}</strong> {item.product?.sku ? `(${item.product.sku})` : ''}</div>
            <div>Lok.: <strong>{item.location || '—'}</strong></div>
          </div>

          {type === 'transfer' && (
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Do lokalizacji</label>
              <LocationSelect value={toLocation} onChange={setToLocation} />
              <small style={{ color: '#64748b' }}>
                Po transferze pozycja w docelowej lokalizacji zostanie oznaczona jako <em>in_transit</em>.
              </small>
            </div>
          )}

          {(type === 'in' || type === 'out' || type === 'transfer') && (
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Ilość</label>
              <input
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                autoFocus
              />
              {type === 'out' && (
                <small style={{ color: '#64748b' }}>
                  Dostępne: {available}
                </small>
              )}
            </div>
          )}

          <div className="field" style={{ marginBottom: 8 }}>
            <label>Data operacji</label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <label>Notatki (opcjonalnie)</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving}>Anuluj</button>
          <button onClick={submit} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz operację'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,.3);
          display: flex; align-items: center; justify-content: center; z-index: 50;
        }
        .modal {
          width: 520px; max-width: calc(100vw - 32px);
          background: #fff; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,.15);
        }
        .modal-header { padding: 12px 16px; border-bottom: 1px solid #eee; }
        .modal-body { padding: 12px 16px; }
        .modal-footer { padding: 12px 16px; border-top: 1px solid #eee; }
        .field label { display:block; font-weight:600; margin-bottom:4px; }
        .field input, .field textarea, .field select { width:100%; }
      `}</style>
    </div>
  );
}
