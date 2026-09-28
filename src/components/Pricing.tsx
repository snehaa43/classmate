'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface PricingProps {
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function Pricing({ onShowToast }: PricingProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  const toggleBilling = () => {
    const next = !isAnnual;
    setIsAnnual(next);
    if (next) {
      onShowToast('Applied 20% annual discount!', 'success');
    }
  };

  const proPrice = isAnnual ? '23' : '29';
  const entPrice = isAnnual ? '159' : '199';
  const periodText = isAnnual ? '/ month (billed annually)' : '/ month';

  return (
    <section className="pricing-section" id="pricing">
      <div className="container">
        
        <div className="section-header text-center">
          <div className="section-tag">Pricing</div>
          <h2 className="section-title">Transparent, Predictable Plans</h2>
          <p className="section-subtitle">Start testing for free. Upgrade as your indexing volume and team size grow.</p>
          
          {/* Billing Toggle */}
          <div className="billing-toggle-wrap">
            <span className="billing-label">Monthly</span>
            <button
              className={`billing-toggle-btn ${isAnnual ? 'annual' : ''}`}
              onClick={toggleBilling}
              aria-label="Toggle annual billing"
            >
              <span className="toggle-circle"></span>
            </button>
            <span className="billing-label">
              Annual <span className="discount-badge">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="pricing-grid">
          
          {/* Tier 1 */}
          <div className="pricing-card">
            <div className="pricing-header">
              <h3 className="tier-name">Starter Sandbox</h3>
              <p className="tier-desc">For developers, students, and prototype builders.</p>
              <div className="price-wrap">
                <span className="price-currency">$</span>
                <span className="price-val">0</span>
                <span className="price-period">/ month</span>
              </div>
            </div>
            <ul className="tier-features">
              <li><Check size={14} /> Up to 50 Documents / month</li>
              <li><Check size={14} /> 1,000 Questions / month</li>
              <li><Check size={14} /> 1536-dim Vector Embeddings</li>
              <li><Check size={14} /> Standard Citation Highlighting</li>
              <li><Check size={14} /> Community Support</li>
            </ul>
            <a href="#playground" className="btn btn-outline btn-block">Get Started Free</a>
          </div>

          {/* Tier 2 */}
          <div className="pricing-card popular-tier">
            <div className="popular-tag">RECOMMENDED</div>
            <div className="pricing-header">
              <h3 className="tier-name">Pro Team</h3>
              <p className="tier-desc">For research teams, legal firms, and AI startups.</p>
              <div className="price-wrap">
                <span className="price-currency">$</span>
                <span className="price-val">{proPrice}</span>
                <span className="price-period">{periodText}</span>
              </div>
            </div>
            <ul className="tier-features">
              <li><Check size={14} /> <strong>Unlimited</strong> Document Uploads</li>
              <li><Check size={14} /> <strong>25,000</strong> Agent Queries / month</li>
              <li><Check size={14} /> BM25 + ColBERT Neural Reranking</li>
              <li><Check size={14} /> Tabular & Spreadsheet Math Engine</li>
              <li><Check size={14} /> Cloud Storage Connectors</li>
              <li><Check size={14} /> Priority Sub-100ms Inference</li>
            </ul>
            <a href="#playground" className="btn btn-primary btn-block">Start 14-Day Pro Trial</a>
          </div>

          {/* Tier 3 */}
          <div className="pricing-card">
            <div className="pricing-header">
              <h3 className="tier-name">Enterprise Fleet</h3>
              <p className="tier-desc">For corporations requiring dedicated vector clusters and custom SLAs.</p>
              <div className="price-wrap">
                <span className="price-currency">$</span>
                <span className="price-val">{entPrice}</span>
                <span className="price-period">{periodText}</span>
              </div>
            </div>
            <ul className="tier-features">
              <li><Check size={14} /> Dedicated Vector Index Clusters</li>
              <li><Check size={14} /> Custom Fine-Tuned Embeddings</li>
              <li><Check size={14} /> Granular RBAC & Permission Sync</li>
              <li><Check size={14} /> On-Premise VPC Deployment</li>
              <li><Check size={14} /> SOC2 Type II & HIPAA Compliance</li>
              <li><Check size={14} /> Dedicated Support Engineer</li>
            </ul>
            <a href="#playground" className="btn btn-outline btn-block">Contact Solutions</a>
          </div>

        </div>

      </div>

      <style jsx>{`
        .billing-toggle-wrap {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-full);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
        }
        .billing-label {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .discount-badge {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-xs);
          background: var(--emerald-subtle);
          color: var(--emerald-primary);
          margin-left: 0.25rem;
        }
        .billing-toggle-btn {
          width: 40px;
          height: 22px;
          border-radius: 11px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          position: relative;
          transition: background var(--transition-fast);
        }
        .toggle-circle {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--text-primary);
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform var(--transition-fast);
        }
        .billing-toggle-btn.annual .toggle-circle {
          transform: translateX(18px);
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 3rem;
        }
        .pricing-card {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .popular-tier {
          border-color: var(--text-primary);
        }
        .popular-tag {
          position: absolute;
          top: -10px;
          right: 1.5rem;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-xs);
          background: var(--text-primary);
          color: var(--bg-primary);
        }
        .pricing-header {
          margin-bottom: 1.5rem;
        }
        .tier-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }
        .tier-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
          min-height: 40px;
        }
        .price-wrap {
          display: flex;
          align-items: baseline;
          margin-top: 1rem;
        }
        .price-currency {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .price-val {
          font-family: var(--font-mono);
          font-size: 2.4rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.03em;
        }
        .price-period {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-left: 0.35rem;
        }
        .tier-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
          flex: 1;
        }
        .tier-features li {
          font-size: 0.82rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        @media (max-width: 1024px) {
          .pricing-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
