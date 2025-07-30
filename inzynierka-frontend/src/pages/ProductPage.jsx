// src/pages/ProductPage.jsx
import React, { useState } from 'react';
import ProductForm from '../components/Product/ProductForm';
import { createProduct } from '../services/products';
import { toast } from 'react-toastify';

const ProductPage = () => {
	const [logs, setLogs] = useState([]);
	const [lastCreatedProduct, setLastCreatedProduct] = useState(null);

	const handleAddProduct = async (product) => {
		try {
			// Walidacja podstawowych pól
			if (
				!product.sku ||
				!product.name ||
				!product.category ||
				!product.brand ||
				!product.unit ||
				!product.price
			) {
				toast.error('Wypełnij wszystkie wymagane pola');
				return;
			}

			// Konwersja pól numerycznych
			const productToSend = {
				...product,
				price: parseFloat(product.price),
				cost: product.cost ? parseFloat(product.cost) : 0,
				minStockLevel: product.minStockLevel
					? parseInt(product.minStockLevel)
					: null,
				maxStockLevel: product.maxStockLevel
					? parseInt(product.maxStockLevel)
					: null,
				reorderPoint: product.reorderPoint
					? parseInt(product.reorderPoint)
					: null,
			};

			const created = await createProduct(productToSend);
			toast.success(`✅ Produkt dodany: ${created.name} (ID: ${created.id})`);
			setLogs((prev) => [
				...prev,
				`✅ Dodano produkt: ${created.name} (ID: ${created.id})`,
			]);
			setLastCreatedProduct(created);
		} catch (err) {
			console.error('Błąd dodawania produktu:', err);
			toast.error(
				`❌ Nie udało się dodać produktu: ${
					err.response?.data?.error || err.message
				}`
			);
		}
	};

	return (
		<div style={{ padding: '2rem' }}>
			<h1>Dodaj nowy produkt</h1>

			<ProductForm onCreate={handleAddProduct} />

			{lastCreatedProduct && (
				<div style={{ marginTop: '1rem' }}>
					<strong>Ostatnio dodany produkt:</strong>
					<pre>{JSON.stringify(lastCreatedProduct, null, 2)}</pre>
				</div>
			)}

			{logs.length > 0 && (
				<section style={{ marginTop: '2rem' }}>
					<h2>Logi</h2>
					<ul>
						{logs.map((log, i) => (
							<li key={i}>{log}</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
};

export default ProductPage;
