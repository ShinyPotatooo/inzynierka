import React from 'react';

const DashboardPage = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>

      <section>
        <h2>Statystyki ogólne</h2>
        <ul>
          <li>Dostępne towary: ...</li>
          <li>Usunięte towary: ...</li>
          <li>Rezerwacje: ...</li>
        </ul>
      </section>

      <section>
        <h2>Powiadomienia</h2>
        <p>Brak powiadomień.</p>
      </section>

      <section>
        <h2>Wykresy</h2>
        <p>Wkrótce...</p>
      </section>
    </div>
  );
};

export default DashboardPage;
