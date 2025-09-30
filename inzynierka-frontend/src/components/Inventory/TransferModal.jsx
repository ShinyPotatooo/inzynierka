import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import LocationSelect from './LocationSelect';
import { transferInventory } from '../../services/inventory';

export default function TransferModal({ open, item, onClose, onDone, userId = 1 }) {
  const [toLocation, setToLocation] = useState('');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const maxAvailable = useMemo(() => {
    if (!item) return 0;
    return Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0));
  }, [item]);

  const canSubmit = open && item && toLocation && Number(qty) > 0 && Number(qty) <= maxAvailable;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      await transferInventory({
        sourceItemId: item.id,
        targetLocation: toLocation,
        quantity: Number(qty),
        userId,
        notes: notes || undefined,
      });
      toast.success('Przeniesiono');
      onClose?.();
      onDone?.();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd transferu');
    } finally {
      setSaving(false);
    }
  };

  // reset przy otwarciu/zamknięciu
  React.useEffect(() => {
    if (open) {
      setToLocation('');
      setQty(String(maxAvailable || ''));
      setNotes('');
    }
  }, [open, maxAvailable]);

  if (!open || !item) return null;

  return (
    <div style={styles.backdrop} onMouseDown={onClose}>
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Przenieś pozycję</h3>

        <div style={styles.row}>
          <div style={styles.col}>
            <label>Produkt</label>
            <div>
              <strong>{item.product?.name}</strong> {item.product?.sku ? `(${item.product.sku})` : ''}
            </div>
          </div>
          <div style={styles.col}>
            <label>Z lokalizacji</label>
            <div>{item.location}</div>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.col}>
            <label>Do lokalizacji</label>
            <LocationSelect value={toLocation} onChange={setToLocation} required />
          </div>
          <div style={styles.col}>
            <label>Ilość (max {maxAvailable})</label>
            <input
              type="number"
              min={1}
              max={maxAvailable}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <label>Uwagi (opcjonalnie)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="np. pilne przeniesienie"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="inv-btn inv-btn--ghost">Anuluj</button>
          <button onClick={submit} disabled={!canSubmit || saving} className="inv-btn">
            {saving ? 'Zapisywanie…' : 'Przenieś'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  },
  modal: {
    width: 640, maxWidth: '92vw', background: '#fff', borderRadius: 10,
    padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,.2)'
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 },
  col: {},
};
