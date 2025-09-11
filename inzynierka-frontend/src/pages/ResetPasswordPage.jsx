import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/auth';
import { toast } from 'react-toastify';

function useQuery() {
	const { search } = useLocation();
	return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
	const query = useQuery();
	const navigate = useNavigate();
	const token = query.get('token') || '';
	const email = query.get('email') || '';

	const [password, setPassword] = useState('');
	const [password2, setPassword2] = useState('');
	const [loading, setLoading] = useState(false);

	const submit = async (e) => {
		e.preventDefault();
		if (!token || !email) {
			toast.error('Brak tokenu lub adresu email.');
			return;
		}
		if (!password || password.length < 6) {
			toast.warning('Hasło musi mieć min. 6 znaków');
			return;
		}
		if (password !== password2) {
			toast.warning('Hasła muszą się zgadzać');
			return;
		}
		setLoading(true);
		try {
			await resetPassword({ email, token, password });
			toast.success('Hasło zmienione. Zaloguj się nowym hasłem.');
			navigate('/');
		} catch (err) {
			toast.error(err.message || 'Błąd resetu hasła');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ maxWidth: '420px', margin: '40px auto' }}>
			<h2>Ustaw nowe hasło</h2>
			<form onSubmit={submit}>
				<div style={{ marginBottom: '1rem' }}>
					<input
						type='password'
						placeholder='Nowe hasło'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						style={{ width: '100%', padding: '0.5rem' }}
					/>
				</div>
				<div style={{ marginBottom: '1rem' }}>
					<input
						type='password'
						placeholder='Powtórz hasło'
						value={password2}
						onChange={(e) => setPassword2(e.target.value)}
						style={{ width: '100%', padding: '0.5rem' }}
					/>
				</div>
				<button
					disabled={loading}
					type='submit'
					style={{ width: '100%', padding: '0.5rem' }}
				>
					{loading ? 'Zapisywanie...' : 'Ustaw hasło'}
				</button>
			</form>
		</div>
	);
}
