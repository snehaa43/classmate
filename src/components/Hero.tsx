'use client';

import React from 'react';
import { UploadCloud, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  onOpenUpload: () => void;
}

export default function Hero({ onOpenUpload }: HeroProps) {
  return (
    <section className="hero-section" id="hero">
      <div className="container hero-container">
        
        {/* Status Badge */}
        <div className="hero-badge">
          <span className="badge-status-dot"></span>
          <span className="badge-text">DocsChat Grounded RAG Engine Active — 768-d Gemini Vectors</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          Chat with your Documents & PDFs
        </h1>

        <p className="hero-subtitle">
          Upload any lecture notes, syllabus, or textbook PDF. Ask questions to get instant, accurate answers strictly grounded in your document with clickable source citations.
        </p>

        {/* Quick Action Button */}
        <div className="hero-cta-group">
          <button id="quick-upload-hero-btn" className="btn btn-primary btn-lg" onClick={onOpenUpload}>
            <UploadCloud size={18} />
            <span>Upload PDF Document</span>
          </button>
          <a href="#workspace" className="btn btn-secondary btn-lg">
            <MessageSquare size={18} />
            <span>Open Q&A Chat</span>
          </a>
        </div>

        {/* Key Features Chips */}
        <div className="hero-feature-chips">
          <div className="feature-chip">
            <ShieldCheck size={14} />
            <span>Zero Hallucinations Guarantee</span>
          </div>
          <div className="feature-chip">
            <Zap size={14} />
            <span>768-d Vector Cosine Matching</span>
          </div>
          <div className="feature-chip">
            <MessageSquare size={14} />
            <span>Page & Paragraph Citations</span>
          </div>
        </div>

      </div>

      <style jsx>{`
        .hero-section {
          padding: 3.5rem 0 2rem 0;
        }
        .hero-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-full);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
        .badge-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--emerald-primary);
        }
        .hero-title {
          font-size: 2.85rem;
          font-weight: 700;
          max-width: 760px;
          letter-spacing: -0.03em;
          line-height: 1.18;
          margin-bottom: 1.15rem;
          color: var(--text-primary);
        }
        .hero-subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary);
          max-width: 620px;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .hero-cta-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }
        .hero-feature-chips {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .feature-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.35rem 0.85rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .feature-chip span {
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 2.1rem; }
          .hero-section { padding: 2.5rem 0 1.5rem 0; }
        }
      `}</style>
    </section>
  );
}

