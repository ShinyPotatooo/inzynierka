import React, { useEffect, useState } from 'react';
import ItemTable from '../components/Inventory/ItemTable';
import ItemForm from '../components/Inventory/ItemForm';
import {
  fetchInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from '../services/inventory';
import { toast } from 'react-toastify';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await fetchInventoryItems();
        setItems(data || []);
      } catch (err) {
        toast.error('Błąd ładowania danych z magazynu');
        console.error('Błąd pobierania magazynu:', err);
      }
    }

    loadItems();
  }, []);

  const addItem = async (newItem) => {
    try {
      const created = await createInventoryItem(newItem);
      setItems(prev => [...prev, created]);
      setLogs(prev => [...prev, `✅ Dodano produkt: ${created.productId} (ID: ${created.id})`]);
      toast.success('Produkt dodany!');
    } catch (err) {
      toast.error('Błąd dodawania produktu');
      console.error('Błąd dodawania:', err);
    }
  };

  const updateItem = async (id, updatedFields) => {
    try {
      const updated = await updateInventoryItem(id, updatedFields);
      setItems(prev => prev.map(item => (item.id === id ? updated : item)));

      const fieldInfo = Object.entries(updatedFields)
        .map(([key, val]) => `${key} = ${val}`)
        .join(', ');

      setLogs(prev => [...prev, `✏️ Zmieniono produkt ID ${id}: ${fieldInfo}`]);
      toast.success(`Produkt zaktualizowany (ID: ${id})`);
    } catch (err) {
      toast.error('Błąd aktualizacji produktu');
      console.error('Błąd aktualizacji:', err);
    }
  };

  const removeItem = async (id) => {
    try {
      await deleteInventoryItem(id);
      const deleted = items.find(i => i.id === id);
      setItems(prev => prev.filter(i => i.id !== id));
      setLogs(prev => [...prev, `🗑️ Usunięto produkt: ${deleted?.name || 'Nieznany'} (ID: ${id})`]);
      toast.success('Produkt usunięty');
    } catch (err) {
      toast.error('Błąd usuwania produktu');
      console.error('Błąd usuwania:', err);
    }
  };

  const exportToCSV = () => {
    if (items.length === 0) {
      toast.warning('Brak danych do eksportu.');
      return;
    }

    const header = ['ID', 'ProduktID', 'Ilość', 'Lokalizacja', 'Status'];
    const rows = items.map(({ id, productId, quantity, location, condition }) =>
      [id, productId, quantity, location, condition].join(',')
    );
    const csvContent = [header.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'magazyn.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.info('Eksport zakończony');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Magazyn</h1>

      <button
        onClick={exportToCSV}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginBottom: '1rem',
          cursor: 'pointer'
        }}
      >
        Eksportuj do CSV
      </button>

      <ItemForm onAdd={addItem} />
      <ItemTable
        items={items}
        onDelete={removeItem}
        onUpdate={updateItem}
      />

      <section style={{ marginTop: '2rem' }}>
        <h2>Logi operacji</h2>
        {logs.length === 0 ? (
          <p>Brak zarejestrowanych operacji.</p>
        ) : (
          <ul>
            {logs.map((log, idx) => (
              <li key={idx}>{log}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default InventoryPage;


