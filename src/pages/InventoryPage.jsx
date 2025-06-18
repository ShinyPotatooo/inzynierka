import React, { useState } from 'react';
import ItemTable from '../components/Inventory/ItemTable';
import ItemForm from '../components/Inventory/ItemForm';

const InventoryPage = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'Produkt A', quantity: 10, status: 'dostępny' },
    { id: 2, name: 'Produkt B', quantity: 0, status: 'usunięty' },
  ]);

  const addItem = (newItem) => {
    setItems([
      ...items,
      { ...newItem, id: Date.now(), status: 'dostępny' }
    ]);
  };

  const updateItem = (id, updatedFields) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updatedFields } : item
      )
    );
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
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
    </div>
  );
};

export default InventoryPage;



