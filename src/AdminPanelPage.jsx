import React, { useState } from 'react';

const AdminPanelPage = () => {
  const [users, setUsers] = useState([
    { id: 1, email: 'admin@example.com', role: 'admin' },
    { id: 2, email: 'user@example.com', role: 'user' },
  ]);

  const deleteUser = (id) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const changeRole = (id, newRole) => {
    setUsers(users.map(user => 
      user.id === id ? { ...user, role: newRole } : user
    ));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel administratora</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Rola</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => changeRole(user.id, e.target.value)}
                >
                  <option value="admin">admin</option>
                  <option value="user">user</option>
                </select>
              </td>
              <td>
                <button onClick={() => deleteUser(user.id)}>Usuń</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPanelPage;

