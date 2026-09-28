'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does NexusRAG prevent hallucinations?',
      a: 'NexusRAG employs a strictly grounded generation architecture. If the retrieved Top-K chunks do not contain verifiable facts supporting the query, the agent states that the information is absent. Every assertion is mapped to verbatim chunk coordinates with cosine confidence scores.'
    },
    {
      q: 'Which document file formats are supported?',
      a: 'We support over 100 file extensions out of the box, including Adobe PDF (with OCR), Microsoft Word (.docx), Excel (.xlsx, .csv), PowerPoint (.pptx), Markdown (.md), Plain Text (.txt), JSON, HTML, and source code files (.py, .ts, .js, .go, .rs).'
    },
    {
      q: 'Is company data used to train AI models?',
      a: 'Never. We enforce zero-data-retention agreements with foundation model providers. Documents are encrypted in transit with TLS 1.3 and at rest with AES-256. For enterprise deployments, we offer 100% on-premise local vector indexing and open-weights LLMs.'
    },
    {
      q: 'What makes Hybrid Search superior to standard vector search?',
      a: 'Pure vector search excels at conceptual similarities but often misses exact keyword identifiers like product IDs, legal clause numbers, or specific dates. Our hybrid retriever fuses dense semantic embeddings with sparse BM25 keyword matching for optimal recall.'
    },
    {
      q: 'Can NexusRAG be integrated via API?',
      a: 'Yes. We provide complete SDKs for Python, Node.js/TypeScript, and standard OpenAPI REST endpoints. You can ingest files, create isolated tenant collections, and receive structured JSON responses with citation coordinates.'
    }
  ];

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        
        <div className="section-header text-center">
          <div className="section-tag">FAQ</div>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Common questions regarding vector embeddings, security, and accuracy.</p>
        </div>

        <div className="faq-accordion-wrap">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item ${openIndex === i ? 'active' : ''}`}>
              <button
                className="faq-question"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>
              {openIndex === i && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      <style jsx>{`
        .faq-accordion-wrap {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .faq-item {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          overflow: hidden;
        }
        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 1.25rem;
          text-align: left;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .faq-answer {
          padding: 0 1.25rem 1.1rem 1.25rem;
        }
        .faq-answer p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }
      `}</style>
    </section>
  );
}
