'use client';

import React, { useState } from 'react';
import { CODE_SNIPPETS } from '@/data/knowledgeBase';
import { Check, Copy } from 'lucide-react';

interface PipelineProps {
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function Pipeline({ onShowToast }: PipelineProps) {
  const [activeLang, setActiveLang] = useState<'python' | 'typescript' | 'curl'>('python');

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[activeLang] || CODE_SNIPPETS.python);
    onShowToast('Code snippet copied to clipboard!', 'success');
  };

  return (
    <section className="pipeline-section" id="pipeline">
      <div className="container">
        
        <div className="section-header text-center">
          <div className="section-tag">Architecture</div>
          <h2 className="section-title">The 4-Stage Retrieval Engine</h2>
          <p className="section-subtitle">
            Deterministic vector indexing and cross-encoder reranking eliminate hallucinations before response generation.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="pipeline-grid">
          
          <div className="pipeline-card">
            <div className="step-num">01</div>
            <h3 className="step-title">Multi-Modal Parsing & Semantic Chunking</h3>
            <p className="step-desc">
              Documents are deconstructed using structural boundary detection. Complex tables and headers are parsed into markdown blocks with dynamic overlap to maintain semantic continuity.
            </p>
            <ul className="step-checklist">
              <li><Check size={12} /> Table & spreadsheet layout preservation</li>
              <li><Check size={12} /> Recursive token & sentence splitting</li>
              <li><Check size={12} /> Structural metadata enrichment</li>
            </ul>
          </div>

          <div className="pipeline-card">
            <div className="step-num">02</div>
            <h3 className="step-title">High-Dimensional Vector Embeddings</h3>
            <p className="step-desc">
              Text chunks are transformed into 1536-dimensional vector representations stored in a low-latency HNSW index alongside sparse BM25 inverted keyword indexes.
            </p>
            <ul className="step-checklist">
              <li><Check size={12} /> Dense + Sparse Hybrid Indexing</li>
              <li><Check size={12} /> Sub-15ms vector similarity matching</li>
              <li><Check size={12} /> Automatic vector deduplication</li>
            </ul>
          </div>

          <div className="pipeline-card">
            <div className="step-num">03</div>
            <h3 className="step-title">Agentic Routing & Cross-Encoder Reranking</h3>
            <p className="step-desc">
              An intelligent agent decomposes multi-hop queries, fetches candidate chunks, and executes neural cross-encoder scoring to filter irrelevant passages.
            </p>
            <ul className="step-checklist">
              <li><Check size={12} /> Cross-encoder neural rerankers</li>
              <li><Check size={12} /> Multi-query decomposition</li>
              <li><Check size={12} /> GraphRAG entity-relationship traversal</li>
            </ul>
          </div>

          <div className="pipeline-card">
            <div className="step-num">04</div>
            <h3 className="step-title">Grounded LLM Generation & Verbatim Citations</h3>
            <p className="step-desc">
              The language model synthesizes an authoritative answer bounded strictly by retrieved context. Every assertion is accompanied by exact source coordinates.
            </p>
            <ul className="step-checklist">
              <li><Check size={12} /> Strict hallucination guardrails</li>
              <li><Check size={12} /> Clickable verbatim source tags</li>
              <li><Check size={12} /> Sub-second streaming output</li>
            </ul>
          </div>

        </div>

        {/* Code Banner */}
        <div className="pipeline-banner">
          <div className="banner-content">
            <div className="banner-header">
              <h3>Developer Integration</h3>
              <p>Integrate our RAG engine into your Python or Node.js backend in under 5 lines of code.</p>
            </div>

            <div className="code-tabs">
              <button
                className={`code-tab ${activeLang === 'python' ? 'active' : ''}`}
                onClick={() => setActiveLang('python')}
              >
                Python SDK
              </button>
              <button
                className={`code-tab ${activeLang === 'typescript' ? 'active' : ''}`}
                onClick={() => setActiveLang('typescript')}
              >
                TypeScript
              </button>
              <button
                className={`code-tab ${activeLang === 'curl' ? 'active' : ''}`}
                onClick={() => setActiveLang('curl')}
              >
                cURL
              </button>
            </div>

            <div className="code-block-wrap">
              <pre><code className="code-font">{CODE_SNIPPETS[activeLang]}</code></pre>
              <button className="copy-code-btn" title="Copy code" onClick={handleCopy}>
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .pipeline-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }
        .pipeline-card {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          transition: border-color var(--transition-fast);
        }
        .pipeline-card:hover {
          border-color: var(--border-medium);
        }
        .step-num {
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .step-title {
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 0.65rem;
          color: var(--text-primary);
        }
        .step-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.55;
          margin-bottom: 1.25rem;
          flex: 1;
        }
        .step-checklist {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          border-top: 1px solid var(--border-subtle);
          padding-top: 1rem;
        }
        .step-checklist li {
          font-size: 0.78rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pipeline-banner {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 1.75rem;
        }
        .banner-header {
          margin-bottom: 1.25rem;
        }
        .banner-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .banner-header p {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .code-tabs {
          display: flex;
          gap: 0.35rem;
          margin-bottom: 0.85rem;
        }
        .code-tab {
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .code-tab:hover {
          color: var(--text-primary);
        }
        .code-tab.active {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-color: var(--text-primary);
        }
        .code-block-wrap {
          position: relative;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          padding: 1.25rem;
          overflow-x: auto;
        }
        .code-block-wrap pre {
          margin: 0;
        }
        .code-block-wrap code {
          font-size: 0.82rem;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .copy-code-btn {
          position: absolute;
          top: 0.85rem;
          right: 0.85rem;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-xs);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .copy-code-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }
        @media (max-width: 1024px) {
          .pipeline-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .pipeline-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
