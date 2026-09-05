'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Glaszetter Snel</h1>
        <p style={styles.subtitle}>Meer dan glaswerk, een heldere werkwijze.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="email">
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="naam@bedrijf.nl"
            required
          />

          <label style={styles.label} htmlFor="password">
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={isSubmitting}>
            {isSubmitting ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-background)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 'var(--spacing-xl)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--color-secondary)',
    textAlign: 'center',
    marginBottom: 'var(--spacing-sm)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    marginBottom: 'var(--spacing-xxl)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--spacing-xs)',
    marginTop: 'var(--spacing-md)',
  },
  input: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    fontSize: 16,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
  },
  error: {
    color: 'var(--color-error)',
    fontSize: 14,
    marginTop: 'var(--spacing-md)',
  },
  button: {
    marginTop: 'var(--spacing-xl)',
    padding: 'var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-background)',
    fontSize: 16,
    fontWeight: 600,
  },
};
