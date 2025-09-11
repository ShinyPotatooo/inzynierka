import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { login as loginFromAPI } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// czyścimy ewentualny stary stan
localStorage.removeItem('user');

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
    const user = await loginFromAPI(identifier, password);
    login(user); // AuthContext
    toast.success('Zalogowano pomyślnie!');
    if (user.mustChangePassword) {
      navigate('/change-password'); // wymuszamy zmianę hasła
    } else {
      navigate('/dashboard');
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





