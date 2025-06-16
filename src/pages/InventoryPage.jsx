import React, { useState } from 'react';
import ItemTable from '../components/Inventory/ItemTable';
import ItemForm from '../components/Inventory/ItemForm';

const InventoryPage = () => {
  const [items, setItems] = useState([
    { name: 'Produkt A', quantity: 10, status: 'dostępny' },
  ]);

  const handleAddItem = (item) => {
    setItems([...items, item]);
  };

  return (
    <div>
      <h2>Inwentarz</h2>
      <ItemForm onSubmit={handleAddItem} />
      <ItemTable items={items} />
    </div>
  );
};

export default InventoryPage;

