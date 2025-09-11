import React, { useState } from 'react';
import { requestPasswordReset } from '../services/auth';
import { toast } from 'react-toastify';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);

	const submit = async (e) => {
		e.preventDefault();
		if (!email) {
			toast.warning('Podaj email');
			return;
		}
		setLoading(true);
		try {
			await requestPasswordReset(email);
			toast.success('Jeśli email istnieje, wysłaliśmy dalsze instrukcje.');
		} catch (err) {
			toast.error(err.message || 'Błąd wysyłki');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ maxWidth: '420px', margin: '40px auto' }}>
			<h2>Reset hasła</h2>
			<p>Podaj swój email. Jeśli istnieje, wyślemy link do resetu hasła.</p>
			<form onSubmit={submit}>
				<div style={{ marginBottom: '1rem' }}>
					<input
						type='email'
						placeholder='Email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						style={{ width: '100%', padding: '0.5rem' }}
					/>
				</div>
				<button
					disabled={loading}
					type='submit'
					style={{ width: '100%', padding: '0.5rem' }}
				>
					{loading ? 'Wysyłanie...' : 'Wyślij link'}
				</button>
			</form>
		</div>
	);
}
