'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('message');
    if (msg) {
      setError(msg);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/nextup_logo_3d.png" alt="Nextup" className="login-logo" />
          <h1>Welcome to Nextup</h1>
          <p>Login to manage your waitlist.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}

          {/* Decoy inputs to trap aggressive browser autofill */}
          <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} />
          <input type="password" name="fakepasswordremembered" style={{ display: 'none' }} />

          <div className="form-group">
            <label htmlFor="nextup-email">Email</label>
            <input
              id="nextup-email"
              name="nextup-email-field"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@restaurant.com"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nextup-password">Password</label>
            <input
              id="nextup-password"
              name="nextup-password-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

          <div className="login-options">
            <Link href="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>

          <div className="signup-footer">
            <p>Don't have an account? <Link href="/signup" className="forgot-password-link">Create one</Link></p>
          </div>
        </form>
      </div>

      <footer className="app-footer">
        <div className="footer-section">
          <span>Powered by</span>
          <img src="/conect-r-logo.png" alt="Conect-R" style={{ height: '24px', objectFit: 'contain', backgroundColor: 'white', padding: '2px 4px', borderRadius: '4px' }} />
        </div>
        <span className="footer-divider">|</span>
        <div className="footer-section">
          <img src="/nextup_logo_3d.png" alt="Nextup" style={{ height: '28px', borderRadius: '4px', objectFit: 'contain' }} />
          <span>Nextup is a product of Conect-R LLC</span>
        </div>
      </footer>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          font-family: 'Inter', sans-serif;
        }

        .login-box {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 420px;
          margin: auto;
        }

        .login-header {
          text-align: center;
          margin-top: 0.5rem;
        }

        .login-logo {
          width: 240px;
          height: 240px;
          border-radius: 40px;
          object-fit: cover;
          box-shadow: 0 15px 35px rgba(0, 195, 255, 0.4);
          margin-bottom: 2rem;
        }

        .login-header h1 {
          color: white;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }

        .login-header p {
          color: #94a3b8;
          font-size: 0.95rem;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          color: #cbd5e1;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .login-options {
          text-align: center;
          margin-top: 0.5rem;
        }

        .forgot-password-link, .forgot-password-link:visited {
          color: #00c3ff !important;
          font-size: 0.9rem;
          text-decoration: none;
          transition: color 0.2s ease;
          font-weight: 500;
        }

        .forgot-password-link:hover {
          color: #0077ff;
          text-decoration: underline;
        }

        .form-group input {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.875rem 1rem;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-group input:focus {
          border-color: rgba(0, 195, 255, 0.5);
          background: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 0 3px rgba(0, 195, 255, 0.1);
        }

        .form-group input::placeholder {
          color: #475569;
        }

        .btn-login {
          background: linear-gradient(135deg, #00c3ff, #0077ff);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
          box-shadow: 0 8px 16px rgba(0, 119, 255, 0.2);
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 20px rgba(0, 119, 255, 0.4);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 0.875rem;
          border-radius: 10px;
          font-size: 0.875rem;
          text-align: center;
        }

        .signup-footer {
          text-align: center;
          margin-top: 1rem;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .signup-footer .forgot-password-link {
          margin-left: 0.25rem;
        }

        /* Footer matching app/page.tsx */
        .app-footer {
          width: 100%;
          padding: 1.5rem 1rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          background-color: transparent;
          font-size: 0.85rem;
          color: white;
        }
        .footer-section {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 500;
        }
        .footer-divider {
          color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
