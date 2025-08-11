import React, { useEffect, useMemo, useState } from 'react';
import { getProductOptions } from '../../services/products';
import { toast } from 'react-toastify';

const DEBOUNCE_MS = 300;

const ItemForm = ({ onAdd }) => {
  const [productQuery, setProductQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null); // { id, label }
  const [open, setOpen] = useState(false);

  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');

  // Debounce query
  useEffect(() => {
    setSelected(null); // jeśli edytujemy tekst, zdejmij zaznaczenie
    if (!productQuery) { setOptions([]); return; }

    const t = setTimeout(async () => {
      try {
        const opts = await getProductOptions(productQuery);
        setOptions(opts);
        setOpen(true);
      } catch (e) {
        console.error(e);
        toast.error('Nie udało się pobrać listy produktów');
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [productQuery]);

  const handleChoose = (opt) => {
    setSelected(opt);
    setProductQuery(opt.label);
    setOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selected?.id) {
      toast.error('Wybierz produkt z listy');
      return;
    }
    if (!location || !quantity) {
      toast.error('Wypełnij lokalizację i ilość');
      return;
    }

    onAdd({
      productId: selected.id,
      location,
      quantity: parseInt(quantity, 10)
    });

    // reset
    setSelected(null);
    setProductQuery('');
    setLocation('');
    setQuantity('');
    setOptions([]);
    setOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1rem', display: 'grid', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Produkt (nazwa lub SKU)"
          value={productQuery}
          onChange={(e) => { setProductQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (options.length) setOpen(true); }}
          required
        />
        {open && options.length > 0 && (
          <ul
            style={{
              position: 'absolute',
              zIndex: 10,
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: 220,
              overflowY: 'auto',
              background: 'white',
              border: '1px solid #ddd',
              borderTop: 'none',
              listStyle: 'none',
              margin: 0,
              padding: 0
            }}
          >
            {options.map((opt) => (
              <li
                key={opt.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleChoose(opt)}
                style={{ padding: '8px 10px', cursor: 'pointer' }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        type="text"
        placeholder="Lokalizacja"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Ilość"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        min={1}
        required
      />
      <button type="submit">Dodaj</button>
    </form>
  );
};

export default ItemForm;

