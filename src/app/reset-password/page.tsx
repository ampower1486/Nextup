'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const check = async () => {
      console.log("Reset page: checking session...");
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s && mounted) {
        console.log("Reset page: session found!");
        setVerifying(false);
        return true;
      }
      return false;
    };

    // 1. Check for fragment/tokens in URL (Fallback for some flows)
    if (typeof window !== 'undefined' && (window.location.hash || window.location.search.includes('access_token'))) {
      console.log("Reset page: detected token in URL, attempting to set session...");
      // Supabase client handles this automatically on init, but we can nudge it
      supabase.auth.onAuthStateChange((event, session) => {
        if (session && mounted) {
          setVerifying(false);
          setError(null);
        }
      });
    }

    // 2. Listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Reset page auth event:", event, !!session);
      if (session && mounted) {
        setVerifying(false);
        setError(null);
      }
    });

    // 3. Poll aggressively for a few seconds
    const poll = async () => {
      for (let i = 0; i < 15; i++) { // Increased to 15 retries (7.5s total)
        if (!mounted) break;
        const found = await check();
        if (found) {
          subscription.unsubscribe();
          return;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      if (mounted) {
        setError("Could not verify your reset session. Hint: Are you using the same browser and device that requested the link? Password reset links often only work in the browser where they were requested.");
        setVerifying(false);
      }
      subscription.unsubscribe();
    };

    poll();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Sign out to force fresh login with new password
      await supabase.auth.signOut();
      router.push('/login?message=Password updated successfully. Please log in with your new password.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/nextup_logo_3d.png" alt="Nextup" className="login-logo" />
          <h1>Reset Password</h1>
          <p>Enter your new password below.</p>
        </div>

        <form onSubmit={handleUpdate} className="login-form">
          {error && (
            <div className="error-message">
              {error}
              <br />
              <a href="/forgot-password" style={{ color: '#00c3ff', textDecoration: 'underline', marginTop: '8px', display: 'inline-block' }}>
                Request a new link
              </a>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading || verifying} className="btn-login">
            {loading ? 'Updating...' : verifying ? 'Verifying Link...' : 'Update Password'}
          </button>
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
      `}</style>
    </div>
  );
}
