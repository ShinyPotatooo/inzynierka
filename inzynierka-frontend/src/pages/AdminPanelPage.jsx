import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AdminPanelPage = () => {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [loading, setLoading] = useState(true);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Autoryzacja
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      logout();
      navigate('/login');
    }
  }, [user, logout, navigate]);

  // Pobierz użytkowników z API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users?limit=100`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
      } else {
        toast.error('Błąd ładowania użytkowników');
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd serwera podczas ładowania');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Dodaj użytkownika
  const addUser = async () => {
    const email = newEmail.trim();
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Nieprawidłowy email');
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email.split('@')[0],
          email,
          password: 'defaultPassword123', // tymczasowe hasło
          firstName: 'Nowy',
          lastName: 'Użytkownik',
          role: newRole,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Dodano użytkownika!');
        fetchUsers();
        setNewEmail('');
        setNewRole('user');
      } else {
        toast.error(data.error || 'Błąd dodawania');
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd serwera przy dodawaniu');
    }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Użytkownik zdezaktywowany');
        fetchUsers();
      } else {
        toast.error(data.error || 'Błąd usuwania');
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd serwera przy usuwaniu');
    }
  };

  const changeRole = async (id, newRole) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Zmieniono rolę');
        fetchUsers();
      } else {
        toast.error(data.error || 'Błąd zmiany roli');
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd serwera');
    }
  };

  if (!user || user.role !== 'admin') return <p>Brak dostępu</p>;
  if (loading) return <p>Ładowanie użytkowników...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel administratora</h1>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addUser()}
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

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Email</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Rola</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Akcje</th>
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
                  <option value="worker">worker</option>
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











