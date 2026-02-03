import { useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Field from '../components/Field';
import Card from '../components/Card';
import { useAuthStore } from '../state/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch {
      // handled by store
    }
  };

  return (
    <div className="auth">
      <Card
        title="Create account"
        description="Start a new collective and invite agents."
        className="auth__card"
      >
        <form className="form" onSubmit={handleSubmit}>
          <Field
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
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
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <p className="form__hint">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
