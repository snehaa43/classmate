'use client';

import React from 'react';
import { Layers, Table, Quote, ShieldCheck, GitGraph, Plug } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: <Layers size={18} />,
      title: 'Multi-Document Synthesis',
      desc: 'Execute cross-cutting queries across thousands of documents simultaneously without losing contextual precision.',
      stat: '100k+ Documents per Index'
    },
    {
      icon: <Table size={18} />,
      title: 'Tabular & Formula Reasoning',
      desc: 'Parses financial balance sheets and nested tables into semantic data frames for accurate calculations and YoY analysis.',
      stat: '100% Deterministic Math'
    },
    {
      icon: <Quote size={18} />,
      title: 'Verifiable Audit Trail',
      desc: 'Every factual assertion includes interactive page, paragraph, and line references for instant compliance auditability.',
      stat: 'Zero Blind Guessing'
    },
    {
      icon: <ShieldCheck size={18} />,
      title: 'Role-Based Access Control',
      desc: 'Document-level and chunk-level security policies ensure team members only receive answers from cleared documents.',
      stat: 'SOC2 Type II & HIPAA Ready'
    },
    {
      icon: <GitGraph size={18} />,
      title: 'GraphRAG & Entity Relations',
      desc: 'Discovers implicit semantic links between people, companies, contracts, and dates across disparate files.',
      stat: 'Hierarchical Graph Traversal'
    },
    {
      icon: <Plug size={18} />,
      title: '50+ Knowledge Connectors',
      desc: 'Sync data continuously from Google Drive, Notion, Slack, OneDrive, AWS S3, GitHub, and PostgreSQL.',
      stat: 'Real-Time Webhooks'
    }
  ];

  return (
    <section className="features-section" id="features">
      <div className="container">
        
        <div className="section-header text-center">
          <div className="section-tag">Capabilities</div>
          <h2 className="section-title">Designed for Complex Knowledge Bases</h2>
          <p className="section-subtitle">
            From 500-page regulatory filings to financial spreadsheets, NexusRAG handles edge cases that break basic semantic search.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <div className="feature-stat">{f.stat}</div>
            </div>
          ))}
        </div>

      </div>

      <style jsx>{`
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        .feature-card {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          transition: border-color var(--transition-fast);
        }
        .feature-card:hover {
          border-color: var(--border-medium);
        }
        .feature-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          margin-bottom: 1.25rem;
        }
        .feature-card h3 {
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }
        .feature-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.55;
          margin-bottom: 1.25rem;
          flex: 1;
        }
        .feature-stat {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-subtle);
          padding-top: 0.85rem;
        }
        @media (max-width: 1024px) {
          .features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
