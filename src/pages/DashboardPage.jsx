import React from 'react';
import StatCard from '../components/Dashboard/StatCard';

const DashboardPage = () => {
  // Przykładowe dane lokalne (na razie bez backendu)
  const items = [
    { name: 'Produkt A', quantity: 10, status: 'dostępny' },
    { name: 'Produkt B', quantity: 0, status: 'usunięty' },
    { name: 'Produkt C', quantity: 5, status: 'zarezerwowany' },
  ];

  const total = items.length;
  const available = items.filter(i => i.status === 'dostępny').length;
  const deleted = items.filter(i => i.status === 'usunięty').length;
  const reserved = items.filter(i => i.status === 'zarezerwowany').length;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>

      <section style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <StatCard label="Dostępne towary" value={available} color="#d4edda" />
        <StatCard label="Usunięte towary" value={deleted} color="#f8d7da" />
        <StatCard label="Rezerwacje" value={reserved} color="#fff3cd" />
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Powiadomienia</h2>
        <p>Brak powiadomień.</p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Wykresy</h2>
        <p>Wkrótce...</p>
      </section>
    </div>
  );
};

export default DashboardPage;

