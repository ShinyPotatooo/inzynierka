// src/pages/InventoryPage.jsx
import React, { useEffect, useState } from 'react';
import ItemTable from '../components/Inventory/ItemTable';
import ItemForm from '../components/Inventory/ItemForm';
import {
	fetchInventoryItems,
	createInventoryItem,
	updateInventoryItem,
	deleteInventoryItem,
} from '../services/inventory';
import { toast } from 'react-toastify';

const InventoryPage = () => {
	const [items, setItems] = useState([]);
	const [logs, setLogs] = useState([]);

	useEffect(() => {
		loadItems();
	}, []);

	const loadItems = async () => {
		try {
			const data = await fetchInventoryItems();
			setItems(data || []);
		} catch (err) {
			toast.error('Błąd ładowania danych z magazynu');
			console.error('Błąd pobierania magazynu:', err);
		}
	};

	const addItem = async (newItem) => {
		try {
			// Walidacja
			if (!newItem.productId || !newItem.location || !newItem.quantity) {
				toast.error('Wypełnij wszystkie wymagane pola');
				return;
			}

			// Konwersja typów
			const itemToSend = {
				...newItem,
				productId: parseInt(newItem.productId),
				quantity: parseInt(newItem.quantity),
				condition: newItem.condition || 'new',
			};

			const created = await createInventoryItem(itemToSend);
			setItems((prev) => [...prev, created]);
			setLogs((prev) => [
				...prev,
				`✅ Dodano produkt: ${created.productId} (ID: ${created.id})`,
			]);
			toast.success('Produkt dodany!');
		} catch (err) {
			toast.error(
				`Błąd dodawania produktu: ${err.response?.data?.error || err.message}`
			);
			console.error('Błąd dodawania:', err);
		}
	};

	const updateItem = async (id, updatedFields) => {
  try {
    // Znajdź aktualną pozycję w stanie, aby zachować dane produktu
    const currentItem = items.find(item => item.id === id);
    
    // Konwersja typów jeśli potrzebne
    const fieldsToSend = {
      ...updatedFields,
      quantity: updatedFields.quantity
        ? parseInt(updatedFields.quantity)
        : undefined,
    };

    const updated = await updateInventoryItem(id, fieldsToSend);
    
    // Zachowaj istniejące dane produktu
    const updatedItemWithProduct = {
      ...updated,
      product: currentItem?.product || updated.product
    };

    setItems((prev) => prev.map((item) => (item.id === id ? updatedItemWithProduct : item)));

    const fieldInfo = Object.entries(updatedFields)
      .map(([key, val]) => `${key} = ${val}`)
      .join(', ');

    setLogs((prev) => [
      ...prev,
      `✏️ Zmieniono produkt ID ${id}: ${fieldInfo}`,
    ]);
    toast.success(`Produkt zaktualizowany (ID: ${id})`);
  } catch (err) {
    toast.error(
      `Błąd aktualizacji produktu: ${
        err.response?.data?.error || err.message
      }`
    );
    console.error('Błąd aktualizacji:', err);
  }
};

	const removeItem = async (id) => {
		try {
			// Znajdź pozycję w stanie
			const itemToDelete = items.find((item) => item.id === id);

			// Walidacja - sprawdź stan magazynowy
			if (itemToDelete?.quantity > 0) {
				toast.warning(
					<div>
						<p>Nie można usunąć pozycji z magazynu!</p>
						<p>
							ID: {id} ma {itemToDelete.quantity} sztuk w magazynie.
						</p>
						<p>Najpierw ustaw ilość na 0.</p>
					</div>,
					{ autoClose: 5000 }
				);
				return;
			}

			// Usuwanie
			await deleteInventoryItem(id);

			// Aktualizacja stanu i UI
			setItems((prev) => prev.filter((i) => i.id !== id));
			setLogs((prev) => [
				...prev,
				`🗑️ Usunięto pozycję: ${
					itemToDelete?.product?.name || 'Nieznany'
				} (ID: ${id})`,
			]);

			toast.success('Pozycja usunięta z magazynu!');
		} catch (err) {
			console.error('Delete error details:', {
				status: err.response?.status,
				data: err.response?.data,
			});

			toast.error(
				err.response?.data?.error ||
					'Błąd podczas usuwania. Sprawdź konsolę dla szczegółów.'
			);
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
