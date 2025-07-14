import React, { useState } from 'react';

const ItemForm = ({ onAdd }) => {
  const [productId, setProductId] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!productId || !location || !quantity) {
      alert("Wypełnij wszystkie wymagane pola");
      return;
    }

    onAdd({
      productId: parseInt(productId),
      location,
      quantity: parseInt(quantity)
    });

    // Resetuj formularz
    setProductId('');
    setLocation('');
    setQuantity('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
      <input
        type="number"
        placeholder="ID Produktu"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Lokalizacja"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Ilość"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
      <button type="submit">Dodaj</button>
    </form>
  );
};

export default ItemForm;


