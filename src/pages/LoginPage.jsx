import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { loginUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.warning('Uzupełnij oba pola');
      return;
    }

    try {
      const token = await loginUser({ email, password });
      login(token);
      toast.success('Zalogowano pomyślnie!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Błędny login lub hasło!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Logowanie</h2>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Hasło"
        type="password"
      />
      <button type="submit">Zaloguj</button>
    </form>
  );
}



