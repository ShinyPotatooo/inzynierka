import React, { useState } from 'react';

const ProductForm = ({ onCreate }) => {
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: '',
    brand: '',
    unit: '',
    price: '',
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderPoint: 0,
    status: 'active'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(form);
    setForm({
      sku: '',
      name: '',
      category: '',
      brand: '',
      unit: '',
      price: '',
      minStockLevel: 0,
      maxStockLevel: 0,
      reorderPoint: 0,
      status: 'active'
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2>Dodaj nowy produkt</h2>

      <div style={styles.row}>
        <label>SKU:</label>
        <input type="text" name="sku" value={form.sku} onChange={handleChange} required />
      </div>

      <div style={styles.row}>
        <label>Nazwa:</label>
        <input type="text" name="name" value={form.name} onChange={handleChange} required />
      </div>

      <div style={styles.row}>
        <label>Kategoria:</label>
        <input type="text" name="category" value={form.category} onChange={handleChange} required />
      </div>

      <div style={styles.row}>
        <label>Marka:</label>
        <input type="text" name="brand" value={form.brand} onChange={handleChange} required />
      </div>

      <div style={styles.row}>
        <label>Jednostka:</label>
        <input type="text" name="unit" value={form.unit} onChange={handleChange} required />
      </div>

      <div style={styles.row}>
        <label>Cena:</label>
        <input type="number" name="price" value={form.price} onChange={handleChange} required />
      </div>

      <div style={styles.row}>
        <label>Min. stan:</label>
        <input type="number" name="minStockLevel" value={form.minStockLevel} onChange={handleChange} />
      </div>

      <div style={styles.row}>
        <label>Maks. stan:</label>
        <input type="number" name="maxStockLevel" value={form.maxStockLevel} onChange={handleChange} />
      </div>

      <div style={styles.row}>
        <label>Punkt zamówienia:</label>
        <input type="number" name="reorderPoint" value={form.reorderPoint} onChange={handleChange} />
      </div>

      <div style={styles.row}>
        <label>Status:</label>
        <select name="status" value={form.status} onChange={handleChange}>
          <option value="active">Aktywny</option>
          <option value="inactive">Nieaktywny</option>
          <option value="discontinued">Wycofany</option>
        </select>
      </div>

      <button type="submit">Dodaj produkt</button>
    </form>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '400px',
    gap: '1rem',
    marginTop: '2rem'
  },
  row: {
    display: 'flex',
    flexDirection: 'column'
  }
};

export default ProductForm;


