'use client';

import React from 'react';
import Image from 'next/image';
import { Terminal, UploadCloud, PlayCircle, Lock, Layers, GitBranch } from 'lucide-react';

interface HeroProps {
  onOpenUpload: () => void;
  onOpenTour: () => void;
}

export default function Hero({ onOpenUpload, onOpenTour }: HeroProps) {
  return (
    <section className="hero-section" id="hero">
      <div className="container hero-container">
        
        {/* Minimal Badge */}
        <div className="hero-badge">
          <span className="badge-status-dot"></span>
          <span className="badge-text">Nexus Engine v2.5 Active — Hybrid Graph & Dense Vector Retrieval</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          Agentic Document Intelligence with Verifiable Grounding
        </h1>

        <p className="hero-subtitle">
          Upload enterprise PDFs, contracts, financial audits, or source repositories. 
          Our multi-hop RAG agent indexes vector embeddings and returns verified, citation-backed answers in under 200ms.
        </p>

        {/* Hero CTA Cluster */}
        <div className="hero-cta-group">
          <a href="#playground" className="btn btn-primary btn-lg">
            <Terminal size={16} />
            <span>Launch Interactive Studio</span>
          </a>
          <button id="quick-upload-hero-btn" className="btn btn-secondary btn-lg" onClick={onOpenUpload}>
            <UploadCloud size={16} />
            <span>Drop Document Here</span>
          </button>
          <button id="tour-modal-btn" className="btn btn-outline btn-lg" onClick={onOpenTour}>
            <PlayCircle size={16} />
            <span>View 2-Min Flow</span>
          </button>
        </div>

        {/* Minimal Metrics Strip */}
        <div className="hero-metrics">
          <div className="metric-card">
            <span className="metric-value">148<small>ms</small></span>
            <span className="metric-label">P99 Vector Retrieval</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">99.8<small>%</small></span>
            <span className="metric-label">Verifiable Citation Grounding</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">1536<small>d</small></span>
            <span className="metric-label">Dense Semantic Embeddings</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">100<small>+</small></span>
            <span className="metric-label">Supported Document Formats</span>
          </div>
        </div>

        {/* Minimal Preview Frame */}
        <div className="hero-visual-frame">
          <div className="frame-bar">
            <div className="frame-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <div className="frame-url-bar">
              <Lock size={12} />
              <span>nexus-rag://workspace/active-context/financial-report-2024.pdf</span>
            </div>
            <div className="frame-status">
              <span className="status-indicator"></span>
              <span>Index Operational</span>
            </div>
          </div>
          <div className="hero-preview-inner">
            <img
              src="/assets/hero_knowledge_graph.jpg"
              alt="NexusRAG Knowledge Graph and Neural Document Parsing"
              className="hero-img-preview"
            />
            <div className="hero-overlay-callouts">
              <div className="callout-pill callout-left">
                <Layers size={16} />
                <div>
                  <strong>3,420 Chunks Indexed</strong>
                  <span>HNSW Dense Vector Graph</span>
                </div>
              </div>
              <div className="callout-pill callout-right">
                <GitBranch size={16} />
                <div>
                  <strong>Agent Reasoning Active</strong>
                  <span>Multi-hop query routing</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .hero-section {
          padding: 5.5rem 0 4rem 0;
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
          margin-bottom: 1.75rem;
        }
        .badge-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--emerald-primary);
        }
        .hero-title {
          font-size: 3.2rem;
          font-weight: 700;
          max-width: 840px;
          letter-spacing: -0.035em;
          line-height: 1.15;
          margin-bottom: 1.25rem;
          color: var(--text-primary);
        }
        .hero-subtitle {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 660px;
          line-height: 1.65;
          margin-bottom: 2.25rem;
        }
        .hero-cta-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 3.5rem;
        }
        .hero-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          width: 100%;
          max-width: 900px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          margin-bottom: 3.5rem;
          overflow: hidden;
        }
        .metric-card {
          padding: 1.25rem 1rem;
          text-align: center;
          border-right: 1px solid var(--border-subtle);
        }
        .metric-card:last-child {
          border-right: none;
        }
        .metric-value {
          display: block;
          font-family: var(--font-mono);
          font-size: 1.65rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }
        .metric-value small {
          font-size: 0.95rem;
          color: var(--text-muted);
          font-weight: 400;
          margin-left: 2px;
        }
        .metric-label {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .hero-visual-frame {
          width: 100%;
          max-width: 1040px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        .frame-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-subtle);
        }
        .frame-dots {
          display: flex;
          gap: 6px;
        }
        .frame-dots .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--border-medium);
        }
        .frame-url-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.85rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .frame-status {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .frame-status .status-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--emerald-primary);
        }
        .hero-preview-inner {
          position: relative;
          background: var(--bg-primary);
        }
        .hero-img-preview {
          width: 100%;
          display: block;
        }
        .hero-overlay-callouts {
          position: absolute;
          bottom: 1.25rem;
          left: 1.25rem;
          right: 1.25rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          pointer-events: none;
        }
        .callout-pill {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 1rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          text-align: left;
          box-shadow: var(--shadow-sm);
        }
        .callout-pill strong {
          display: block;
          font-size: 0.82rem;
          color: var(--text-primary);
        }
        .callout-pill span {
          display: block;
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        @media (max-width: 1024px) {
          .hero-title { font-size: 2.5rem; }
        }
        @media (max-width: 768px) {
          .hero-title { font-size: 2rem; }
          .hero-metrics { grid-template-columns: repeat(2, 1fr); }
          .metric-card:nth-child(2) { border-right: none; }
          .metric-card:nth-child(1), .metric-card:nth-child(2) { border-bottom: 1px solid var(--border-subtle); }
          .hero-overlay-callouts { display: none; }
        }
      `}</style>
    </section>
  );
}
