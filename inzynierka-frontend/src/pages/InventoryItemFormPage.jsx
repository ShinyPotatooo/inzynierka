import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles/inventory-theme.css';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { getProductOptions } from '../services/products';
import { createInventoryItem } from '../services/inventory';

const DEBOUNCE_MS = 300;

const normalize = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const extractSku = (label = '') => {
  const m = String(label).match(/\(([^()]+)\)\s*$/);
  return m ? m[1].trim() : null;
};
const labelNamePart = (label = '') => String(label).split('(')[0].trim();

export default function InventoryItemFormPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? 1;

  // PRODUCT FIELD
  const [productQuery, setProductQuery] = useState('');
  const [productId, setProductId] = useState(null);
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);

  // OTHER FIELDS
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reservedQuantity, setReservedQuantity] = useState('');
  const [condition, setCondition] = useState('new');
  const [flowStatus, setFlowStatus] = useState('available'); // <= NOWE
  const [supplier, setSupplier] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [notes, setNotes] = useState('');

  const delayer = useRef(null);

  /** Lokalne dopasowanie */
  const tryLocal = useCallback((value, list = []) => {
    const n = normalize(value);
    const exact = list.find(o => normalize(o.label) === n);
    if (exact) return exact.id;
    const sku = extractSku(value);
    if (sku) {
      const bySku = list.find(o => normalize(o.label).endsWith(`(${normalize(sku)})`));
      if (bySku) return bySku.id;
    }
    const fuzzy = list.filter(o => normalize(o.label).includes(n));
    if (fuzzy.length === 1) return fuzzy[0].id;
    return null;
  }, []);

  /** 1) Ładowanie propozycji (po wpisie) */
  useEffect(() => {
    const q = productQuery.trim();
    if (delayer.current) clearTimeout(delayer.current);

    if (q.length < 2) {
      setOptions([]);
      setProductId(null);
      return;
    }

    delayer.current = setTimeout(async () => {
      try {
        setFetching(true);
        const sku = extractSku(q);
        const search = sku || labelNamePart(q) || q;
        const list = await getProductOptions(search, 20);
        setOptions(list || []);
        const local = tryLocal(q, list || []);
        setProductId(local);
      } catch (e) {
        console.error(e);
        setOptions([]);
        setProductId(null);
      } finally {
        setFetching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(delayer.current);
  }, [productQuery, tryLocal]);

  const finalizeProductChoice = async () => {
    if (productId) return;
    const q = productQuery.trim();
    if (q.length < 2) return;

    let chosen = tryLocal(q, options);
    if (chosen) { setProductId(chosen); return; }

    try {
      setFetching(true);
      const nameOnly = labelNamePart(q) || q;
      const list = await getProductOptions(nameOnly, 20);
      setOptions(list || []);
      chosen = tryLocal(q, list || []);
      setProductId(chosen);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const onProductChange = (val) => {
    setProductQuery(val);
    const local = tryLocal(val, options);
    setProductId(local);
  };

  /** SUBMIT */
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!productId) await finalizeProductChoice();

    if (!productId) {
      toast.warning('Wybierz produkt z listy');
      return;
    }
    if (!location.trim()) {
      toast.error('Lokalizacja jest wymagana');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Ilość musi być większa od zera');
      return;
    }

    try {
      const payload = {
        productId,
        location: location.trim(),
        quantity: qty,
        reservedQuantity: reservedQuantity ? Number(reservedQuantity) : 0,
        condition,
        flowStatus, // <= NOWE
        supplier: supplier || undefined,
        batchNumber: batchNumber || undefined,
        purchaseOrderNumber: purchaseOrderNumber || undefined,
        manufacturingDate: mfgDate || undefined,
        expiryDate: expDate || undefined,
        notes: notes || undefined,
        lastUpdatedBy: userId,
      };

      const created = await createInventoryItem(payload);
      toast.success(`Dodano pozycję (ID: ${created.id})`);
      navigate('/inventory');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Błąd dodawania pozycji');
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-header">
        <h1 style={{ margin: 0 }}>
          Nowa pozycja <span style={{ color: '#64748b' }}>w magazynie</span>
        </h1>
      </div>

      <div className="inv-card">
        <form onSubmit={onSubmit} className="form-grid">
          {/* LEWA KOLUMNA */}
          <div className="field">
            <label>Produkt (nazwa / SKU)</label>
            <input
              list="product-options"
              placeholder="Nazwa / SKU"
              value={productQuery}
              onChange={(e) => onProductChange(e.target.value)}
              onBlur={finalizeProductChoice}
              autoFocus
            />
            <datalist id="product-options">
              {options.map((o) => (
                <option key={o.id} value={o.label} />
              ))}
            </datalist>
            <small>{fetching ? 'Szukam…' : 'Wybierz dokładnie z listy'}</small>
          </div>

          <div className="field">
            <label>Ilość</label>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="np. 20"
            />
          </div>

          <div className="field">
            <label>Lokalizacja</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="np. A1-01-20"
            />
          </div>

          <div className="field">
            <label>Stan</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="new">Nowy</option>
              <option value="good">Dobry</option>
              <option value="fair">Umiarkowany</option>
              <option value="damaged">Uszkodzony</option>
              <option value="expired">Przeterminowany</option>
            </select>
          </div>

          <div className="field">
            <label>Status (przepływ)</label>
            <select value={flowStatus} onChange={(e) => setFlowStatus(e.target.value)}>
              <option value="available">available</option>
              <option value="in_transit">in_transit</option>
              <option value="reserved">reserved</option>
              <option value="damaged">damaged</option>
            </select>
            <small style={{ color:'#6b7280' }}>
              Wybierz „reserved” aby oznaczyć rezerwację; rozważ ustawienie pola „Zarezerwowana”.
            </small>
          </div>

          <div className="field">
            <label>Zarezerwowana (opcjonalnie)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={reservedQuantity}
              onChange={(e) => setReservedQuantity(e.target.value)}
              placeholder="np. 5"
            />
          </div>

          <div className="field">
            <label>Batch (opcjonalnie)</label>
            <input
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="np. BATCH-2024-001"
            />
          </div>

          <div className="field">
            <label>Dostawca (opcjonalnie)</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="np. RTV.EURO"
            />
          </div>

          <div className="field">
            <label>Nr zamówienia (opcjonalnie)</label>
            <input
              value={purchaseOrderNumber}
              onChange={(e) => setPurchaseOrderNumber(e.target.value)}
              placeholder="np. PO-2024-001"
            />
          </div>

          <div className="field">
            <label>Data produkcji (opcjonalnie)</label>
            <input
              type="date"
              value={mfgDate}
              onChange={(e) => setMfgDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Data ważności (opcjonalnie)</label>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
            />
          </div>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Notatki</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informacje dodatkowe…"
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button className="inv-btn" type="submit">Zapisz</button>
            <button
              type="button"
              className="inv-btn inv-btn--ghost"
              onClick={() => navigate('/inventory')}
            >
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
