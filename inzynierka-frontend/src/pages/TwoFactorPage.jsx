import React, { useState, useContext } from 'react';
import { verifyTwoFactor, resendTwoFactor } from '../services/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  const initialUserId = location.state?.userId || null;
  const [userId] = useState(initialUserId);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!userId) throw new Error('Brak userId do weryfikacji 2FA');
      setLoading(true);

      // verifyTwoFactor zapisuje user+token do localStorage i ustawia nagłówek
      const userObj = await verifyTwoFactor(userId, code);

      // zasilamy AuthContext, aby aplikacja "wiedziała", że jest zalogowana
      login(userObj);

      toast.success('Zalogowano pomyślnie!');
      navigate('/dashboard'); // <-- prywatna trasa (nie '/')
    } catch (err) {
      toast.error(err.message || 'Błąd weryfikacji 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      if (!userId) throw new Error('Brak userId do wysyłki kodu');
      setLoading(true);
      const msg = await resendTwoFactor(userId);
      toast.info(msg);
    } catch (err) {
      toast.error(err.message || 'Nie udało się wysłać nowego kodu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Weryfikacja dwuetapowa</h2>
      {!userId && (
        <p style={{ color: 'red' }}>
          Brakuje <code>userId</code>. Wróć do logowania i spróbuj ponownie.
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ margin: '1rem 0' }}>
          <label>Kod 2FA (6 cyfr)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="••••••"
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1.2rem',
              letterSpacing: '0.3rem',
              textAlign: 'center',
            }}
          />
        </div>
        <button disabled={loading} type="submit" style={{ width: '100%', padding: '0.5rem' }}>
          Potwierdź
        </button>
      </form>

      <button
        disabled={loading}
        onClick={handleResend}
        style={{ marginTop: '1rem', width: '100%', padding: '0.5rem' }}
      >
        Wyślij kod ponownie
      </button>
    </div>
  );
}
