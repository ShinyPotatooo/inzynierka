// src/pages/ProductPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../services/products';
import { getCategoryOptions, ensureCategory } from '../services/categories';

const numberOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function ProductPage() {
  const navigate = useNavigate();
  const { id } = useParams(); // 'new' | ':id'
  const isNew = id === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',       // <-- tekst kategorii (zgodny z kolumną w DB)
    brand: '',
    unit: 'szt',
    price: '',
    cost: '',
    minStockLevel: '',
    reorderPoint: '',
    maxStockLevel: '',
    status: 'active',
    weight: '',
    barcode: '',
    imageUrl: '',
  });

  // --- kategorie: autosugestia
  const [catQuery, setCatQuery] = useState('');
  const [catOpts, setCatOpts] = useState([]);
  useEffect(() => {
    let ignore = false;
    const q = catQuery.trim();
    if (q.length < 1) { setCatOpts([]); return; }
    (async () => {
      try {
        const opts = await getCategoryOptions(q, 20);
        if (!ignore) setCatOpts(opts || []);
      } catch {
        if (!ignore) setCatOpts([]);
      }
    })();
    return () => { ignore = true; };
  }, [catQuery]);

// --- załaduj produkt do edycji
useEffect(() => {
  let ignore = false;

  const load = async () => {
    // ⬇⬇⬇ kluczowa linia — nie pobieraj nic, jeśli nie ma id lub to /new
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const p = await getProductById(id);
      if (ignore) return;
      setForm({
        sku: p.sku || '',
        name: p.name || '',
        description: p.description || '',
        category: p.category || '',
        brand: p.brand || '',
        unit: p.unit || 'szt',
        price: p.price ?? '',
        cost: p.cost ?? '',
        minStockLevel: p.minStockLevel ?? '',
        reorderPoint: p.reorderPoint ?? '',
        maxStockLevel: p.maxStockLevel ?? '',
        status: p.status || 'active',
        weight: p.weight ?? '',
        barcode: p.barcode || '',
        imageUrl: p.imageUrl || '',
      });
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Błąd pobierania produktu');
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  load();
  return () => { ignore = true; };
}, [id]); // <= wystarczy samo id


  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const levels = useMemo(() => {
    const min = numberOrNull(form.minStockLevel);
    const re = numberOrNull(form.reorderPoint);
    const max = numberOrNull(form.maxStockLevel);
    return { min, re, max };
  }, [form.minStockLevel, form.reorderPoint, form.maxStockLevel]);

  const validate = () => {
    if (!form.sku.trim()) return 'SKU jest wymagane';
    if (!form.name.trim()) return 'Nazwa jest wymagana';
    const { min, re, max } = levels;
    if (min != null && max != null && min > max) return 'Min nie może być większe niż Max';
    if (re != null && min != null && re < min)   return 'Reorder nie może być mniejsze niż Min';
    if (re != null && max != null && re > max)   return 'Reorder nie może być większe niż Max';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.warn(err); return; }

    try {
      setSaving(true);

      // auto-utworzenie kategorii w słowniku (nie zmieniamy schematu DB – dalej zapisujemy string)
      const categoryText = form.category?.trim() || '';
      if (categoryText) {
        try { await ensureCategory(categoryText); } catch (_) {}
      }

      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description || undefined,
        category: categoryText || undefined, // <- string jak dotychczas
        brand: form.brand || undefined,
        unit: form.unit || 'szt',
        price: numberOrNull(form.price),
        cost: numberOrNull(form.cost),
        minStockLevel: levels.min,
        reorderPoint: levels.re,
        maxStockLevel: levels.max,
        status: form.status || 'active',
        weight: numberOrNull(form.weight),
        barcode: form.barcode || undefined,
        imageUrl: form.imageUrl || undefined,
      };

      if (isNew) {
        const created = await createProduct(payload);
        toast.success(`Utworzono produkt (ID: ${created.id})`);
        navigate('/products');
      } else {
        const updated = await updateProduct(id, payload);
        toast.success(`Zapisano zmiany (ID: ${updated.id})`);
        navigate('/products');
      }
    } catch (e2) {
      console.error(e2);
      toast.error(e2.message || 'Błąd zapisu produktu');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (isNew) return;
    if (!window.confirm('Usunąć produkt? Dozwolone tylko, gdy brak stanów w magazynie.')) return;
    try {
      setDeleting(true);
      await deleteProduct(id);
      toast.success('Produkt usunięty');
      navigate('/products');
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Nie udało się usunąć produktu');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Ładowanie…</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 1000 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/products">← wróć do listy produktów</Link>
      </div>

      <h1>{isNew ? 'Nowy produkt' : `Edycja produktu`}</h1>

      <form onSubmit={submit} style={{ marginTop: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div>
            <label>SKU *</label>
            <input value={form.sku} onChange={(e) => change('sku', e.target.value)} />
          </div>
          <div>
            <label>Nazwa *</label>
            <input value={form.name} onChange={(e) => change('name', e.target.value)} />
          </div>

          <div className="col-2" style={{ gridColumn: '1 / -1' }}>
            <label>Opis</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => change('description', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label>Kategoria</label>
            <input
              list="category-options"
              value={form.category}
              onChange={(e) => { change('category', e.target.value); setCatQuery(e.target.value); }}
              placeholder="np. Elektronika"
            />
            <datalist id="category-options">
              {catOpts.map(o => <option key={o.id} value={o.label} />)}
            </datalist>
            <div style={{ color:'#666', fontSize:12, marginTop:4 }}>
              Wpis ręczny utworzy nową kategorię w słowniku.
            </div>
          </div>
          <div>
            <label>Marka</label>
            <input value={form.brand} onChange={(e) => change('brand', e.target.value)} />
          </div>

          <div>
            <label>Jednostka</label>
            <input value={form.unit} onChange={(e) => change('unit', e.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => change('status', e.target.value)}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="discontinued">discontinued</option>
            </select>
          </div>

          <div>
            <label>Cena (sprzedaż)</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => change('price', e.target.value)}
            />
          </div>
          <div>
            <label>Koszt (zakup)</label>
            <input
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => change('cost', e.target.value)}
            />
          </div>

          <div>
            <label>Min</label>
            <input
              type="number"
              step={1}
              min={0}
              value={form.minStockLevel}
              onChange={(e) => change('minStockLevel', e.target.value)}
            />
          </div>
          <div>
            <label>Reorder</label>
            <input
              type="number"
              step={1}
              min={0}
              value={form.reorderPoint}
              onChange={(e) => change('reorderPoint', e.target.value)}
            />
          </div>
          <div>
            <label>Max</label>
            <input
              type="number"
              step={1}
              min={0}
              value={form.maxStockLevel}
              onChange={(e) => change('maxStockLevel', e.target.value)}
            />
          </div>

          <div>
            <label>Waga (kg)</label>
            <input
              type="number"
              step="0.001"
              value={form.weight}
              onChange={(e) => change('weight', e.target.value)}
            />
          </div>

          <div>
            <label>Barcode</label>
            <input value={form.barcode} onChange={(e) => change('barcode', e.target.value)} />
          </div>

          <div className="col-2" style={{ gridColumn: '1 / -1' }}>
            <label>URL zdjęcia</label>
            <input value={form.imageUrl} onChange={(e) => change('imageUrl', e.target.value)} />
          </div>
        </div>

        {/* Hint walidacji progów */}
        <div style={{ marginTop: 8, color: '#666', fontSize: 13 }}>
          {levels.min != null || levels.re != null || levels.max != null ? (
            <>
              <span>Reguła: </span>
              <code>Min ≤ Reorder ≤ Max</code>
            </>
          ) : (
            <span>Progi są opcjonalne; uzupełnij, aby włączyć alerty o niskim stanie.</span>
          )}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Zapisuję…' : isNew ? 'Utwórz' : 'Zapisz'}
          </button>

          <button type="button" onClick={() => navigate('/products')}>
            Anuluj
          </button>

          {!isNew && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              style={{ color: '#b3261e', marginLeft: 'auto' }}
            >
              {deleting ? 'Usuwam…' : 'Usuń produkt'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
