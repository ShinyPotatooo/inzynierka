import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { login as loginFromAPI } from '../services/auth'; // zmieniona nazwa, by nie kolidowało z contextowym loginem
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

localStorage.removeItem('user');

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext); // contextowa funkcja login()
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.warning('Uzupełnij oba pola');
      return;
    }

    try {
      const user = await loginFromAPI(username, password); // poprawiony wywołany login z API
      login(user); // zapisanie użytkownika do contextu
      toast.success('Zalogowano pomyślnie!');
      navigate('/dashboard');
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nazwa użytkownika"
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
        <button
          type="submit"
          style={{ width: '100%', padding: '0.5rem' }}
        >
          Zaloguj
        </button>
      </form>
    </div>
  );
}





