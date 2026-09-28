'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Box } from 'lucide-react';

interface FooterProps {
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function Footer({ onShowToast }: FooterProps) {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onShowToast(`Subscribed ${email} to Nexus AI Research Weekly!`, 'success');
      setEmail('');
    }
  };

  return (
    <footer className="footer-wrapper">
      <div className="container footer-container">
        
        <div className="footer-grid">
          {/* Brand Col */}
          <div className="footer-col brand-col">
            <Link href="/" className="nav-brand">
              <div className="brand-icon">
                <Box size={14} />
              </div>
              <span className="brand-title">NexusRAG</span>
            </Link>
            <p className="footer-tagline">
              Minimalist agentic retrieval-augmented generation platform for verified document reasoning.
            </p>
            <div className="footer-system-status">
              <span className="status-dot"></span>
              <span>All Vector Shards Operational (18ms)</span>
            </div>
          </div>

          {/* Product */}
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link href="#playground">Interactive Studio</Link></li>
              <li><Link href="#pipeline">4-Stage Pipeline</Link></li>
              <li><Link href="#features">Features</Link></li>
              <li><Link href="#comparison">Benchmarks</Link></li>
              <li><Link href="#pricing">Pricing</Link></li>
            </ul>
          </div>

          {/* Developers */}
          <div className="footer-col">
            <h4>Developers</h4>
            <ul>
              <li><Link href="#pipeline">Python SDK</Link></li>
              <li><Link href="#pipeline">TypeScript Client</Link></li>
              <li><Link href="#pipeline">REST API Spec</Link></li>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-col">
            <h4>Newsletter</h4>
            <p className="newsletter-desc">Receive research on Agentic RAG and vector retrieval.</p>
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Enter work email..."
                required
                className="newsletter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 NexusRAG Inc. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="#">SOC2</a>
          </div>
        </div>

      </div>

      <style jsx>{`
        .footer-wrapper {
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          padding: 4rem 0 2rem 0;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }
        .footer-col h4 {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .footer-col ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .footer-col ul a {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .footer-col ul a:hover {
          color: var(--text-primary);
        }
        .footer-tagline {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 1rem 0 1.25rem 0;
          max-width: 320px;
          line-height: 1.55;
        }
        .footer-system-status {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--emerald-primary);
        }
        .newsletter-desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }
        .newsletter-form {
          display: flex;
          gap: 0.4rem;
        }
        .newsletter-input {
          flex: 1;
          padding: 0.45rem 0.75rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.82rem;
          color: var(--text-primary);
        }
        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border-subtle);
          padding-top: 1.5rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .footer-bottom-links {
          display: flex;
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 1rem; text-align: center; }
        }
      `}</style>
    </footer>
  );
}
