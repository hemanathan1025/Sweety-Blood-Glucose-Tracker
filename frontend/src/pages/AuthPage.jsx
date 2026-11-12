// Legacy combined auth page retained for older imports.
import { useState } from 'react';
import { api } from '../api.js';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registering = mode === 'register';

  function change(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const path = registering
        ? '/auth/register'
        : '/auth/login';
      const requestBody = registering
        ? values
        : {
            email: values.email,
            password: values.password,
          };
      const result = await api(path, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode(registering ? 'login' : 'register');
    setError('');
  }

  return (
    <main className="auth-page">
      <div className="brand">
        <span className="brand-mark">S</span>
        <span>
          Sweety
          <small>Glucose care</small>
        </span>
      </div>

      <section className="auth-card">
        <span className="eyebrow">PRIVATE HEALTH TRACKING</span>
        <h1>
          {registering ? 'Create your account' : 'Welcome back'}
        </h1>
        <p>
          {registering
            ? 'Start keeping your glucose readings in one place.'
            : 'Sign in to see your own readings and reports.'}
        </p>

        <form className="form-stack" onSubmit={submit}>
          {registering && (
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                value={values.name}
                onChange={change}
                required
                maxLength="200"
              />
            </label>
          )}

          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={change}
              required
              maxLength="320"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                registering ? 'new-password' : 'current-password'
              }
              value={values.password}
              onChange={change}
              required
              minLength={registering ? 8 : undefined}
              maxLength="128"
            />
          </label>

          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}

          <button
            className="button primary full"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Please wait...'
              : registering
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {registering
            ? 'Already registered?'
            : 'New to Sweety?'}{' '}
          <button type="button" onClick={toggleMode}>
            {registering ? 'Sign in' : 'Create an account'}
          </button>
        </p>

        <p className="privacy">
          Your health information is private to your account.
        </p>
      </section>
    </main>
  );
}
