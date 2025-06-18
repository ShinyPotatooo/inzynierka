import React from 'react';

const ItemTable = ({ items, onDelete, onUpdate }) => {
  return (
    <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>Nazwa</th>
          <th style={thStyle}>Ilość</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Akcje</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td style={tdStyle}>{item.name}</td>
            <td style={tdStyle}>{item.quantity}</td>
            <td style={tdStyle}>
              <select
                value={item.status}
                onChange={(e) => onUpdate(item.id, { status: e.target.value })}
              >
                <option value="dostępny">Dostępny</option>
                <option value="usunięty">Usunięty</option>
                <option value="zarezerwowany">Zarezerwowany</option>
              </select>
            </td>
            <td style={tdStyle}>
              <button onClick={() => onDelete(item.id)} style={{ marginLeft: '8px' }}>
                Usuń
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const thStyle = {
  borderBottom: '1px solid #ccc',
  textAlign: 'left',
  padding: '0.5rem'
};

const tdStyle = {
  borderBottom: '1px solid #eee',
  padding: '0.5rem'
};

export default ItemTable;

