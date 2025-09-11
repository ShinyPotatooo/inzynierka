import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';

const ItemTable = ({ items, onDelete, onUpdate }) => {
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? 1;

  const handleConditionChange = (id, newCondition) => {
    onUpdate(id, { condition: newCondition, lastUpdatedBy: userId });
    toast.info(`Zmieniono stan produktu ID ${id} na "${newCondition}"`);
  };

  const handleQuantityChange = (id, newQuantity) => {
    const parsed = Number(newQuantity);
    if (Number.isNaN(parsed)) return;
    if (parsed < 0) {
      return toast.warning('Ilość nie może być ujemna!');
    }
    onUpdate(id, { quantity: parsed, lastUpdatedBy: userId });
    if (parsed === 0) {
      toast.info(`Ilość dla produktu ID ${id} ustawiona na 0. Możesz teraz usunąć pozycję.`);
    }
  };

  const handleDelete = (item) => {
    if (item.quantity > 0) return; // twarda blokada po stronie UI
    onDelete(item.id);
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
              <td>
                {item.product?.name || 'Nieznany'}
                {item.product?.sku ? ` (${item.product.sku})` : ''}
              </td>
              <td>
                <input
                  type="number"
                  value={item.quantity}
                  min={0}
                  step={1}
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
                  <option value="good">Dobry</option>
                  <option value="fair">Umiarkowany</option>
                  <option value="damaged">Uszkodzony</option>
                  <option value="expired">Przeterminowany</option>
                </select>
              </td>
              <td>
                <button
                  onClick={() => handleDelete(item)}
                  title={item.quantity > 0 ? 'Najpierw ustaw ilość na 0' : 'Usuń z magazynu'}
                  style={{
                    opacity: item.quantity > 0 ? 0.5 : 1,
                    cursor: item.quantity > 0 ? 'not-allowed' : 'pointer'
                  }}
                  disabled={item.quantity > 0}
                >
                  Usuń
                </button>
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
        name: PropTypes.string,
        sku: PropTypes.string,
      }),
    })
  ).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default ItemTable;
