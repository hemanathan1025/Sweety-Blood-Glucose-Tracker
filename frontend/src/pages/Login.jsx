import { useState } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function change(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });

      // Return to the private page the user originally asked to open.
      const returnPath = location.state?.from?.pathname || '/dashboard';
      navigate(returnPath, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <section className="auth-card">
        <Link className="auth-brand" to="/">
          <span>
            Sweety
            <small>Glucose care</small>
          </span>
        </Link>

        <span className="eyebrow">YOUR PERSONAL HEALTH LOG</span>
        <h1>Welcome back</h1>
        <p className="auth-intro">
          Sign in to review your readings and reports.
        </p>

        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={change}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={change}
            required
          />

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <span
                  className="spinner spinner-small"
                  aria-hidden="true"
                />
                Signing in
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="auth-switch">
          New to Sweety? <Link to="/signup">Create an account</Link>
        </p>
        <p className="auth-privacy">
          Your health information stays private to your account.
        </p>
      </section>
    </main>
  );
}
