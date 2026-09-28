'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  FileCheck
} from 'lucide-react';

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; name: string; percent: number }>({
    active: false,
    name: '',
    percent: 0
  });
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
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
      showToast('Please upload a valid PDF document (.pdf)', 'error');
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
          setUploadedFile({ name: file.name, size: fileSizeStr });
          setUploadProgress({ active: false, name: '', percent: 0 });
          showToast(`Uploaded ${file.name} successfully`, 'success');
        }, 400);
      } else {
        setUploadProgress({ active: true, name: file.name, percent: current });
      }
    }, 180);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-dot"></span>
            <span className="brand-name">classmate</span>
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
      <main className="main-content">
        <div className="container content-container">
          
          {/* Intro Heading */}
          <div className="intro-section">
            <h1 className="main-title">Upload Study PDF</h1>
            <p className="main-desc">
              Drop your course notes, textbook chapters, or lecture slides to extract summaries and study materials.
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
                <p className="upload-hint">Supports PDF files up to 50MB</p>
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

          {/* Uploaded File Status Pill */}
          {uploadedFile && (
            <div className="uploaded-status-card">
              <div className="uploaded-info">
                <FileCheck size={16} className="text-emerald" />
                <span className="uploaded-name">{uploadedFile.name}</span>
                <span className="uploaded-size">({uploadedFile.size})</span>
              </div>
              <span className="status-tag">Ready</span>
            </div>
          )}

        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={14} className="text-emerald" />}
          {toast.type === 'info' && <AlertCircle size={14} />}
          {toast.type === 'error' && <AlertCircle size={14} className="text-danger" />}
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
          max-width: 680px;
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
          max-width: 680px;
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
          cursor: pointer;
        }

        .theme-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        /* Main Content */
        .main-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 0;
        }

        .content-container {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .intro-section {
          text-align: center;
        }

        .main-title {
          font-size: 2.4rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          margin-bottom: 0.6rem;
          color: var(--text-primary);
        }

        .main-desc {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 540px;
          margin: 0 auto;
        }

        /* Upload Dropzone */
        .upload-zone {
          position: relative;
          border: 1px dashed var(--border-medium);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 3.5rem 2rem;
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
          gap: 0.85rem;
        }

        .icon-wrap {
          width: 48px;
          height: 48px;
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
          gap: 0.3rem;
        }

        .upload-heading {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .upload-hint {
          font-size: 0.82rem;
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
          max-width: 360px;
          font-size: 0.82rem;
          font-family: var(--font-mono);
        }

        .progress-filename {
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 260px;
        }

        .progress-percent {
          color: var(--text-muted);
        }

        .progress-bar-track {
          width: 100%;
          max-width: 360px;
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

        /* Uploaded Status Card */
        .uploaded-status-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
        }

        .uploaded-info {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }

        .uploaded-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .uploaded-size {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .status-tag {
          font-size: 0.72rem;
          font-family: var(--font-mono);
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-xs);
          background: var(--emerald-subtle);
          color: var(--emerald-primary);
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

        @media (max-width: 640px) {
          .main-title {
            font-size: 1.85rem;
          }
          .upload-zone {
            padding: 2.5rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
