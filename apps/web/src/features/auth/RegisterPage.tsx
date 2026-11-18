import { PASSWORD_MIN, registerRequestSchema } from '@realms/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { fieldErrors } from '../../lib/api';
import { Field } from '../../shared/ui/Field';
import { FormError } from '../../shared/ui/FormError';
import { useRegister } from './api';
import { AuthLayout } from './AuthLayout';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const register = useRegister();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Same schema as the server, for instant feedback. The server re-validates.
    const parsed = registerRequestSchema.safeParse({ email, password });
    const next: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (!parsed.success || next.confirm) return;
    register.mutate(parsed.data, {
      onSuccess: () => navigate('/characters/new', { replace: true }),
      onError: (err) => setErrors(fieldErrors(err)),
    });
  };

  return (
    <AuthLayout>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <h2 className="form-title">Create your account</h2>
        <FormError error={register.error} />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN} characters.`}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={register.isPending}>
          {register.isPending ? 'Creating account…' : 'Create account'}
        </button>
        <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
