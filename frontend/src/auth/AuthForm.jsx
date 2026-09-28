import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from './AuthContext';
import FormField from '../components/FormField';
import DemoHint from './DemoHint';
import { validateAuth } from './validation';

/**
 * Shared login/register form. One component handles both modes so validation,
 * error mapping and the redirect-after-login logic exist in exactly one place.
 * Server `details` are merged per field — `invalid_input` never lands as a
 * generic red box when it tells us which input is wrong.
 */
export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (fresh sign-in or a deep link to /login)? Go straight to
  // the destination instead of showing the form again. Runs after all hooks.
  if (status === 'authenticated' && !submitting) {
    return <Navigate to={location.state?.from ?? '/requests'} replace />;
  }

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const clientErrors = validateAuth(values, isRegister);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const credentials = {
        email: values.email.trim(),
        password: values.password,
      };
      if (isRegister) await register(values.name.trim(), credentials.email, credentials.password);
      else await login(credentials.email, credentials.password);

      const redirectTo = location.state?.from ?? '/requests';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const details = error.fieldErrors();
        if (Object.keys(details).length > 0) setFieldErrors(details);
        // Credentials/shape problems are actionable; show the server's words.
        setFormError(error.message);
      } else {
        setFormError('Unexpected error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <header className="auth-card__header">
        <p className="eyebrow">{isRegister ? 'Create account' : 'Welcome back'}</p>
        <h1 className="auth-card__title">{isRegister ? 'Register' : 'Sign in'}</h1>
        <p className="auth-card__sub">
          {isRegister
            ? 'Set up an account for the front desk. You can sign in immediately after registering.'
            : 'Sign in to review and advance service requests.'}
        </p>
      </header>

      {!isRegister && <DemoHint />}

      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        {isRegister && (
          <FormField
            id="name"
            label="Full name"
            autoComplete="name"
            placeholder="e.g. Priya Nair"
            value={values.name}
            onChange={update('name')}
            error={fieldErrors.name}
            required
          />
        )}

        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@clinic.com"
          value={values.email}
          onChange={update('email')}
          error={fieldErrors.email}
          required
        />

        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          value={values.password}
          onChange={update('password')}
          error={fieldErrors.password}
          hint={isRegister ? 'Minimum 8 characters.' : undefined}
          required
        />

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
          {submitting && <span className="spinner" style={{ width: 15, height: 15 }} />}
          {isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="auth-card__switch">
        {isRegister ? 'Already have an account? ' : 'New to SevaDesk? '}
        <Link to={isRegister ? '/login' : '/register'} state={location.state}>
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </div>
  );
}
