import React, { useState } from 'react';

const ItemForm = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !quantity) return;
    onAdd({ name, quantity: parseInt(quantity) });
    setName('');
    setQuantity('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-100 p-6 rounded-lg shadow-md mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nazwa produktu</label>
          <input
            id="name"
            type="text"
            placeholder="Wpisz nazwę produktu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            aria-label="Nazwa produktu"
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Ilość</label>
          <input
            id="quantity"
            type="number"
            placeholder="Wpisz ilość"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            aria-label="Ilość produktu"
            min="0"
          />
        </div>
        
        <button
          type="submit"
          className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
          aria-label="Dodaj produkt"
        >
          Dodaj produkt
        </button>
      </div>
    </form>
  );
};

export default ItemForm;