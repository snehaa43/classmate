'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer-wrapper">
      <div className="container footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-icon">
              <BookOpen size={14} />
            </div>
            <span className="brand-title">DocsChat</span>
          </div>
          <p className="footer-desc">
            Grounded Retrieval-Augmented Generation (RAG) assistant for notes and PDF documents. Powered by Google Gemini & PostgreSQL pgvector.
          </p>
          <div className="footer-copyright">
            &copy; {new Date().getFullYear()} DocsChat. All rights reserved. Zero-hallucination verified document reasoning.
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-wrapper {
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          padding: 2.5rem 0 2rem 0;
          margin-top: 2rem;
        }
        .footer-container {
          display: flex;
          justify-content: center;
          text-align: center;
        }
        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          max-width: 600px;
        }
        .footer-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .brand-icon {
          color: var(--text-highlight);
        }
        .footer-desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .footer-copyright {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </footer>
  );
}

