import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import "./Login.css";

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // login | signup | forgot
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const redirectBase = window.location.origin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode !== 'forgot' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${redirectBase}/dashboard` },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Sign-up successful! Check your email to confirm.');
        } else {
          window.location.href = `${redirectBase}/dashboard`;
        }
      } else if (mode === 'login') {
        const {  error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = `${redirectBase}/dashboard`;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${redirectBase}/reset-password`,
        });
        if (error) throw error;
        setMessage('Reset link sent! Check your email.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>
          {mode === 'signup'
            ? 'Create Account'
            : mode === 'forgot'
            ? 'Reset Password'
            : 'Welcome Back'}
        </h2>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          {mode !== 'forgot' && (
            <>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? mode === 'signup'
                ? 'Signing Up...'
                : mode === 'login'
                ? 'Logging In...'
                : 'Sending...'
              : mode === 'signup'
              ? 'Sign Up'
              : mode === 'login'
              ? 'Log In'
              : 'Send Reset Link'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="text-center text-sm mt-2">
            <button
              className="forgot-link"
              onClick={() => {
                setMode('forgot');
                setError(null);
                setMessage(null);
              }}
            >
              Forgot Password?
            </button>
          </p>
        )}

        {mode !== 'forgot' && (
          <p>
            {mode === 'signup'
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}
            <button
              className="switch-mode"
              onClick={() => {
                setMode(prev => (prev === 'signup' ? 'login' : 'signup'));
                setError(null);
                setMessage(null);
              }}
            >
              {mode === 'signup' ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        )}

        {mode === 'forgot' && (
          <p className="text-center text-sm mt-4">
            <button
              className="switch-mode"
              onClick={() => {
                setMode('login');
                setError(null);
                setMessage(null);
              }}
            >
              Back to Login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
