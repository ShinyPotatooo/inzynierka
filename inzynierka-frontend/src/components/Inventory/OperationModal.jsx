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

  // REZERWACJE
  const [useReserved, setUseReserved] = useState(false);  // OUT: wydaj z puli zarezerwowanej
  const [reserveAfter, setReserveAfter] = useState(false); // IN: zarezerwuj część przyjmowanej ilości
  const [reserveAmount, setReserveAmount] = useState(0);   // IN: ile z przyjęcia zarezerwować

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQty('');
      setWhen(nowLocalDatetimeValue());
      setNotes('');
      setToLocation('');
      setUseReserved(false);
      setReserveAfter(false);
      setReserveAmount(0);
    }
  }, [open]);

  // --- Uwaga: HOOKI MUSZĄ BYĆ ZAWSZE WYWOŁANE ---
  // Liczymy wartości bezpiecznie nawet gdy item == null, a dopiero potem ewentualnie zwracamy null.

  const totalQty = Number(item?.quantity || 0);
  const reservedQty = Number(item?.reservedQuantity || 0);

  const available = useMemo(
    () => Math.max(0, totalQty - reservedQty),
    [totalQty, reservedQty]
  );

  // maks. out (gdy zaznaczone „z rezerwacji”, limit to reservedQty)
  const maxOut = useMemo(
    () => (useReserved ? reservedQty : available),
    [useReserved, reservedQty, available]
  );

  // maks. ile można od razu zarezerwować z przyjęcia
  const maxReserveOnReceive = useMemo(() => {
    const q = Number(qty || 0);
    if (q <= 0) return 0;
    // Po przyjęciu: newTotal = totalQty + q; rezerwacja nie może przekroczyć newTotal.
    return Math.max(0, Math.min(q, totalQty + q - reservedQty));
  }, [qty, totalQty, reservedQty]);

  // Dopiero tutaj możemy warunkowo nic nie renderować
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

      if (type === 'out') {
        if (useReserved) {
          if (q > reservedQty) {
            toast.error('Nie możesz wydać więcej niż zarezerwowane.');
            return;
          }
        } else if (q > available) {
          toast.error('Brak dostępnej ilości do wydania.');
          return;
        }
      }

      if (type === 'in' && reserveAfter) {
        const r = Number(reserveAmount || 0);
        if (r < 0) {
          toast.error('Rezerwacja nie może być ujemna.');
          return;
        }
        if (r > maxReserveOnReceive) {
          toast.error(`Maksymalna rezerwacja z przyjęcia: ${maxReserveOnReceive}`);
          return;
        }
      }

      setSaving(true);

      if (type === 'in' || type === 'out') {
        const payload = {
          inventoryItemId: item.id,
          operationType: type,
          quantity: q,
          userId,
          operationDate: when,
          notes: notes || undefined,
        };

        if (type === 'out') {
          payload.useReserved = !!useReserved;
        } else if (type === 'in') {
          payload.reserveAfter = !!reserveAfter;
          payload.reserveAmount = reserveAfter
            ? Math.min(Number(reserveAmount || 0), maxReserveOnReceive)
            : 0;
        }

        await createInventoryOperation(payload);
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
        if (q > available) {
          toast.error('Nie możesz przenieść więcej niż dostępne.');
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
        // Zmiana statusu: in_transit -> available (bez zmiany ilości)
        await updateInventoryItem(item.id, {
          flowStatus: 'available',
          lastUpdatedBy: userId,
          operationDate: when, // zapisze się jako adjustment 0 w logach
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
            <div>
              <strong>{item.product?.name}</strong>{' '}
              {item.product?.sku ? `(${item.product.sku})` : ''}
            </div>
            <div>Lok.: <strong>{item.location || '—'}</strong></div>
            <div>
              Stan: <strong>{totalQty}</strong>{' '}
              &nbsp;|&nbsp; Zarezerw.: <strong>{reservedQty}</strong>{' '}
              &nbsp;|&nbsp; Dostępne: <strong>{available}</strong>
            </div>
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
                  {useReserved
                    ? `Maks. z rezerwacji: ${reservedQty}`
                    : `Dostępne: ${available}`}
                </small>
              )}
            </div>
          )}

          {type === 'out' && (
            <label className="row" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={useReserved}
                onChange={(e) => setUseReserved(e.target.checked)}
                disabled={reservedQty <= 0}
              />
              <span>Wydaj z puli zarezerwowanej (max: {reservedQty})</span>
            </label>
          )}

          {type === 'in' && (
            <div className="reserve-block">
              <label className="row">
                <input
                  type="checkbox"
                  checked={reserveAfter}
                  onChange={(e) => setReserveAfter(e.target.checked)}
                />
                <span>Zarezerwuj z przyjęcia</span>
              </label>

              <label className="inline" style={{ marginTop: 6 }}>
                Ile zarezerwować
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={reserveAmount}
                  onChange={(e) => setReserveAmount(e.target.value)}
                  disabled={!reserveAfter}
                />
              </label>
              <div className="hint">Max: {maxReserveOnReceive}</div>
            </div>
          )}

          <div className="field" style={{ marginTop: 8 }}>
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
          width: 560px; max-width: calc(100vw - 32px);
          background: #fff; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.15);
        }
        .modal-header { padding: 12px 16px; border-bottom: 1px solid #eee; }
        .modal-body { padding: 12px 16px; }
        .modal-footer { padding: 12px 16px; border-top: 1px solid #eee; }
        .field label { display:block; font-weight:600; margin-bottom:4px; }
        .field input, .field textarea, .field select { width:100%; }
        .row { display:flex; gap:8px; align-items:center; }
        .reserve-block { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; margin-top:6px;}
        .inline { display:grid; grid-template-columns: 1fr 140px; align-items:center; gap:8px; }
        .hint { font-size:.85rem; color:#6b7280; margin-top:4px; }
      `}</style>
    </div>
  );
}
