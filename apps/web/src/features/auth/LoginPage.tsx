import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Field } from '../../shared/ui/Field';
import { FormError } from '../../shared/ui/FormError';
import { useLogin } from './api';
import { AuthLayout } from './AuthLayout';
import { useAmbience } from '../../lib/audio';

export function LoginPage() {
  useAmbience('menu'); // request #87
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate(from ?? '/', { replace: true }) },
    );
  };

  return (
    <AuthLayout>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <h2 className="form-title">Log in</h2>
        <FormError error={login.error} />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
        <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
          New to the realms? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
