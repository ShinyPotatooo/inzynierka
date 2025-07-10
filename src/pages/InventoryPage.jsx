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

  // Funkcje dodawania/edycji/usuwania pozostają bez zmian
  const addItem = (newItem) => {
    const item = { ...newItem, id: Date.now(), status: 'dostępny' };
    setItems([...items, item]);
    setLogs(prev => [...prev, `Dodano produkt: ${item.name} (ID: ${item.id})`]);
  };

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

  const deleteItem = (id) => {
    const deleted = items.find(i => i.id === id);
    setItems(items.filter(item => item.id !== id));
    setLogs(prev => [...prev, `Usunięto produkt: ${deleted?.name || 'Nieznany'} (ID: ${id})`]);
  };

  return (
    <div className='mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full max-w-screen-xl 2xl:max-w-screen-2xl'>
      <div className='mx-auto w-full md:w-5/6 lg:w-3/5 xl:w-3/5 2xl:w-3/5'>
        <h1 className='text-2xl sm:text-3xl font-bold text-center py-4 text-slate-800'>Magazyn</h1>
        
        <ItemForm onAdd={addItem} />
        
        <ItemTable
          items={items}
          onDelete={deleteItem}
          onUpdate={updateItem}
        />

        <section className='mt-8 bg-slate-100 p-4 rounded-lg shadow-sm'>
          <h2 className='text-xl font-semibold mb-4 text-slate-700'>Logi operacji</h2>
          {logs.length === 0 ? (
            <p className='text-slate-600'>Brak zarejestrowanych operacji.</p>
          ) : (
            <ul className='space-y-2'>
              {logs.map((log, idx) => (
                <li key={idx} className='text-sm text-slate-600 bg-white p-3 rounded-md shadow-xs'>
                  {log}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default InventoryPage;