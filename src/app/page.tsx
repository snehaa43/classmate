'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  Trash2,
  Eye,
  BookOpen,
  Clock,
  ArrowRight,
  Sun,
  Moon,
  FolderPlus,
  AlertCircle,
  FileCheck
} from 'lucide-react';

interface UploadedPDF {
  id: string;
  name: string;
  size: string;
  pages: number;
  uploadedAt: string;
  status: 'ready' | 'processing' | 'error';
  summary: string;
  extractedTopics: string[];
}

const SAMPLE_PDFS: UploadedPDF[] = [
  {
    id: 'sample-1',
    name: 'CS101_Data_Structures_Algorithms.pdf',
    size: '2.4 MB',
    pages: 28,
    uploadedAt: 'Just now',
    status: 'ready',
    summary: 'Comprehensive lecture notes covering Binary Search Trees, Graph Traversals (BFS/DFS), Hash Maps, and Big-O Time Complexity analysis.',
    extractedTopics: ['Binary Trees', 'Dijkstra Algorithm', 'Dynamic Programming', 'Complexity']
  },
  {
    id: 'sample-2',
    name: 'Bio204_Cellular_Respiration_Guide.pdf',
    size: '4.1 MB',
    pages: 42,
    uploadedAt: '2 hours ago',
    status: 'ready',
    summary: 'Detailed study guide focusing on Glycolysis, the Krebs Cycle, Electron Transport Chain, and ATP yield calculations.',
    extractedTopics: ['Glycolysis', 'Krebs Cycle', 'Oxidative Phosphorylation', 'Mitochondria']
  }
];

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [pdfs, setPdfs] = useState<UploadedPDF[]>(SAMPLE_PDFS);
  const [selectedPdf, setSelectedPdf] = useState<UploadedPDF | null>(SAMPLE_PDFS[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; name: string; percent: number }>({
    active: false,
    name: '',
    percent: 0
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('classmate_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('classmate_theme', next);
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please upload a PDF document (.pdf)', 'error');
      return;
    }

    const fileSizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setUploadProgress({ active: true, name: file.name, percent: 15 });

    let current = 15;
    const interval = setInterval(() => {
      current += 20;
      if (current >= 95) {
        clearInterval(interval);
        setTimeout(() => {
          const newPdf: UploadedPDF = {
            id: `pdf-${Date.now()}`,
            name: file.name,
            size: fileSizeStr,
            pages: Math.floor(8 + Math.random() * 32),
            uploadedAt: 'Just now',
            status: 'ready',
            summary: `Successfully parsed ${file.name}. Document sections, outline headings, and tabular data extracted and indexed for collaborative study.`,
            extractedTopics: ['Lecture Notes', 'Key Concepts', 'Chapter Summary', 'Exam Practice']
          };

          setPdfs((prev) => [newPdf, ...prev]);
          setSelectedPdf(newPdf);
          setUploadProgress({ active: false, name: '', percent: 0 });
          showToast(`Uploaded and indexed ${file.name}`, 'success');
        }, 400);
      } else {
        setUploadProgress({ active: true, name: file.name, percent: current });
      }
    }, 200);
  };

  const handleDelete = (id: string, name: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id));
    if (selectedPdf?.id === id) {
      const remaining = pdfs.filter((p) => p.id !== id);
      setSelectedPdf(remaining.length > 0 ? remaining[0] : null);
    }
    showToast(`Removed ${name}`, 'info');
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-dot"></span>
            <span className="brand-name">classmate</span>
            <span className="brand-badge">PDF Studio</span>
          </div>

          <div className="header-actions">
            <button
              className="theme-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container main-content">
        
        {/* Intro */}
        <div className="intro-section">
          <h1 className="main-title">Upload Study PDFs</h1>
          <p className="main-desc">
            Drop your course syllabus, lecture slides, research papers, or notes. Classmate indexes the text into structured study summaries.
          </p>
        </div>

        {/* Upload Dropzone */}
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="file-input-hidden"
            accept=".pdf"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="upload-zone-content">
            <div className="icon-wrap">
              <UploadCloud size={24} />
            </div>
            <div className="upload-text-group">
              <h3 className="upload-heading">Click to browse or drop your PDF here</h3>
              <p className="upload-hint">Supports PDF files up to 50MB • Text, Scanned OCR & Slides</p>
            </div>
          </div>

          {uploadProgress.active && (
            <div className="upload-progress-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="progress-info">
                <span className="progress-filename">{uploadProgress.name}</span>
                <span className="progress-percent">{uploadProgress.percent}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress.percent}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Main Grid: Uploaded Files & Preview */}
        <div className="dashboard-grid">
          
          {/* Left Column: Documents List */}
          <div className="panel list-panel">
            <div className="panel-header">
              <div className="panel-title">
                <BookOpen size={16} />
                <span>Uploaded Documents ({pdfs.length})</span>
              </div>
              <button
                className="btn-text"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderPlus size={14} /> Add PDF
              </button>
            </div>

            <div className="files-list">
              {pdfs.length === 0 ? (
                <div className="empty-state">
                  <FileText size={28} className="empty-icon" />
                  <p>No documents uploaded yet</p>
                  <span>Drop a PDF above to get started</span>
                </div>
              ) : (
                pdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className={`file-item ${selectedPdf?.id === pdf.id ? 'active' : ''}`}
                    onClick={() => setSelectedPdf(pdf)}
                  >
                    <div className="file-icon">
                      <FileText size={16} />
                    </div>

                    <div className="file-details">
                      <span className="file-name">{pdf.name}</span>
                      <div className="file-meta">
                        <span>{pdf.size}</span>
                        <span>•</span>
                        <span>{pdf.pages} Pages</span>
                        <span>•</span>
                        <span>{pdf.uploadedAt}</span>
                      </div>
                    </div>

                    <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="action-btn delete-btn"
                        title="Delete document"
                        onClick={() => handleDelete(pdf.id, pdf.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Selected Document Inspector */}
          <div className="panel preview-panel">
            {selectedPdf ? (
              <div className="doc-preview">
                <div className="panel-header">
                  <div className="panel-title">
                    <FileCheck size={16} />
                    <span>Document Overview</span>
                  </div>
                  <span className="status-badge">
                    <CheckCircle2 size={12} /> Indexed
                  </span>
                </div>

                <div className="preview-body">
                  <h3 className="doc-title">{selectedPdf.name}</h3>

                  <div className="meta-grid">
                    <div className="meta-card">
                      <span className="meta-label">Total Pages</span>
                      <span className="meta-val">{selectedPdf.pages}</span>
                    </div>
                    <div className="meta-card">
                      <span className="meta-label">File Size</span>
                      <span className="meta-val">{selectedPdf.size}</span>
                    </div>
                    <div className="meta-card">
                      <span className="meta-label">Est. Read Time</span>
                      <span className="meta-val">{Math.round(selectedPdf.pages * 2.5)} min</span>
                    </div>
                    <div className="meta-card">
                      <span className="meta-label">OCR Status</span>
                      <span className="meta-val text-emerald">Verified</span>
                    </div>
                  </div>

                  <div className="summary-box">
                    <span className="section-label">Summary & Extract</span>
                    <p className="summary-text">{selectedPdf.summary}</p>
                  </div>

                  <div className="topics-box">
                    <span className="section-label">Extracted Key Topics</span>
                    <div className="topic-tags">
                      {selectedPdf.extractedTopics.map((topic, i) => (
                        <span key={i} className="topic-tag">{topic}</span>
                      ))}
                    </div>
                  </div>

                  <div className="action-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => showToast(`Starting study session for ${selectedPdf.name}`, 'success')}
                    >
                      <span>Start Study Session</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-preview">
                <p>Select a document on the left to inspect details</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={14} />}
          {toast.type === 'info' && <AlertCircle size={14} />}
          {toast.type === 'error' && <AlertCircle size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
        }

        .container {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* Header */
        .header {
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
        }

        .header-inner {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .brand-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--emerald-primary);
        }

        .brand-name {
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: -0.03em;
        }

        .brand-badge {
          font-size: 0.72rem;
          font-family: var(--font-mono);
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-xs);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
        }

        .theme-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .theme-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        /* Main Content */
        .main-content {
          padding-top: 3.5rem;
          padding-bottom: 4rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .intro-section {
          text-align: left;
        }

        .main-title {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.035em;
          margin-bottom: 0.5rem;
        }

        .main-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          max-width: 620px;
          line-height: 1.55;
        }

        /* Upload Dropzone */
        .upload-zone {
          position: relative;
          border: 1px dashed var(--border-medium);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 2.25rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .upload-zone:hover,
        .upload-zone.dragging {
          border-color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .file-input-hidden {
          display: none;
        }

        .upload-zone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .upload-text-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .upload-heading {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .upload-hint {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .upload-progress-overlay {
          position: absolute;
          inset: 0;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1.5rem;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          width: 100%;
          max-width: 400px;
          font-size: 0.82rem;
          font-family: var(--font-mono);
        }

        .progress-filename {
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 300px;
        }

        .progress-percent {
          color: var(--text-muted);
        }

        .progress-bar-track {
          width: 100%;
          max-width: 400px;
          height: 5px;
          background: var(--border-subtle);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--text-primary);
          transition: width 0.15s ease;
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .panel {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 1rem;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .btn-text {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .btn-text:hover {
          color: var(--text-primary);
        }

        /* File List */
        .files-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .empty-state {
          padding: 2.5rem 1rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          color: var(--text-muted);
        }

        .empty-state p {
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .empty-state span {
          font-size: 0.75rem;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .file-item:hover {
          border-color: var(--border-medium);
          background: var(--bg-tertiary);
        }

        .file-item.active {
          border-color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .file-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-xs);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .file-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .file-name {
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.7rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .file-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .action-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .action-btn:hover {
          color: var(--rose-primary);
          background: var(--rose-subtle);
        }

        /* Preview Panel */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--emerald-primary);
          background: var(--emerald-subtle);
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-xs);
        }

        .preview-body {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .doc-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
          word-break: break-all;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .meta-card {
          padding: 0.65rem 0.75rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .meta-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .meta-val {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .summary-box,
        .topics-box {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .summary-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.55;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          padding: 0.85rem;
        }

        .topic-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .topic-tag {
          font-size: 0.75rem;
          padding: 0.25rem 0.55rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .action-row {
          margin-top: 0.5rem;
        }

        .empty-preview {
          padding: 4rem 1rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.88rem;
        }

        /* Toast */
        .toast-alert {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: var(--radius-sm);
          background: var(--bg-elevated);
          border: 1px solid var(--border-medium);
          font-size: 0.82rem;
          color: var(--text-primary);
          box-shadow: var(--shadow-md);
          z-index: 1000;
        }

        .toast-success { border-color: var(--emerald-primary); }
        .toast-error { border-color: var(--rose-primary); }

        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
