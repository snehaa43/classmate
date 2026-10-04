'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: { id: string; email: string; name?: string | null }) => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'signin',
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const payload: any = { email: email.trim(), password };
      if (mode === 'signup' && name.trim()) {
        payload.name = name.trim();
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Authentication failed (${res.status})`);
      }

      setSuccessMsg(
        mode === 'signin' ? 'Welcome back! Logged in successfully.' : 'Account created successfully!'
      );

      if (onAuthSuccess && data.user) {
        onAuthSuccess(data.user);
      }

      setTimeout(() => {
        onClose();
        setEmail('');
        setPassword('');
        setName('');
        setSuccessMsg(null);
      }, 700);
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <User size={16} className="text-primary" />
            <span>{mode === 'signin' ? 'Sign In to DocsChat' : 'Create Account'}</span>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Modal Body / Form */}
        <div className="modal-body">
          {error && (
            <div className="auth-alert error">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="auth-name">
                  Full Name (Optional)
                </label>
                <div className="input-with-icon">
                  <User size={14} className="input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    className="form-input"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">
                Email Address
              </label>
              <div className="input-with-icon">
                <Mail size={14} className="input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="auth-password">
                  Password
                </label>
                {mode === 'signup' && (
                  <span className="form-hint">Min. 6 characters</span>
                )}
              </div>
              <div className="input-with-icon">
                <Lock size={14} className="input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-trailing-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Footer */}
          <div className="auth-footer-text">
            {mode === 'signin' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => switchMode('signup')}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => switchMode('signin')}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
