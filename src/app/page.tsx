'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  FileCheck,
  Server,
  Loader2
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface ServerFileResponse {
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  type: string;
  uploadedAt: string;
}

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; statusText: string }>({
    percent: 0,
    statusText: ''
  });
  const [uploadedFile, setUploadedFile] = useState<ServerFileResponse | null>(null);
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
    setTimeout(() => setToast(null), 4000);
  };

  const uploadPdfToServer = async (file: File) => {
    // 1. Client-Side File Type Validation
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf' || file.type === '';
    if (!isPdfExt && !isPdfMime) {
      showToast('Validation Error: Only PDF files (.pdf) are allowed.', 'error');
      return;
    }

    // 2. Client-Side File Size Validation
    if (file.size === 0) {
      showToast('Validation Error: The selected file is empty (0 bytes).', 'error');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      showToast(`Validation Error: File size (${sizeMb} MB) exceeds maximum allowed ${MAX_FILE_SIZE_MB} MB limit.`, 'error');
      return;
    }

    // 3. Prepare FormData payload
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress({ percent: 10, statusText: 'Connecting to backend server...' });

    try {
      // Use XMLHttpRequest to track real upload progress
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 85);
          setUploadProgress({
            percent,
            statusText: `Uploading ${percent}% to backend...`
          });
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        try {
          const response = JSON.parse(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300 && response.success) {
            setUploadProgress({ percent: 100, statusText: 'Validated & Verified!' });
            setUploadedFile(response.file);
            showToast(response.message || `PDF "${file.name}" received by backend!`, 'success');
          } else {
            const errorMsg = response.error || `Server responded with status ${xhr.status}`;
            showToast(`Backend Validation Failed: ${errorMsg}`, 'error');
          }
        } catch {
          showToast(`Server Error: Unexpected response format (Status ${xhr.status})`, 'error');
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        showToast('Network Error: Failed to reach backend server endpoint.', 'error');
      };

      xhr.send(formData);
    } catch (err: any) {
      setIsUploading(false);
      showToast(`Upload Error: ${err.message || 'Something went wrong'}`, 'error');
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadPdfToServer(files[0]);
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
            <div className="server-badge">
              <Server size={12} />
              <span>Backend Ready (/api/upload)</span>
            </div>
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
              Send your PDF via FormData directly to the backend server. Includes server-side MIME type, magic bytes header, and 50MB file size validation.
            </p>
          </div>

          {/* Upload Dropzone */}
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
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
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="file-input-hidden"
              accept="application/pdf,.pdf"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="upload-zone-content">
              <div className="icon-wrap">
                {isUploading ? (
                  <Loader2 size={24} className="spinner" />
                ) : (
                  <UploadCloud size={24} />
                )}
              </div>
              <div className="upload-text-group">
                <h3 className="upload-heading">
                  {isUploading ? 'Sending PDF to backend...' : 'Click to browse or drop your PDF here'}
                </h3>
                <p className="upload-hint">
                  FormData POST to <code>/api/upload</code> • Validated up to 50MB
                </p>
              </div>
            </div>

            {isUploading && (
              <div className="upload-progress-overlay" onClick={(e) => e.stopPropagation()}>
                <div className="progress-info">
                  <span className="progress-filename">{uploadProgress.statusText}</span>
                  <span className="progress-percent">{uploadProgress.percent}%</span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${uploadProgress.percent}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Server File Response Card */}
          {uploadedFile && (
            <div className="uploaded-status-card">
              <div className="uploaded-info">
                <FileCheck size={18} className="text-emerald" />
                <div className="uploaded-meta-group">
                  <span className="uploaded-name">{uploadedFile.name}</span>
                  <span className="uploaded-meta">
                    {uploadedFile.sizeFormatted} • MIME: {uploadedFile.type}
                  </span>
                </div>
              </div>
              <span className="status-tag">Backend Validated</span>
            </div>
          )}

        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={15} className="text-emerald" />}
          {toast.type === 'info' && <AlertCircle size={15} />}
          {toast.type === 'error' && <AlertCircle size={15} className="text-danger" />}
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

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .server-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-family: var(--font-mono);
          padding: 0.2rem 0.5rem;
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
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 560px;
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

        .upload-zone.uploading {
          cursor: default;
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

        :global(.spinner) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

        .upload-hint code {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          background: var(--bg-primary);
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
          border: 1px solid var(--border-subtle);
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
          max-width: 380px;
          font-size: 0.82rem;
          font-family: var(--font-mono);
        }

        .progress-filename {
          color: var(--text-primary);
        }

        .progress-percent {
          color: var(--text-muted);
        }

        .progress-bar-track {
          width: 100%;
          max-width: 380px;
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
          gap: 0.75rem;
          min-width: 0;
        }

        .uploaded-meta-group {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .uploaded-name {
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .uploaded-meta {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .status-tag {
          font-size: 0.72rem;
          font-family: var(--font-mono);
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-xs);
          background: var(--emerald-subtle);
          color: var(--emerald-primary);
          border: 1px solid rgba(16, 185, 129, 0.2);
          white-space: nowrap;
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
          max-width: 440px;
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
          .server-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
