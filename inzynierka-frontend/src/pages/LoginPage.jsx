import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { login as loginFromAPI } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(''); // email LUB nazwa
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.warning('Uzupełnij oba pola');
      return;
    }
    try {
      const result = await loginFromAPI(identifier, password);

      // 2FA: backend nie zwrócił tokenu – przechodzimy do kroku 2
      if (result?.pending2FA && result?.userId) {
        toast.info(result.message || 'Na maila wysłano kod 2FA.');
        navigate('/2fa', { state: { userId: result.userId, message: result.message } });
        return; // ważne: kończymy obsługę submitu
      }

      // Brak 2FA: mamy user + token
      login(result); // zasilamy AuthContext
      toast.success('Zalogowano pomyślnie!');
      if (result.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard'); // <-- prywatna trasa (nie '/')
      }
    } catch (err) {
      toast.error(err.message || 'Błędny login lub hasło!');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto' }}>
      <h2>Logowanie</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email lub nazwa użytkownika"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Hasło"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '0.5rem' }}>
          Zaloguj
        </button>
      </form>
    </div>
  );
}
