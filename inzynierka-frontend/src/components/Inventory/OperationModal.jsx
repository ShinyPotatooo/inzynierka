import React, { useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { createInventoryOperation } from '../../services/inventory';

const pad = (n) => String(n).padStart(2, '0');
function nowLocalInput() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OperationModal({ open, type, item, onClose, onDone }) {
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? 1;

  const [qty, setQty] = useState('');
  const [date, setDate] = useState(nowLocalInput());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = type === 'in' ? 'Przyjęcie towaru' : 'Wydanie towaru';
  const available = useMemo(
    () => Math.max(0, (item?.quantity ?? 0) - (item?.reservedQuantity ?? 0)),
    [item]
  );
  const reserved = item?.reservedQuantity ?? 0;

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    const q = parseInt(qty, 10);
    if (!q || q <= 0) { toast.warn('Podaj dodatnią liczbę sztuk.'); return; }

    if (type === 'out') {
      // szybka walidacja flowStatus (backend też sprawdza)
      if (item?.flowStatus === 'damaged') {
        toast.error('Pozycja uszkodzona — wydanie zablokowane.');
        return;
      }
      if (item?.flowStatus === 'in_transit') {
        toast.error('Pozycja w tranzycie — najpierw przyjmij lub zmień status.');
        return;
      }
      // Rezerwacje v1.5: dopuszczamy do poziomu całkowitego stanu (rezerwacja + dostępne)
      const total = Number(item?.quantity || 0);
      if (q > total) {
        toast.error(`Za mało sztuk (stan całkowity: ${total}).`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await createInventoryOperation({
        inventoryItemId: item.id,
        operationType: type,
        quantity: q,
        userId,
        operationDate: date,
        notes: notes?.trim() || (type === 'in' ? 'Przyjęcie (UI)' : 'Wydanie (UI)'),
      });
      if (type === 'out' && reserved > 0) {
        toast.info('Wydanie rozliczy rezerwację w pierwszej kolejności.');
      }
      toast.success(type === 'in' ? 'Przyjęto' : 'Wydano');
      onClose?.(); onDone?.();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Błąd operacji');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true"
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'grid', placeItems:'center', zIndex:1000 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}
        style={{ width:520, maxWidth:'92vw', background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 10px 30px rgba(0,0,0,.15)', padding:16 }}
      >
        <h2 style={{ margin:'0 0 8px' }}>{title}</h2>
        <p style={{ margin:'0 0 12px', color:'#6b7280' }}>
          {item?.product?.name} {item?.product?.sku ? `(${item.product.sku})` : ''} • Lok.: {item?.location || '—'}
        </p>

        {type === 'out' && reserved > 0 && (
          <div style={{ marginBottom: 8, fontSize: 13, color: '#374151' }}>
            Rezerwacja: <strong>{reserved}</strong> (zostanie skonsumowana w pierwszej kolejności).
          </div>
        )}

        <form onSubmit={submit} style={{ display:'grid', gap:10 }}>
          <label>
            Ilość
            <input type="number" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} style={{ width:160, marginLeft:8 }} autoFocus />
            {type === 'out' && (
              <span style={{ marginLeft: 8, color: '#6b7280' }}>
                (dostępne: {available} / stan: {Number(item?.quantity || 0)})
              </span>
            )}
          </label>

          <label>
            Data operacji
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 8 }} />
          </label>

          <label style={{ display:'grid', gap:6 }}>
            Notatki (opcjonalnie)
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:6 }}>
            <button type="button" onClick={onClose} className="btn">Anuluj</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Zapisywanie…' : 'Zapisz operację'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

OperationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  type: PropTypes.oneOf(['in', 'out']).isRequired,
  item: PropTypes.object,
  onClose: PropTypes.func,
  onDone: PropTypes.func,
};
