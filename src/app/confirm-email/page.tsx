'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function ConfirmEmail() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // Since we don't store the email here after redirect, 
    // in a real app we might pass it as a query param or keep in state.
    // For now, let's try to get it from the URL or session if available.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Could not find your email. Please try signing up again.");
      setLoading(false);
      return;
    }

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    }
    setLoading(false);
  };

  return (
    <div className="confirm-container">
      <div className="confirm-box">
        <div className="confirm-header">
          <div className="icon-pulse">
            <Mail size={48} color="#00c3ff" />
          </div>
          <h1>Confirm your email</h1>
          <p>We've sent a magic link to your email address. Please click the link to verify your account.</p>
        </div>

        <div className="confirm-body">
          <div className="instruction-item">
            <span className="step-number">1</span>
            <p>Open your email inbox</p>
          </div>
          <div className="instruction-item">
            <span className="step-number">2</span>
            <p>Click the <strong>Confirm Email</strong> button</p>
          </div>
          <div className="instruction-item">
            <span className="step-number">3</span>
            <p>Log in to your new dashboard</p>
          </div>
        </div>

        <div className="confirm-footer">
          <Link href="/login" className="btn-back">
            <ArrowLeft size={18} />
            <span>Back to Login</span>
          </Link>
          <p className="resend-text">
            {sent ? (
              <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <CheckCircle2 size={16} /> Email resent! Check your inbox.
              </span>
            ) : (
              <>
                Didn't get the email?
                <button
                  className="link-btn"
                  onClick={handleResend}
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Resend'}
                </button>
              </>
            )}
          </p>
          {error && <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
        </div>
      </div>

      <style jsx>{`
        .confirm-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          font-family: 'Inter', sans-serif;
          padding: 2rem;
        }

        .confirm-box {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 480px;
          text-align: center;
        }

        .confirm-header {
          margin-bottom: 2.5rem;
        }

        .icon-pulse {
          display: inline-flex;
          padding: 1.5rem;
          background: rgba(0, 195, 255, 0.1);
          border-radius: 50%;
          margin-bottom: 1.5rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 195, 255, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(0, 195, 255, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 195, 255, 0); }
        }

        .confirm-header h1 {
          color: white;
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 1rem 0;
          letter-spacing: -0.025em;
        }

        .confirm-header p {
          color: #94a3b8;
          font-size: 1.05rem;
          line-height: 1.6;
          max-width: 320px;
          margin: 0 auto;
        }

        .confirm-body {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 20px;
          padding: 1.5rem;
          margin-bottom: 2.5rem;
          text-align: left;
        }

        .instruction-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
        }

        .instruction-item:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .step-number {
          width: 24px;
          height: 24px;
          background: #00c3ff;
          color: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .instruction-item p {
          color: #cbd5e1;
          font-size: 0.95rem;
          margin: 0;
        }

        .instruction-item strong {
          color: white;
        }

        .confirm-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.875rem 1.5rem;
          border-radius: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-back:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .resend-text {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        .link-btn {
          background: none;
          border: none;
          color: #00c3ff;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          margin-left: 0.25rem;
        }

        .link-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
