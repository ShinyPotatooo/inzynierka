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
        // fetchInventoryItems zwraca { items, pagination }
        const { items: list = [] } = await fetchInventoryItems({ limit: 500 });
        setItems(Array.isArray(list) ? list : []);
      } catch (err) {
        toast.error('Błąd podczas ładowania danych z backendu');
        console.error('Błąd podczas ładowania danych z backendu:', err);
      }
    }
    loadInventory();
  }, []);

  const safe = Array.isArray(items) ? items : [];

  // dostępność = quantity - reservedQuantity > 0
  const availableCount = safe.filter(
    (it) => (Number(it.quantity) || 0) - (Number(it.reservedQuantity) || 0) > 0
  ).length;

  // przyjmijmy „uszkodzone/przeterminowane” jako „nie w pełni dostępne”
  const damagedOrExpiredCount = safe.filter((it) =>
    ['damaged', 'expired'].includes(it.condition)
  ).length;

  // rezerwacje – ile pozycji ma > 0 w reservedQuantity (liczba rekordów, nie suma)
  const reservedCount = safe.filter((it) => Number(it.reservedQuantity) > 0).length;

  const totalQuantity = safe.reduce(
    (sum, it) => sum + Number(it.quantity || 0),
    0
  );

  // Wykres: rozkład wg condition
  const conditionCounts = safe.reduce((acc, it) => {
    const key = it.condition || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(conditionCounts).map(([name, value]) => ({ name, value }));

  const colorsByCond = {
    new: '#90ee90',
    good: '#66b3ff',
    fair: '#ffe699',
    damaged: '#f08080',
    expired: '#c792ea',
    unknown: '#e2e3e5',
  };
  const pickColor = (name) => colorsByCond[name] || '#e2e3e5';

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <StatCard title="Dostępne towary (rekordy)" value={availableCount} color="#d4edda" />
        <StatCard title="Uszkodzone / Przeterminowane" value={damagedOrExpiredCount} color="#f8d7da" />
        <StatCard title="Rezerwacje (rekordy)" value={reservedCount} color="#fff3cd" />
        <StatCard title="Wszystkie pozycje" value={safe.length} color="#e2e3e5" />
        <StatCard title="Łączna ilość sztuk" value={totalQuantity} color="#cce5ff" />
      </div>

      <h2 style={{ marginTop: '2rem' }}>Wykres wg stanu (condition)</h2>

      <div style={{ width: '100%', maxWidth: 480, height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label
            >
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={pickColor(entry.name)} />
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

