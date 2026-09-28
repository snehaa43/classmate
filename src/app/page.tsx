'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  FileText,
  Copy,
  Search,
  Code2,
  Layers,
  Clock,
  Trash2,
  Server,
  Loader2,
  FileCheck
} from 'lucide-react';

/**
 * ============================================================================
 * TYPE DEFINITIONS FOR PARSED PAGE AND SERVER DOCUMENT
 * ============================================================================
 */
interface ParsedPage {
  pageNumber: number;
  text: string;
  wordCount: number;
  charCount: number;
}

interface StoredPdfDocument {
  id: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  totalPages: number;
  totalWords: number;
  totalChars: number;
  pages: ParsedPage[];
  uploadedAt: string;
  expiresAt: string;
}

// Action: Define client-side maximum allowable file size (50MB)
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function HomePage() {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  // Upload progress state (percentage and status text)
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; statusText: string }>({
    percent: 0,
    statusText: ''
  });

  // Stored extracted document received from backend
  const [extractedDoc, setExtractedDoc] = useState<StoredPdfDocument | null>(null);

  // Selected page view index (0 = Page 1, -1 = All Pages Combined)
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

  // Search filter query inside extracted text
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toggle between formatted page view and raw JSON debug view
  const [showJsonDebug, setShowJsonDebug] = useState<boolean>(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // ACTION: Load and Sync Theme Preference from LocalStorage
  // --------------------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem('classmate_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  // --------------------------------------------------------------------------
  // ACTION: Toggle Dark / Light Theme
  // --------------------------------------------------------------------------
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('classmate_theme', next);
  };

  // --------------------------------------------------------------------------
  // ACTION: Display Toast Notification Alert
  // --------------------------------------------------------------------------
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --------------------------------------------------------------------------
  // ACTION: Main Upload & Page-by-Page Extraction Pipeline
  // Validates file -> constructs FormData -> sends to /api/upload -> parses pages
  // --------------------------------------------------------------------------
  const uploadAndParsePdf = async (file: File) => {
    // Step 1: Validate file extension & MIME type
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf' || file.type === '';

    if (!isPdfExt && !isPdfMime) {
      showToast('Validation Error: Only PDF files (.pdf) are allowed.', 'error');
      return;
    }

    // Step 2: Validate file size (Empty file check)
    if (file.size === 0) {
      showToast('Validation Error: The selected file is empty (0 bytes).', 'error');
      return;
    }

    // Step 3: Validate file size (50MB upper limit check)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      showToast(`Validation Error: File size (${sizeMb} MB) exceeds maximum allowed ${MAX_FILE_SIZE_MB} MB limit.`, 'error');
      return;
    }

    // Step 4: Construct FormData payload with the validated file
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress({ percent: 10, statusText: 'Sending PDF to backend parser...' });

    try {
      // Step 5: Send request via fetch with FormData
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress({ percent: 85, statusText: 'Processing extracted text...' });

      const responseText = await res.text();
      let response: any = null;

      try {
        response = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('JSON Parse Error:', parseErr, 'Raw response:', responseText);
        setIsUploading(false);
        showToast(`Server returned invalid response (Status ${res.status}): ${responseText.substring(0, 80)}`, 'error');
        return;
      }

      setIsUploading(false);

      // Step 6: Process successful extraction response
      if (res.ok && response && response.success && response.document) {
        setUploadProgress({ percent: 100, statusText: 'Extracted successfully!' });
        setExtractedDoc(response.document);
        setSelectedPageIndex(0);
        showToast(
          response.message || `Extracted ${response.document.totalPages || 1} page(s) successfully!`,
          'success'
        );
      } else {
        // Step 7: Handle server-side validation or parsing errors
        const errorMsg = response?.error || `Server responded with status ${res.status}`;
        showToast(`Backend Parsing Failed: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      setIsUploading(false);
      showToast(`Upload Error: ${err.message || 'Network error while contacting server.'}`, 'error');
    }
  };

  // --------------------------------------------------------------------------
  // ACTION: Handle Drag & Drop / File Input Selection
  // --------------------------------------------------------------------------
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadAndParsePdf(files[0]);
  };

  // --------------------------------------------------------------------------
  // ACTION: Copy Extracted Text to System Clipboard
  // --------------------------------------------------------------------------
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  // --------------------------------------------------------------------------
  // ACTION: Clear Currently Extracted Document & Reset Viewer
  // --------------------------------------------------------------------------
  const handleResetDocument = () => {
    setExtractedDoc(null);
    setSelectedPageIndex(0);
    setSearchQuery('');
    setShowJsonDebug(false);
    showToast('Document cleared.', 'info');
  };

  // Helper: Get text to display based on selected page (-1 = all combined)
  const getActiveTextContent = (): string => {
    if (!extractedDoc) return '';
    if (selectedPageIndex === -1) {
      return extractedDoc.pages
        .map((p) => `--- PAGE ${p.pageNumber} (${p.wordCount} words) ---\n\n${p.text}`)
        .join('\n\n\n');
    }
    const page = extractedDoc.pages[selectedPageIndex];
    return page ? page.text : '';
  };

  const activeText = getActiveTextContent();

  // Helper: Filter active text with search highlight
  const filteredText = searchQuery.trim()
    ? activeText
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
        .join('\n')
    : activeText;

  return (
    <div className="page-wrapper">
      {/* ====================================================================
          HEADER
          ==================================================================== */}
      <header className="header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-dot"></span>
            <span className="brand-name">classmate</span>
          </div>

          <div className="header-actions">
            <div className="server-badge">
              <Server size={12} />
              <span>In-Memory Page Parser Active</span>
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

      {/* ====================================================================
          MAIN CONTENT
          ==================================================================== */}
      <main className="main-content">
        <div className="container content-container">
          
          {/* Intro Heading */}
          <div className="intro-section">
            <h1 className="main-title">PDF Page-by-Page Parser</h1>
            <p className="main-desc">
              Upload any PDF file. The backend extracts text page-by-page, stores the results in a temporary in-memory store, and renders the extracted content below for live inspection and testing.
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
              handleFileSelect(e.dataTransfer.files);
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
              onChange={(e) => handleFileSelect(e.target.files)}
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
                  {isUploading ? 'Parsing & Extracting Pages...' : 'Click to browse or drop your PDF here'}
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

          {/* ==================================================================
              EXTRACTED TEXT TESTING & INSPECTION VIEWER
              ================================================================== */}
          {extractedDoc && (
            <div className="extracted-results-wrapper">
              
              {/* Document Summary & In-Memory Store Banner */}
              <div className="doc-summary-bar">
                <div className="summary-left">
                  <FileCheck size={18} className="text-emerald" />
                  <div className="doc-title-group">
                    <span className="doc-filename">{extractedDoc.filename}</span>
                    <span className="doc-stats">
                      {extractedDoc.sizeFormatted} • {extractedDoc.totalPages} Page(s) • {extractedDoc.totalWords.toLocaleString()} Words • {extractedDoc.totalChars.toLocaleString()} Characters
                    </span>
                  </div>
                </div>

                <div className="summary-actions">
                  <button
                    className={`btn-toggle ${showJsonDebug ? 'active' : ''}`}
                    onClick={() => setShowJsonDebug(!showJsonDebug)}
                    title="Toggle Raw JSON Store Data"
                  >
                    <Code2 size={13} />
                    <span>{showJsonDebug ? 'Formatted Text' : 'Raw JSON Store'}</span>
                  </button>
                  <button
                    className="btn-icon-danger"
                    onClick={handleResetDocument}
                    title="Clear Document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Temporary Memory Store Metadata Pill */}
              <div className="memory-store-pill">
                <span className="pill-dot"></span>
                <span>In-Memory Doc ID: <code>{extractedDoc.id}</code></span>
                <span>•</span>
                <span>Uploaded: {new Date(extractedDoc.uploadedAt).toLocaleTimeString()}</span>
                <span>•</span>
                <span>Expires: {new Date(extractedDoc.expiresAt).toLocaleTimeString()} (TTL: 1h)</span>
              </div>

              {/* Conditional View: Raw JSON Store Debug vs. Page Viewer */}
              {showJsonDebug ? (
                /* Raw JSON Debug View */
                <div className="json-debug-container">
                  <div className="viewer-header">
                    <span className="viewer-title">
                      <Code2 size={14} /> Temporary In-Memory Store JSON Payload
                    </span>
                    <button
                      className="btn-copy"
                      onClick={() => handleCopyText(JSON.stringify(extractedDoc, null, 2), 'JSON Payload')}
                    >
                      <Copy size={13} /> Copy JSON
                    </button>
                  </div>
                  <pre className="json-code-block">
                    <code>{JSON.stringify(extractedDoc, null, 2)}</code>
                  </pre>
                </div>
              ) : (
                /* Page-by-Page Interactive Extracted Text View */
                <div className="page-viewer-container">
                  
                  {/* Page Navigation Tabs */}
                  <div className="page-tabs-bar">
                    <div className="page-tabs-scroll">
                      {extractedDoc.pages.map((p, idx) => (
                        <button
                          key={p.pageNumber}
                          className={`page-tab ${selectedPageIndex === idx ? 'active' : ''}`}
                          onClick={() => setSelectedPageIndex(idx)}
                        >
                          Page {p.pageNumber}
                          <span className="tab-word-count">{p.wordCount}w</span>
                        </button>
                      ))}
                      {extractedDoc.totalPages > 1 && (
                        <button
                          className={`page-tab ${selectedPageIndex === -1 ? 'active' : ''}`}
                          onClick={() => setSelectedPageIndex(-1)}
                        >
                          All Pages Combined
                        </button>
                      )}
                    </div>

                    {/* Search & Filter within Page Text */}
                    <div className="search-filter-wrap">
                      <Search size={13} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search text on page..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                      {searchQuery && (
                        <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                          &times;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Page Header Bar */}
                  <div className="viewer-header">
                    <div className="page-meta-indicator">
                      <Layers size={14} />
                      {selectedPageIndex === -1 ? (
                        <span>Complete Extracted Document ({extractedDoc.totalPages} Pages Combined) • Cleaned Text</span>
                      ) : (
                        <span>
                          Viewing Page {selectedPageIndex + 1} of {extractedDoc.totalPages} —{' '}
                          <strong>{extractedDoc.pages[selectedPageIndex]?.wordCount || 0} words</strong> ({extractedDoc.pages[selectedPageIndex]?.charCount || 0} characters) • Cleaned
                        </span>
                      )}
                    </div>

                    <div className="viewer-controls">
                      <button
                        className="btn-copy"
                        onClick={() =>
                          handleCopyText(
                            activeText,
                            selectedPageIndex === -1 ? 'All Pages Text' : `Page ${selectedPageIndex + 1} Text`
                          )
                        }
                      >
                        <Copy size={13} />
                        <span>Copy Page Text</span>
                      </button>
                    </div>
                  </div>

                  {/* Extracted Text Content Box */}
                  <div className="text-display-box">
                    {filteredText.trim().length === 0 ? (
                      <div className="no-matches-box">
                        <p>No text matching &ldquo;{searchQuery}&rdquo; on this page.</p>
                      </div>
                    ) : (
                      <pre className="extracted-text-pre">
                        <code>{filteredText}</code>
                      </pre>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* ====================================================================
          TOAST NOTIFICATION
          ==================================================================== */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={15} className="text-emerald" />}
          {toast.type === 'info' && <AlertCircle size={15} />}
          {toast.type === 'error' && <AlertCircle size={15} className="text-danger" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ====================================================================
          SCOPED STYLES
          ==================================================================== */}
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
          max-width: 780px;
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
          max-width: 780px;
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
          padding: 3rem 0 4rem 0;
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
          font-size: 2.3rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          margin-bottom: 0.6rem;
          color: var(--text-primary);
        }

        .main-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 620px;
          margin: 0 auto;
        }

        /* Upload Dropzone */
        .upload-zone {
          position: relative;
          border: 1px dashed var(--border-medium);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          padding: 3rem 2rem;
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
          max-width: 400px;
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

        /* ==================================================================
           Extracted Results Viewer & Testing Panel
           ================================================================== */
        .extracted-results-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-top: 0.5rem;
        }

        /* Summary Bar */
        .doc-summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          gap: 1rem;
        }

        .summary-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }

        .doc-title-group {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }

        .doc-filename {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .doc-stats {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .summary-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .btn-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-toggle:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        .btn-toggle.active {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-color: var(--text-primary);
        }

        .btn-icon-danger {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-xs);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-icon-danger:hover {
          color: var(--rose-primary);
          background: var(--rose-subtle);
          border-color: var(--rose-primary);
        }

        /* In-Memory Store Pill */
        .memory-store-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-xs);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
          overflow-x: auto;
          white-space: nowrap;
        }

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--emerald-primary);
        }

        .memory-store-pill code {
          color: var(--text-primary);
          font-weight: 600;
        }

        /* Page Viewer Container */
        .page-viewer-container,
        .json-debug-container {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          overflow: hidden;
        }

        /* Tabs Bar */
        .page-tabs-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-subtle);
          gap: 0.75rem;
        }

        .page-tabs-scroll {
          display: flex;
          gap: 0.35rem;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .page-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.65rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .page-tab:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        .page-tab.active {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-color: var(--text-primary);
          font-weight: 600;
        }

        .tab-word-count {
          font-size: 0.68rem;
          opacity: 0.75;
        }

        /* Search Filter */
        .search-filter-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 180px;
          flex-shrink: 0;
        }

        .search-icon {
          position: absolute;
          left: 0.5rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.25rem 1.4rem 0.25rem 1.6rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.72rem;
          color: var(--text-primary);
        }

        .search-input:focus {
          border-color: var(--border-focus);
        }

        .clear-search-btn {
          position: absolute;
          right: 0.35rem;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          cursor: pointer;
        }

        /* Viewer Header */
        .viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1rem;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.78rem;
          color: var(--text-muted);
          background: var(--bg-primary);
        }

        .page-meta-indicator,
        .viewer-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .page-meta-indicator strong {
          color: var(--text-primary);
        }

        .btn-copy {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.55rem;
          border-radius: var(--radius-xs);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          font-size: 0.72rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-copy:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        /* Text Display Area */
        .text-display-box {
          padding: 1.25rem;
          background: var(--bg-secondary);
          max-height: 440px;
          overflow-y: auto;
        }

        .extracted-text-pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          line-height: 1.65;
          color: var(--text-primary);
        }

        .no-matches-box {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.82rem;
        }

        /* JSON Debug Box */
        .json-code-block {
          padding: 1.25rem;
          margin: 0;
          max-height: 440px;
          overflow: auto;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-highlight);
          background: var(--bg-primary);
          line-height: 1.5;
        }

        /* Toast Alert */
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
          .main-title { font-size: 1.85rem; }
          .upload-zone { padding: 2rem 1rem; }
          .server-badge { display: none; }
          .doc-summary-bar { flex-direction: column; align-items: flex-start; }
          .summary-actions { width: 100%; justify-content: flex-end; }
          .page-tabs-bar { flex-direction: column; align-items: flex-start; }
          .search-filter-wrap { width: 100%; }
        }
      `}</style>
    </div>
  );
}
