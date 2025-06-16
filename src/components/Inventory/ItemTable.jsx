import React from 'react';

const ItemTable = ({ items }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Nazwa</th>
          <th>Ilość</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td>{item.name}</td>
            <td>{item.quantity}</td>
            <td>{item.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ItemTable;
