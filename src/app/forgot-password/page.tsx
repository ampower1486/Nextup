'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      if (error.status === 429) {
        setError("Email rate limit exceeded. Please wait a few minutes before trying again.");
      } else {
        setError(error.message);
      }
    } else {
      setMessage('Password reset link sent! Check your email.');
      setCooldown(60); // 60 seconds cooldown
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/nextup_logo_3d.png" alt="Nextup" className="login-logo" />
          <h1>Forgot Password</h1>
          <p>Enter your email to receive a reset link.</p>
        </div>

        <form onSubmit={handleReset} className="login-form">
          {error && <div className="error-message">{error}</div>}
          {message && (
            <div className="success-message">
              {message}
              <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.8rem', color: '#fff' }}>
                <strong>Important:</strong> Please open the link in the <strong>same browser and device</strong> you are using right now.
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@restaurant.com"
            />
          </div>

          <button type="submit" disabled={loading || cooldown > 0} className="btn-login">
            {loading ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send Reset Link'}
          </button>

          <div className="back-to-login">
            <a href="/login" className="forgot-password-link">Back to Login</a>
          </div>
        </form>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
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
        }

        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .login-logo {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          object-fit: cover;
          box-shadow: 0 10px 25px rgba(0, 195, 255, 0.3);
          margin-bottom: 1.5rem;
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

        .success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #4ade80;
          padding: 0.875rem;
          border-radius: 10px;
          font-size: 0.875rem;
          text-align: center;
        }

        .back-to-login {
          text-align: center;
          margin-top: 0.5rem;
        }

        .forgot-password-link, .forgot-password-link:visited {
          color: #00c3ff !important;
          font-size: 0.9rem;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .forgot-password-link:hover {
          color: #0077ff;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
