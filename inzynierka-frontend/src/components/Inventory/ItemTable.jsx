import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const ItemTable = ({ items, onDelete, onUpdate }) => {
  const handleConditionChange = (id, newCondition) => {
    onUpdate(id, { condition: newCondition });
    toast.info(`Zmieniono stan produktu ID ${id} na "${newCondition}"`);
  };

  const handleQuantityChange = (id, newQuantity) => {
    const parsedQty = Number(newQuantity);
    if (parsedQty < 0) return toast.warning('Ilość nie może być ujemna!');
    onUpdate(id, { quantity: parsedQty });
    toast.success(`Zaktualizowano ilość produktu ID ${id}`);
  };

  const handleDelete = (id) => {
    onDelete(id);
    toast.error(`Usunięto produkt ID ${id}`);
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nazwa produktu</th>
          <th>Ilość</th>
          <th>Stan</th>
          <th>Akcje</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan="5" style={{ textAlign: 'center' }}>
              Brak produktów
            </td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.product?.name || 'Nieznany'}</td>
              <td>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  style={{ width: '80px' }}
                />
              </td>
              <td>
                <select
                  value={item.condition || 'new'}
                  onChange={(e) => handleConditionChange(item.id, e.target.value)}
                >
                  <option value="new">Nowy</option>
                  <option value="used">Używany</option>
                  <option value="damaged">Uszkodzony</option>
                </select>
              </td>
              <td>
                <button onClick={() => handleDelete(item.id)}>Usuń</button>
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
      quantity: PropTypes.number,
      condition: PropTypes.string,
      product: PropTypes.shape({
        name: PropTypes.string
      })
    })
  ).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default ItemTable;
