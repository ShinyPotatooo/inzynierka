import React, { useEffect, useState } from 'react';
import ItemTable from '../components/Inventory/ItemTable';
import ItemForm from '../components/Inventory/ItemForm';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);

  // Wczytaj dane i logi z localStorage przy starcie
  useEffect(() => {
    const storedItems = localStorage.getItem('inventory_items');
    const storedLogs = localStorage.getItem('inventory_logs');

    if (storedItems) setItems(JSON.parse(storedItems));
    if (storedLogs) setLogs(JSON.parse(storedLogs));
  }, []);

  // Zapisuj dane do localStorage przy każdej zmianie
  useEffect(() => {
    localStorage.setItem('inventory_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('inventory_logs', JSON.stringify(logs));
  }, [logs]);

  // Dodawanie
  const addItem = (newItem) => {
    const item = { ...newItem, id: Date.now(), status: 'dostępny' };
    setItems([...items, item]);
    setLogs(prev => [...prev, `Dodano produkt: ${item.name} (ID: ${item.id})`]);
  };

  // Edycja
  const updateItem = (id, updatedFields) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updatedFields } : item
      )
    );

    const fieldInfo = Object.entries(updatedFields)
      .map(([key, val]) => `${key} = ${val}`)
      .join(', ');

    setLogs(prev => [...prev, `Zmieniono produkt ID ${id}: ${fieldInfo}`]);
  };

  // Usuwanie
  const deleteItem = (id) => {
    const deleted = items.find(i => i.id === id);
    setItems(items.filter(item => item.id !== id));
    setLogs(prev => [...prev, `Usunięto produkt: ${deleted?.name || 'Nieznany'} (ID: ${id})`]);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Magazyn</h1>
      <ItemForm onAdd={addItem} />
      <ItemTable
        items={items}
        onDelete={deleteItem}
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




