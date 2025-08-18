import React, { useEffect, useState, useContext } from 'react';
import { toast } from 'react-toastify';
import { getProductOptions } from '../../services/products';
import { AuthContext } from '../../context/AuthContext';

const DEBOUNCE_MS = 350;

function normalize(str = '') {
  return String(str).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Wyciąga SKU z końca etykiety: "Nazwa (SKU)" -> "SKU" */
function extractSku(label = '') {
  const m = String(label).match(/\(([^()]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

/** Tekst przed nawiasem, np. "Nazwa (SKU)" -> "Nazwa" */
function beforeParen(label = '') {
  return String(label).split('(')[0].trim();
}

const ItemForm = ({ onAdd }) => {
  const { user } = useContext(AuthContext); // zakładam, że tu masz { id, ... }
  const userId = user?.id ?? 1;             // fallback 1 (zgodny z backendem)

  const [productInput, setProductInput] = useState('');
  const [productId, setProductId] = useState(null);
  const [options, setOptions] = useState([]);
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  /** Próbujemy znaleźć ID lokalnie w obecnych opcjach */
  const findIdLocally = (q) => {
    const n = normalize(q);
    const sku = extractSku(q);

    // 1) dokładne dopasowanie etykiety
    let exact = options.find(o => normalize(o.label) === n);
    if (exact) return exact.id;

    // 2) dopasowanie po SKU (jeśli jest)
    if (sku) {
      const bySku = options.find(o => o.label.endsWith(`(${sku})`));
      if (bySku) return bySku.id;
    }

    // 3) jedyne dopasowanie "zawiera"
    const fuzzy = options.filter(o => normalize(o.label).includes(n));
    if (fuzzy.length === 1) return fuzzy[0].id;

    return null;
  };

  /** Zdalna próba rozstrzygnięcia ID (najpierw po SKU, potem po nazwie) */
  const tryResolveIdRemotely = async (q) => {
    const sku = extractSku(q);
    const nameOnly = beforeParen(q);

    // najpierw spróbuj po SKU
    if (sku) {
      const listBySku = await getProductOptions(sku, 20);
      if (listBySku.length === 1) return listBySku[0].id;
      const exactBySku = listBySku.find(o => o.label.endsWith(`(${sku})`));
      if (exactBySku) return exactBySku.id;
    }

    // a teraz po samej nazwie
    const listByName = await getProductOptions(nameOnly || q, 20);
    if (listByName.length === 1) return listByName[0].id;

    const n = normalize(nameOnly || q);
    const exactByName = listByName.find(o => normalize(o.label) === n);
    if (exactByName) return exactByName.id;

    const fuzzy = listByName.filter(o => normalize(o.label).includes(n));
    if (fuzzy.length === 1) return fuzzy[0].id;

    if ((listByName.length > 1) || (fuzzy.length > 1)) {
      toast.warn('Znaleziono kilka podobnych produktów — doprecyzuj wybór i kliknij z listy.');
    }
    return null;
  };

  // Ładowanie podpowiedzi. Preferujemy szukanie po samym SKU, jeśli wpisano etykietę z nawiasem.
  useEffect(() => {
    const q = productInput.trim();
    if (q.length < 2) {
      setOptions([]);
      setProductId(null);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const sku = extractSku(q);
        const search = sku || beforeParen(q) || q; // najpierw SKU, potem nazwa
        const list = await getProductOptions(search); // [{id,label}]
        setOptions(list || []);

        // Auto-wybór, jeśli to jednoznaczne
        const localId = findIdLocally(q);
        setProductId(localId);
      } catch (e) {
        console.error(e);
        setOptions([]);
        setProductId(null);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productInput]);

  const handleProductChange = (e) => {
    const val = e.target.value;
    setProductInput(val);

    // natychmiast spróbuj dopasować po bieżących opcjach,
    // żeby nie czekać na debounce kolejnego fetch'a
    const localId = findIdLocally(val);
    setProductId(localId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quantity || Number(quantity) <= 0) {
      toast.error('Podaj dodatnią ilość');
      return;
    }
    if (!location.trim()) {
      toast.error('Lokalizacja jest wymagana');
      return;
    }

    let chosenId = productId;
    const q = productInput.trim();

    // 1) jeszcze raz spróbuj lokalnie
    if (!chosenId) chosenId = findIdLocally(q);

    // 2) spróbuj zdalnie (najpierw SKU, potem nazwa)
    if (!chosenId && q.length >= 2) {
      try {
        setLoading(true);
        chosenId = await tryResolveIdRemotely(q);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (!chosenId) {
      toast.error('Wybierz produkt z listy');
      return;
    }

    onAdd({
      productId: chosenId,
      location: location.trim(),
      quantity: parseInt(quantity, 10),
      condition: 'new',
      lastUpdatedBy: userId, // -> backend zapisze w logach
      // opcjonalne pola możesz dodać w UI i przekazać tutaj w przyszłości:
      // supplier, purchaseOrderNumber, batchNumber, notes, ...
    });

    // reset
    setProductInput('');
    setProductId(null);
    setLocation('');
    setQuantity('');
    setOptions([]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}
    >
      <input
        list="product-options"
        placeholder="Wpisz nazwę lub SKU i wybierz z listy"
        value={productInput}
        onChange={handleProductChange}
        style={{ minWidth: 360 }}
      />
      <datalist id="product-options">
        {options.map(opt => (
          <option key={opt.id} value={opt.label} />
        ))}
      </datalist>

      <input
        type="text"
        placeholder="Lokalizacja"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{ width: 180 }}
      />

      <input
        type="number"
        placeholder="Ilość"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        style={{ width: 90 }}
        min={1}
        step={1}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Sprawdzam…' : 'Dodaj'}
      </button>
    </form>
  );
};

export default ItemForm;
