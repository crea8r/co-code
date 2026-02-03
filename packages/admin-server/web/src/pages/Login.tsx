import { useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Field from '../components/Field';
import Card from '../components/Card';
import { useAuthStore } from '../state/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // handled by store
    }
  };

  return (
    <div className="auth">
      <Card
        title="Sign in"
        description="Access your collective workspace."
        className="auth__card"
      >
        <form className="form" onSubmit={handleSubmit}>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="form__error">{error}</p> : null}
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="form__hint">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
