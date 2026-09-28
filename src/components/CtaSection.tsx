'use client';

import React from 'react';
import { Terminal, UploadCloud } from 'lucide-react';

interface CtaSectionProps {
  onOpenUpload: () => void;
}

export default function CtaSection({ onOpenUpload }: CtaSectionProps) {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-card text-center">
          <div className="section-tag">Get Started</div>
          <h2 className="cta-title">Turn Documents into Verifiable Knowledge</h2>
          <p className="cta-subtitle">Test our interactive studio with your own documents in seconds.</p>
          <div className="cta-btn-group">
            <a href="#playground" className="btn btn-primary btn-lg">
              <Terminal size={16} />
              <span>Try Interactive Studio</span>
            </a>
            <button className="btn btn-secondary btn-lg" onClick={onOpenUpload}>
              <UploadCloud size={16} />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cta-card {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 4rem 2rem;
          max-width: 860px;
          margin: 0 auto;
        }
        .cta-title {
          font-size: 2.2rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .cta-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }
        .cta-btn-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
      `}</style>
    </section>
  );
}
