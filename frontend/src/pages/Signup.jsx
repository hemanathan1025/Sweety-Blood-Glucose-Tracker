import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Signup.css';

function validate(form) {
  const errors = {};
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    form.email.trim(),
  );

  if (!form.name.trim()) {
    errors.name = 'Please enter your name.';
  }

  if (!emailIsValid) {
    errors.email = 'Please enter a valid email address.';
  }

  if (form.password.length < 8 || form.password.length > 128) {
    errors.password = 'Password must contain 8 to 128 characters.';
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export default function Signup() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
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

    // Stop here if any field needs attention.
    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setBusy(true);

    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrors({ api: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page signup-page">
      <section className="auth-card">
        <Link className="auth-brand" to="/">
          <span className="brand-mark">S</span>
          <span>
            Sweety
            <small>Glucose care</small>
          </span>
        </Link>

        <span className="eyebrow">START YOUR PRIVATE HEALTH LOG</span>
        <h1>Create your account</h1>
        <p className="auth-intro">
          Keep your glucose readings organized in one place.
        </p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <label htmlFor="signup-name">Name</label>
          <input
            id="signup-name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={change}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <span className="field-error">{errors.name}</span>
          )}

          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={change}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <span className="field-error">{errors.email}</span>
          )}

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={change}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && (
            <span className="field-error">{errors.password}</span>
          )}

          <label htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={change}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && (
            <span className="field-error">
              {errors.confirmPassword}
            </span>
          )}

          {errors.api && (
            <div className="auth-error" role="alert">
              {errors.api}
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
                Creating account
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-privacy">
          Your health information stays private to your account.
        </p>
      </section>
    </main>
  );
}
