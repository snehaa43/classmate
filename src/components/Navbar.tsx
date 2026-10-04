'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Moon, Sun, UploadCloud, MessageSquare, LogIn, LogOut, User } from 'lucide-react';
import AuthModal from '@/components/AuthModal';

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

interface NavbarProps {
  onOpenUpload?: () => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function Navbar({ onOpenUpload, onShowToast }: NavbarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('classmate_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }

    // Check existing auth session
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Guest user session
      });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('classmate_theme', next);
    onShowToast?.(`Switched to ${next.toUpperCase()} theme`, 'info');
  };

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        onShowToast?.('Logged out successfully', 'info');
      }
    } catch (e: any) {
      console.error('Logout error:', e);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleAuthSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    onShowToast?.(`Welcome, ${authUser.name || authUser.email}!`, 'success');
  };

  return (
    <>
      <header className="navbar-wrapper">
        <nav className="navbar container" id="main-nav">
          <Link href="/" className="nav-brand" aria-label="DocsChat Home">
            <div className="brand-icon">
              <BookOpen size={16} />
            </div>
            <div className="brand-text">
              <span className="brand-title">DocsChat</span>
              <span className="brand-tag">RAG v2.5</span>
            </div>
          </Link>

          <div className="nav-actions">
            <button
              id="theme-toggle"
              type="button"
              className="icon-btn"
              title={`Toggle Theme (Current: ${theme})`}
              aria-label="Toggle theme"
              onClick={toggleTheme}
              suppressHydrationWarning
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenUpload}
            >
              <UploadCloud size={14} />
              <span>Upload PDF</span>
            </button>

            <a href="#workspace" className="btn btn-primary btn-sm">
              <MessageSquare size={14} />
              <span>Q&A Workspace</span>
            </a>

            {/* User Auth Section */}
            {user ? (
              <div className="nav-user-badge">
                <span className="user-email-tag" title={user.email}>
                  <User size={12} />
                  <span>{user.name || user.email.split('@')[0]}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm nav-logout-btn"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm nav-auth-btn"
                onClick={() => openAuth('signin')}
              >
                <LogIn size={14} />
                <span>Sign In / Sign Up</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
