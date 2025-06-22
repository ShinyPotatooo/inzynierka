import React from 'react';
import PropTypes from 'prop-types';

const ItemTable = ({ items, onDelete, onUpdate }) => {
  const handleStatusChange = (id, newStatus) => {
    onUpdate(id, { status: newStatus });
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>Nazwa</th>
          <th>Ilość</th>
          <th>Status</th>
          <th>Akcje</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan="4" style={{ textAlign: 'center' }}>
              Brak produktów
            </td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item.id, e.target.value)}
                >
                  <option value="dostępny">Dostępny</option>
                  <option value="usunięty">Usunięty</option>
                  <option value="zarezerwowany">Zarezerwowany</option>
                </select>
              </td>
              <td>
                <button onClick={() => onDelete(item.id)}>Usuń</button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

ItemTable.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      quantity: PropTypes.number,
      status: PropTypes.string,
    })
  ).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default ItemTable;
