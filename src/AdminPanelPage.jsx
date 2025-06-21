import React, { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'admin_users';

const AdminPanelPage = () => {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');

  // 1. Wczytaj użytkowników z localStorage
  useEffect(() => {
    const savedUsers = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      // Wstępna wartość, jeśli brak danych
      const defaultUsers = [
        { id: 1, email: 'admin@example.com', role: 'admin' },
        { id: 2, email: 'user@example.com', role: 'user' },
      ];
      setUsers(defaultUsers);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultUsers));
    }
  }, []);

  // 2. Zapisz do localStorage za każdym razem, gdy zmieni się users
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const deleteUser = (id) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const changeRole = (id, newRole) => {
    setUsers(users.map(user =>
      user.id === id ? { ...user, role: newRole } : user
    ));
  };

  const addUser = () => {
    if (!newEmail.trim()) return;

    const alreadyExists = users.some(user => user.email === newEmail.trim());
    if (alreadyExists) {
      alert("Użytkownik o tym adresie email już istnieje.");
      return;
    }

    const newUser = {
      id: Date.now(),
      email: newEmail.trim(),
      role: newRole,
    };

    setUsers([...users, newUser]);
    setNewEmail('');
    setNewRole('user');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel administratora</h1>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button onClick={addUser}>Dodaj użytkownika</button>
      </div>

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



