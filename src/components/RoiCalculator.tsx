'use client';

import React, { useState } from 'react';

export default function RoiCalculator() {
  const [docs, setDocs] = useState<number>(250);
  const [pages, setPages] = useState<number>(35);
  const [queries, setQueries] = useState<number>(120);

  const hoursSaved = Math.round(docs * pages * 0.08 + queries * 30 * 0.05);
  const tokenSavings = Math.round(docs * pages * 450 * 0.000015 * 30 + queries * 30 * 0.18);

  return (
    <section className="calculator-section" id="calculator">
      <div className="container">
        
        <div className="calculator-card">
          <div className="calc-header text-center">
            <div className="section-tag">Estimator</div>
            <h2 className="section-title">Calculate Your Time & Cost Savings</h2>
            <p className="section-subtitle">Adjust the parameters to estimate your team's monthly efficiency gains.</p>
          </div>

          <div className="calc-grid">
            {/* Sliders */}
            <div className="calc-inputs">
              <div className="slider-group">
                <div className="slider-label-row">
                  <label htmlFor="slider-docs">Monthly Documents Uploaded:</label>
                  <span className="slider-val">{docs.toLocaleString()} Docs</span>
                </div>
                <input
                  type="range"
                  id="slider-docs"
                  min="10"
                  max="5000"
                  step="10"
                  value={docs}
                  onChange={(e) => setDocs(parseInt(e.target.value, 10))}
                  className="custom-slider"
                />
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <label htmlFor="slider-pages">Average Pages per Document:</label>
                  <span className="slider-val">{pages} Pages</span>
                </div>
                <input
                  type="range"
                  id="slider-pages"
                  min="5"
                  max="300"
                  step="5"
                  value={pages}
                  onChange={(e) => setPages(parseInt(e.target.value, 10))}
                  className="custom-slider"
                />
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <label htmlFor="slider-queries">Team Search Queries per Day:</label>
                  <span className="slider-val">{queries.toLocaleString()} Queries</span>
                </div>
                <input
                  type="range"
                  id="slider-queries"
                  min="10"
                  max="2000"
                  step="10"
                  value={queries}
                  onChange={(e) => setQueries(parseInt(e.target.value, 10))}
                  className="custom-slider"
                />
              </div>
            </div>

            {/* Results */}
            <div className="calc-results">
              <div className="result-box">
                <span className="result-label">Monthly Time Saved</span>
                <span className="result-number">{hoursSaved.toLocaleString()} hrs</span>
                <span className="result-desc">Equivalent to 1.2 full-time analysts</span>
              </div>

              <div className="result-box">
                <span className="result-label">Token Cost Savings</span>
                <span className="result-number text-emerald">${tokenSavings.toLocaleString()}<small>/mo</small></span>
                <span className="result-desc">Compared to full-context prompt stuffing</span>
              </div>

              <div className="result-box">
                <span className="result-label">Retrieval Speed</span>
                <span className="result-number">98.4% faster</span>
                <span className="result-desc">Average latency 180ms per query</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <style jsx>{`
        .calculator-card {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 2.5rem;
        }
        .calc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          margin-top: 2rem;
        }
        .calc-inputs {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .slider-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .slider-val {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--text-primary);
        }
        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          outline: none;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--text-primary);
          border: 2px solid var(--bg-primary);
          cursor: pointer;
        }
        .calc-results {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .result-box {
          padding: 1.25rem;
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .result-label {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .result-number {
          font-family: var(--font-mono);
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .result-number small {
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .result-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        @media (max-width: 1024px) {
          .calc-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
