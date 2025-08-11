import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AdminPanelPage = () => {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [newRole, setNewRole] = useState('worker');
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

  // Pobierz użytkowników
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

  // Dodaj użytkownika (z hasłem)
  const addUser = async () => {
    const email = newEmail.trim();

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Nieprawidłowy email');
      return;
    }
    if (!newPassword || !newPassword2) {
      toast.error('Podaj hasło i jego potwierdzenie');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Hasło musi mieć co najmniej 8 znaków');
      return;
    }
    if (newPassword !== newPassword2) {
      toast.error('Hasła nie są zgodne');
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email.split('@')[0],
          email,
          password: newPassword,              // <-- hasło nadawane przy tworzeniu
          firstName: 'Nowy',
          lastName: 'Użytkownik',
          role: newRole,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Dodano użytkownika!');
        setNewEmail('');
        setNewPassword('');
        setNewPassword2('');
        setNewRole('worker');
        fetchUsers();
      } else {
        toast.error(data.error || 'Błąd dodawania');
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd serwera przy dodawaniu');
    }
  };

  // Zmień rolę
  const changeRole = async (id, nextRole) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
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

  // Policz ilu jest adminów (do blokady kasowania ostatniego)
  const adminCount = users.filter(u => u.role === 'admin').length;

  // Usuń użytkownika
  const deleteUser = async (id, role) => {
    if (role === 'admin' && adminCount <= 1) {
      toast.warn('Nie można usunąć ostatniego administratora');
      return;
    }
    if (!window.confirm('Czy na pewno chcesz trwale usunąć tego użytkownika?')) {
      return;
    }

    let currentAdminPassword = null;
    if (role === 'admin') {
      currentAdminPassword = window.prompt('Podaj swoje hasło (wymagane do usunięcia admina):');
      if (!currentAdminPassword) {
        toast.info('Anulowano');
        return;
      }
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user?.id,
          currentAdminPassword
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Użytkownik usunięty');
        setUsers(prevUsers => prevUsers.filter(u => u.id !== id));
      } else {
        toast.error(data.error || 'Błąd usuwania');
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd serwera przy usuwaniu');
    }
  };

  // Ustaw hasło dla istniejącego użytkownika
  const setPasswordForUser = async (targetUser) => {
    const newPass = window.prompt(`Ustaw nowe hasło dla: ${targetUser.email}\n( co najmniej 8 znaków )`);
    if (!newPass) { toast.info('Anulowano'); return; }
    if (newPass.length < 8) { toast.error('Hasło musi mieć co najmniej 8 znaków'); return; }
    const confirm = window.prompt('Powtórz nowe hasło:');
    if (confirm !== newPass) { toast.error('Hasła nie są zgodne'); return; }

    let currentAdminPassword = window.prompt('Podaj swoje hasło (wymagane do zmiany hasła użytkownika):');
    if (!currentAdminPassword) { toast.info('Anulowano'); return; }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user?.id,
          currentAdminPassword,
          password: newPass
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Hasło ustawione');
      } else {
        toast.error(data.error || 'Błąd ustawiania hasła');
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd serwera przy ustawianiu hasła');
    }
  };

  if (!user || user.role !== 'admin') return <p>Brak dostępu</p>;
  if (loading) return <p>Ładowanie użytkowników...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel administratora</h1>

      {/* Sekcja dodawania nowego użytkownika */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="email"
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addUser()}
          style={{ minWidth: 220 }}
        />
        <input
          type="password"
          placeholder="Hasło (min. 8 znaków)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ minWidth: 200 }}
        />
        <input
          type="password"
          placeholder="Potwierdź hasło"
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
          style={{ minWidth: 200 }}
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
        >
          <option value="worker">worker</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
        <button onClick={addUser}>Dodaj użytkownika</button>
      </div>

      {/* Lista użytkowników */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Email</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Rola</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                >
                  <option value="worker">worker</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPasswordForUser(u)}
                  style={{ backgroundColor: '#e6f7ff', color: '#0077b6' }}
                >
                  Ustaw hasło
                </button>
                <button
                  onClick={() => deleteUser(u.id, u.role)}
                  disabled={u.role === 'admin' && adminCount <= 1}
                  title={u.role === 'admin' && adminCount <= 1 ? 'Nie można usunąć ostatniego admina' : ''}
                  style={{
                    backgroundColor: '#ffcccc',
                    color: '#ff0000',
                    opacity: (u.role === 'admin' && adminCount <= 1) ? 0.6 : 1
                  }}
                >
                  Usuń
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPanelPage;


