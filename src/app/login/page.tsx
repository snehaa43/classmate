'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  // Mode: 'signin' or 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Sync theme
  useEffect(() => {
    const saved = localStorage.getItem('classmate_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('classmate_theme', next);
  };

  // Switch between Sign In and Sign Up tabs
  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic Client Validation
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'signin'
          ? { email: email.trim(), password }
          : { email: email.trim(), password, name: name.trim() || undefined };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        setErrorMsg(data.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      // Success
      setIsLoading(false);
      setSuccessMsg(
        mode === 'signin' ? 'Welcome back! Redirecting...' : 'Account created successfully! Redirecting...'
      );

      // Store in localStorage for quick client header sync
      if (data.user) {
        localStorage.setItem('classmate_user', JSON.stringify(data.user));
      }

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
    }
  };

  return (
    <div className="login-wrapper">
      {/* Top Navbar */}
      <header className="login-header">
        <div className="login-header-inner">
          <Link href="/" className="brand-link">
            <span className="brand-dot"></span>
            <span className="brand-name">classmate</span>
          </Link>

          <div className="header-actions">
            <Link href="/" className="btn-back">
              <ArrowLeft size={14} />
              <span>Back to App</span>
            </Link>
            <button
              type="button"
              className="theme-btn"
              onClick={toggleTheme}
              title="Toggle Theme"
              suppressHydrationWarning
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="login-main">
        <div className="login-card">
          {/* Card Header & Brand Icon */}
          <div className="card-top">
            <div className="brand-badge">
              <BookOpen size={20} className="text-emerald" />
            </div>
            <h1 className="card-title">
              {mode === 'signin' ? 'Sign in to Classmate' : 'Create your account'}
            </h1>
            <p className="card-subtitle">
              {mode === 'signin'
                ? 'Enter your email and password to access your study documents.'
                : 'Get started with intelligent PDF parsing and study chunks.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-btn ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Error / Success Alert Messages */}
          {errorMsg && (
            <div className="alert-box alert-error">
              <AlertCircle size={15} className="alert-icon" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box alert-success">
              <CheckCircle2 size={15} className="alert-icon" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Optional Name field on Sign Up */}
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="name-input">
                  Full Name <span className="label-optional">(Optional)</span>
                </label>
                <div className="input-wrap">
                  <User size={15} className="input-icon" />
                  <input
                    id="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="form-input"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                Email Address
              </label>
              <div className="input-wrap">
                <Mail size={15} className="input-icon" />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                  className="form-input"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="password-input">
                Password
              </label>
              <div className="input-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="form-input"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {mode === 'signup' && (
                <span className="field-hint">Must be at least 6 characters.</span>
              )}
            </div>

            {/* Confirm Password on Sign Up */}
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password-input">
                  Confirm Password
                </label>
                <div className="input-wrap">
                  <Lock size={15} className="input-icon" />
                  <input
                    id="confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="form-input"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" disabled={isLoading} className="btn-submit">
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Toggle Switch */}
          <div className="card-bottom">
            {mode === 'signin' ? (
              <p className="bottom-text">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="bottom-link-btn"
                  onClick={() => handleSwitchMode('signup')}
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className="bottom-text">
                Already have an account?{' '}
                <button
                  type="button"
                  className="bottom-link-btn"
                  onClick={() => handleSwitchMode('signin')}
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Scoped Minimal Styles */}
      <style jsx>{`
        .login-wrapper {
          min-height: 100vh;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          font-family: var(--font-sans);
        }

        .login-header {
          border-bottom: 1px solid var(--border-subtle);
          background-color: var(--bg-primary);
          height: 64px;
          display: flex;
          align-items: center;
        }

        .login-header-inner {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: var(--text-primary);
        }

        .brand-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--emerald-primary);
        }

        .brand-name {
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: -0.03em;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 0.35rem 0.65rem;
          border-radius: var(--radius-xs);
          border: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          transition: all var(--transition-fast);
        }

        .btn-back:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        .theme-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .theme-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        /* Main Content */
        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 2rem;
          box-shadow: var(--shadow-sm);
        }

        .card-top {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .brand-badge {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.85rem;
        }

        .card-title {
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 0.35rem;
        }

        .card-subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        /* Mode Tabs */
        .mode-toggle-group {
          display: flex;
          background: var(--bg-primary);
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          margin-bottom: 1.25rem;
        }

        .mode-btn {
          flex: 1;
          padding: 0.45rem;
          font-size: 0.8rem;
          font-weight: 500;
          border-radius: var(--radius-xs);
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mode-btn.active {
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-subtle);
        }

        /* Alert Box */
        .alert-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-xs);
          font-size: 0.78rem;
          margin-bottom: 1.25rem;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid var(--rose-primary);
          color: var(--rose-primary);
        }

        .alert-success {
          background: var(--emerald-subtle);
          border: 1px solid var(--emerald-primary);
          color: var(--emerald-primary);
        }

        .alert-icon {
          flex-shrink: 0;
        }

        /* Form */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .label-optional {
          font-weight: 400;
          color: var(--text-muted);
          font-size: 0.72rem;
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          padding: 0.55rem 2.2rem 0.55rem 2.2rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-family: var(--font-sans);
          transition: border-color var(--transition-fast);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--border-focus);
        }

        .password-toggle-btn {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .password-toggle-btn:hover {
          color: var(--text-primary);
        }

        .field-hint {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Submit Button */
        .btn-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: var(--radius-xs);
          border: 1px solid var(--text-primary);
          background: var(--text-primary);
          color: var(--bg-primary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-top: 0.5rem;
        }

        .btn-submit:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Card Bottom */
        .card-bottom {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-subtle);
        }

        .bottom-text {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .bottom-link-btn {
          background: none;
          border: none;
          color: var(--text-primary);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .bottom-link-btn:hover {
          color: var(--emerald-primary);
        }
      `}</style>
    </div>
  );
}
