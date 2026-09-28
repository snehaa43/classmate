'use client';

import React from 'react';
import { PlayCircle, X } from 'lucide-react';

interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryNow: () => void;
}

export default function TourModal({ isOpen, onClose, onTryNow }: TourModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <PlayCircle size={16} />
            <span>How NexusRAG Works</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-img-container">
            <img src="/assets/pipeline_preview.jpg" alt="RAG Pipeline Flow" className="modal-preview-img" />
          </div>
          <div className="modal-tour-steps">
            <div className="tour-step-item">
              <div className="tour-num">1</div>
              <div>
                <strong>Ingest File</strong>
                <p>Upload any PDF, document, or dataset into the studio.</p>
              </div>
            </div>
            <div className="tour-step-item">
              <div className="tour-num">2</div>
              <div>
                <strong>Vector Indexing</strong>
                <p>Text is split into semantic chunks with 1536-dimensional embeddings.</p>
              </div>
            </div>
            <div className="tour-step-item">
              <div className="tour-num">3</div>
              <div>
                <strong>Query with Citations</strong>
                <p>The agent generates answers with verbatim clickable citations.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-block" onClick={onTryNow}>
            Open Studio Now
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .modal-card {
          width: 100%;
          max-width: 620px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
        }
        .modal-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .modal-close {
          color: var(--text-muted);
        }
        .modal-close:hover {
          color: var(--text-primary);
        }
        .modal-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .modal-img-container {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          overflow: hidden;
        }
        .modal-preview-img {
          width: 100%;
          display: block;
        }
        .modal-tour-steps {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .tour-step-item {
          display: flex;
          gap: 0.75rem;
        }
        .tour-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .tour-step-item strong {
          display: block;
          font-size: 0.82rem;
          color: var(--text-primary);
        }
        .tour-step-item p {
          font-size: 0.76rem;
          color: var(--text-secondary);
        }
        .modal-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border-subtle);
        }
      `}</style>
    </div>
  );
}
