import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  listUsers,
  createUser,
  updateUserRole,
  setUserPassword,
  deleteUserById,
  updateUserProfile,
} from '../services/users';
import { AuthContext } from '../context/AuthContext';

export default function AdminPanelPage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // formularz dodawania
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('worker');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // tryb edycji
  const [editId, setEditId] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  // autoryzacja
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      logout();
      navigate('/');
    }
  }, [user, logout, navigate]);

  // podpowiedź loginu z emaila
  useEffect(() => {
    if (email && !username) setUsername(email.split('@')[0]);
  }, [email, username]);

  // pobierz użytkowników
  const load = async () => {
    try {
      setLoading(true);
      const { users } = await listUsers({ page: 1, limit: 200 });
      setUsers(users || []);
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się pobrać listy użytkowników');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const clearForm = () => {
    setEmail(''); setUsername(''); setFirstName(''); setLastName('');
    setRole('worker'); setPassword(''); setConfirm('');
  };

  // dodawanie
  // replace existing handleAdd in AdminPanelPage.jsx with this
const handleAdd = async (e) => {
  e.preventDefault();
  try {
    const mail = email.trim();
    const uname = username.trim();
    const fn = firstName.trim();
    const ln = lastName.trim();

    if (!/\S+@\S+\.\S+/.test(mail)) return toast.error('Nieprawidłowy email');
    if (!uname) return toast.error('Podaj login (username)');
    if (!fn || !ln) return toast.error('Podaj imię i nazwisko');

    // jeśli admin nie poda hasła -> ustaw domyślne
    let passwordToSend = password.trim();
    let usingDefault = false;
    if (!passwordToSend) {
      passwordToSend = 'password123'; // <- zgodnie z Twoim życzeniem
      usingDefault = true;
    } else {
      if (passwordToSend.length < 8) return toast.error('Hasło min. 8 znaków');
      if (passwordToSend !== confirm) return toast.error('Hasła nie są zgodne');
    }

    // dodatkowe pole mustChangePassword wysyłane do backendu
    await createUser({
      email: mail,
      username: uname,
      firstName: fn,
      lastName: ln,
      role,
      password: passwordToSend,
      mustChangePassword: usingDefault ? true : false,
      // można też dodać flagę temporaryPassword: usingDefault
    });

    toast.success('Użytkownik dodany');
    clearForm();
    await load();
  } catch (e) {
    console.error(e);
    toast.error(e.response?.data?.error || 'Błąd dodawania użytkownika');
  }
};


  // zmiana roli
  const handleRoleChange = async (id, nextRole) => {
    try {
      const updated = await updateUserRole(id, { role: nextRole });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: updated.role } : u));
      toast.success('Rola zaktualizowana');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Błąd zmiany roli');
    }
  };

  // ustaw hasło
  const handleSetPassword = async (u) => {
    const newPass = window.prompt(`Nowe hasło dla ${u.email} (min. 8 znaków):`);
    if (!newPass) return;
    if (newPass.length < 8) return toast.warn('Hasło musi mieć co najmniej 8 znaków');
    const conf = window.prompt('Powtórz nowe hasło:');
    if (conf !== newPass) return toast.warn('Hasła nie są zgodne');
    const adminPass = window.prompt('Podaj swoje hasło admina (wymagane):');
    if (!adminPass) return;

    try {
      await setUserPassword(u.id, {
        password: newPass,
        requesterId: user?.id,
        currentAdminPassword: adminPass,
      });
      toast.success('Hasło ustawione');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Nie udało się ustawić hasła');
    }
  };

  // ilu adminów
  const adminsCount = useMemo(() => users.filter(u => u.role === 'admin').length, [users]);

  // usuń użytkownika (zawsze wymaga hasła admina)
  const handleDelete = async (u) => {
    if (!window.confirm(`Usunąć użytkownika ${u.email}?`)) return;

    if (u.role === 'admin' && adminsCount <= 1) {
      return toast.warn('Nie można usunąć ostatniego administratora');
    }

    const adminPass = window.prompt('Podaj swoje hasło admina (wymagane):');
    if (!adminPass) return;

    try {
      await deleteUserById(u.id, { requesterId: user?.id, currentAdminPassword: adminPass });
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success('Użytkownik usunięty');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Nie udało się usunąć użytkownika');
    }
  };

  // --- EDYCJA wiersza ---
  const startEdit = (u) => {
    setEditId(u.id);
    setEditEmail(u.email || '');
    setEditUsername(u.username || '');
    setEditFirstName(u.firstName || '');
    setEditLastName(u.lastName || '');
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditEmail(''); setEditUsername(''); setEditFirstName(''); setEditLastName('');
  };
  const saveEdit = async (id) => {
    const mail = editEmail.trim();
    const uname = editUsername.trim();
    const fn = editFirstName.trim();
    const ln = editLastName.trim();

    if (!/\S+@\S+\.\S+/.test(mail)) return toast.error('Nieprawidłowy email');
    if (!uname) return toast.error('Podaj login (username)');
    if (!fn || !ln) return toast.error('Podaj imię i nazwisko');

    try {
      const updated = await updateUserProfile(id, {
        email: mail, username: uname, firstName: fn, lastName: ln,
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
      toast.success('Zapisano zmiany');
      cancelEdit();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Błąd zapisywania zmian');
    }
  };

  if (!user || user.role !== 'admin') return <p>Brak dostępu</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel administratora</h1>

      {/* Dodawanie nowego użytkownika */}
      <form
        onSubmit={handleAdd}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))', gap: 8, marginBottom: 16 }}
      >
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Login (username)" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="Imię" value={firstName} onChange={e => setFirstName(e.target.value)} />
        <input placeholder="Nazwisko" value={lastName} onChange={e => setLastName(e.target.value)} />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="worker">worker</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
        <input placeholder="Hasło (min. 8 znaków)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Potwierdź hasło" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          <button type="submit" disabled={loading}>Dodaj</button>
        </div>
      </form>

      {loading ? (
        <p>Ładowanie…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Login</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Imię</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Nazwisko</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Rola</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const editing = editId === u.id;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>
                    {editing ? (
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    ) : u.email}
                  </td>
                  <td style={{ padding: 8 }}>
                    {editing ? (
                      <input value={editUsername} onChange={e => setEditUsername(e.target.value)} />
                    ) : u.username}
                  </td>
                  <td style={{ padding: 8 }}>
                    {editing ? (
                      <input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
                    ) : u.firstName}
                  </td>
                  <td style={{ padding: 8 }}>
                    {editing ? (
                      <input value={editLastName} onChange={e => setEditLastName(e.target.value)} />
                    ) : u.lastName}
                  </td>
                  <td style={{ padding: 8 }}>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={editing}
                    >
                      <option value="worker">worker</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={{ padding: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {editing ? (
                      <>
                        <button onClick={() => saveEdit(u.id)} style={{ background: '#e6ffed' }}>Zapisz</button>
                        <button onClick={cancelEdit}>Anuluj</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(u)}>Edytuj</button>
                        <button onClick={() => handleSetPassword(u)} style={{ background: '#e6f7ff' }}>
                          Ustaw hasło
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.role === 'admin' && adminsCount <= 1}
                          title={u.role === 'admin' && adminsCount <= 1 ? 'Nie można usunąć ostatniego admina' : ''}
                          style={{ background: '#ffdddd' }}
                        >
                          Usuń
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 12, textAlign: 'center' }}>Brak użytkowników</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
