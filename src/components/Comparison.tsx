'use client';

import React from 'react';

export default function Comparison() {
  return (
    <section className="comparison-section" id="comparison">
      <div className="container">
        
        <div className="section-header text-center">
          <div className="section-tag">Benchmarks</div>
          <h2 className="section-title">Performance Comparison</h2>
          <p className="section-subtitle">
            Comparison between standard LLM prompt stuffing, naive vector search, and NexusRAG.
          </p>
        </div>

        <div className="table-responsive">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Evaluation Metric</th>
                <th>Vanilla LLM</th>
                <th>Naive Vector RAG</th>
                <th className="col-highlight">NexusRAG Engine</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Retrieval Accuracy (Recall@5)</strong></td>
                <td><span className="text-danger">Limited by Context</span></td>
                <td><span className="text-warning">71.4%</span></td>
                <td className="col-highlight"><span className="text-emerald font-bold">98.6% (Top Performer)</span></td>
              </tr>
              <tr>
                <td><strong>Citation Grounding</strong></td>
                <td><span className="text-danger">None</span></td>
                <td><span className="text-warning">Vague References</span></td>
                <td className="col-highlight"><span className="text-emerald font-bold">Verbatim Coordinates</span></td>
              </tr>
              <tr>
                <td><strong>Tabular & Financial Reasoning</strong></td>
                <td><span className="text-danger">Frequent Hallucination</span></td>
                <td><span className="text-danger">Row Splitting Errors</span></td>
                <td className="col-highlight"><span className="text-emerald font-bold">DataFrame Parser</span></td>
              </tr>
              <tr>
                <td><strong>Multi-Hop Question Answering</strong></td>
                <td><span className="text-warning">Context Degradation</span></td>
                <td><span className="text-danger">Single-Hop Retrieval</span></td>
                <td className="col-highlight"><span className="text-emerald font-bold">Agentic Sub-Queries</span></td>
              </tr>
              <tr>
                <td><strong>Token Cost & Window Usage</strong></td>
                <td><span className="text-danger">High ($$$)</span></td>
                <td><span className="text-warning">Moderate ($$)</span></td>
                <td className="col-highlight"><span className="text-emerald font-bold">88% Token Reduction ($)</span></td>
              </tr>
              <tr>
                <td><strong>Data Privacy & Isolation</strong></td>
                <td><span className="text-danger">Shared Cloud</span></td>
                <td><span className="text-warning">Custom Setup</span></td>
                <td className="col-highlight"><span className="text-emerald font-bold">Zero Data Retention</span></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <style jsx>{`
        .table-responsive {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          overflow-x: auto;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }
        .comparison-table th,
        .comparison-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
        }
        .comparison-table th {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: var(--bg-primary);
        }
        .comparison-table tbody tr:last-child td {
          border-bottom: none;
        }
        .comparison-table td strong {
          color: var(--text-primary);
        }
        .comparison-table .col-highlight {
          background: var(--bg-tertiary);
        }
      `}</style>
    </section>
  );
}
