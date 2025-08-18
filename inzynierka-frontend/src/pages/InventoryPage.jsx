import React, { useContext, useEffect, useState } from 'react';
import ItemTable from '../components/Inventory/ItemTable';
import ItemForm from '../components/Inventory/ItemForm';
import {
  fetchInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../services/inventory';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

const InventoryPage = () => {
  const { user } = useContext(AuthContext); // <<— aktualny użytkownik
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);

  const loadItems = async () => {
    try {
      const data = await fetchInventoryItems();
      setItems(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Błąd ładowania danych z magazynu');
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const addItem = async (newItem) => {
    try {
      if (!newItem.productId || !newItem.location || !newItem.quantity) {
        toast.error('Wypełnij wszystkie wymagane pola');
        return;
      }

      const payload = {
        ...newItem,
        productId: Number(newItem.productId),
        quantity: Number(newItem.quantity),
        condition: newItem.condition || 'new',
        lastUpdatedBy: user?.id ?? 1, // <<— zapisujemy kto dodał
      };

      const created = await createInventoryItem(payload);
      // API zwraca inventoryItem z dołączonym produktem
      setItems((prev) => [...prev, created]);
      setLogs((prev) => [
        ...prev,
        `✅ Dodano produktID=${created.productId} (pozycja ID: ${created.id})`,
      ]);
      toast.success('Produkt dodany!');
    } catch (err) {
      console.error('Błąd dodawania:', err);
      toast.error(
        `Błąd dodawania produktu: ${err.response?.data?.error || err.message}`
      );
    }
  };

  const updateItem = async (id, updatedFields) => {
    try {
      const currentItem = items.find((i) => i.id === id);

      const toSend = {
        ...updatedFields,
        quantity:
          updatedFields.quantity !== undefined
            ? Number(updatedFields.quantity)
            : undefined,
        lastUpdatedBy: user?.id ?? 1,
      };

      const updated = await updateInventoryItem(id, toSend);

      // zabezpieczenie, żeby nie zgubić product przy merge
      const merged = { ...updated, product: updated.product || currentItem?.product };
      setItems((prev) => prev.map((i) => (i.id === id ? merged : i)));

      const fieldInfo = Object.entries(updatedFields)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      setLogs((prev) => [...prev, `✏️ Zmieniono ID ${id}: ${fieldInfo}`]);
      toast.success(`Produkt zaktualizowany (ID: ${id})`);
    } catch (err) {
      console.error('Błąd aktualizacji:', err);
      toast.error(
        `Błąd aktualizacji produktu: ${err.response?.data?.error || err.message}`
      );
    }
  };

  const removeItem = async (id) => {
    try {
      const item = items.find((i) => i.id === id);
      if (item?.quantity > 0) {
        toast.warning(`ID ${id} ma ${item.quantity} sztuk. Najpierw ustaw ilość na 0.`);
        return;
      }

      await deleteInventoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setLogs((prev) => [...prev, `🗑️ Usunięto pozycję ID: ${id}`]);
      toast.success('Pozycja usunięta z magazynu!');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.error || 'Błąd podczas usuwania.');
    }
  };

  const exportToCSV = () => {
    if (items.length === 0) return toast.warning('Brak danych do eksportu.');

    const header = ['ID', 'ProduktID', 'Nazwa', 'Ilość', 'Lokalizacja', 'Status'];
    const rows = items.map(({ id, productId, product, quantity, location, condition }) =>
      [id, productId, product?.name || '', quantity, location, condition].join(',')
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
          cursor: 'pointer',
        }}
      >
        Eksportuj do CSV
      </button>

      <ItemForm onAdd={addItem} />
      <ItemTable items={items} onDelete={removeItem} onUpdate={updateItem} />

      <section style={{ marginTop: '2rem' }}>
        <h2>Logi operacji</h2>
        {logs.length === 0 ? (
          <p>Brak zarejestrowanych operacji.</p>
        ) : (
          <ul>
            {logs.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default InventoryPage;
