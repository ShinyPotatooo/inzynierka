import React, { useState } from 'react';

const ItemForm = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState('dostępny');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, quantity: Number(quantity), status });
    setName('');
    setQuantity('');
    setStatus('dostępny');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nazwa towaru"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Ilość"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="dostępny">Dostępny</option>
        <option value="zarezerwowany">Zarezerwowany</option>
        <option value="uszkodzony">Uszkodzony</option>
      </select>
      <button type="submit">Dodaj</button>
    </form>
  );
};

export default ItemForm;
