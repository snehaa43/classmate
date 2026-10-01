'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Box, Moon, Sun, UploadCloud, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onOpenUpload?: () => void;
  onShowToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function Navbar({ onOpenUpload, onShowToast }: NavbarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nexus_theme', next);
    onShowToast?.(`Switched to ${next.toUpperCase()} theme`, 'info');
  };

  return (
    <header className="navbar-wrapper">
      <nav className="navbar container" id="main-nav">
        <Link href="/" className="nav-brand" aria-label="NexusRAG Home">
          <div className="brand-icon">
            <Box size={16} />
          </div>
          <div className="brand-text">
            <span className="brand-title">NexusRAG</span>
            <span className="brand-tag">v2.5</span>
          </div>
        </Link>

        <div className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`} id="nav-menu">
          <Link href="#playground" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Studio
          </Link>
          <Link href="#pipeline" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Architecture
          </Link>
          <Link href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Features
          </Link>
          <Link href="#comparison" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Benchmarks
          </Link>
          <Link href="#calculator" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            ROI
          </Link>
          <Link href="#pricing" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Pricing
          </Link>
          <Link href="#faq" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            FAQ
          </Link>
        </div>

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

          <a
            href="#playground"
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              if (onOpenUpload) {
                onOpenUpload();
              }
            }}
          >
            <UploadCloud size={14} />
            <span>Upload</span>
          </a>

          <a href="#playground" className="btn btn-primary btn-sm">
            <span>Open Studio</span>
            <ArrowRight size={14} />
          </a>

          <button
            id="mobile-toggle"
            className="mobile-toggle"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
    </header>
  );
}
