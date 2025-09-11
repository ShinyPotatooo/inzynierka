// src/pages/ChangePasswordPage.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { changePassword } from '../services/auth'; // nowa metoda
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function ChangePasswordPage() {
  const { user, logout, login } = useContext(AuthContext);
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!newPass || newPass.length < 8) return toast.warn('Hasło min. 8 znaków');
    if (newPass !== confirm) return toast.warn('Hasła nie są zgodne');

    setLoading(true);
    try {
      await changePassword({ userId: user.id, newPassword: newPass, requireOldPassword: false, token: null });
      // odśwież usera (backend powinien zwrócić zaktualizowanego usera) lub wymuś ponowne logowanie
      toast.success('Hasło zmienione. Zaloguj się ponownie.');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Błąd zmiany hasła');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Wymagana zmiana hasła</h2>
      <p>Twoje konto wymaga zmiany hasła przy pierwszym logowaniu.</p>
      <form onSubmit={submit}>
        <div style={{ marginBottom: '1rem' }}>
          <input type="password" placeholder="Nowe hasło" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ width: '100%', padding: '.5rem' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <input type="password" placeholder="Powtórz nowe hasło" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ width: '100%', padding: '.5rem' }} />
        </div>
        <button disabled={loading} style={{ width: '100%', padding: '.5rem' }}>{loading ? 'Trwa...' : 'Zmień hasło'}</button>
      </form>
    </div>
  );
}
