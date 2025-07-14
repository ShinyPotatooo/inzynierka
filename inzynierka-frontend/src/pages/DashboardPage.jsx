import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/Dashboard/StatCard';
import { fetchInventoryItems } from '../services/inventory';
import { toast } from 'react-toastify';

const DashboardPage = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function loadInventory() {
      try {
        const fetchedItems = await fetchInventoryItems();
        setItems(fetchedItems || []);
      } catch (err) {
        toast.error('Błąd podczas ładowania danych z backendu');
        console.error('Błąd podczas ładowania danych z backendu:', err);
      }
    }

    loadInventory();
  }, []);

  const countByCondition = (condition) =>
    items.filter(item => item.condition === condition).length;

  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const chartData = ['dostępny', 'usunięty', 'zarezerwowany'].map(condition => ({
    name: condition,
    value: countByCondition(condition),
  }));

  const colors = {
    dostępny: '#90ee90',
    usunięty: '#f08080',
    zarezerwowany: '#ffe699',
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <StatCard title="Dostępne towary" value={countByCondition('dostępny')} color="#d4edda" />
        <StatCard title="Usunięte towary" value={countByCondition('usunięty')} color="#f8d7da" />
        <StatCard title="Rezerwacje" value={countByCondition('zarezerwowany')} color="#fff3cd" />
        <StatCard title="Wszystkie produkty" value={items.length} color="#e2e3e5" />
        <StatCard title="Łączna ilość sztuk" value={totalQuantity} color="#cce5ff" />
      </div>

      <h2 style={{ marginTop: '2rem' }}>Wykresy</h2>

      <div style={{ width: '100%', maxWidth: 400, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[entry.name]} />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardPage;






