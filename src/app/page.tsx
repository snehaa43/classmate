'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  Trash2,
  Loader2,
  FileCheck,
  Scissors,
  Check,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';

/**
 * ============================================================================
 * TYPE DEFINITIONS FOR PARSED PAGES, CHUNKS & SERVER DOCUMENTS
 * ============================================================================
 */
interface ParsedPage {
  pageNumber: number;
  text: string;
  rawText?: string;
  wordCount: number;
  charCount: number;
}

interface TextChunk {
  id: string;
  documentId?: string;
  pageNumber?: number;
  chunkIndex: number;
  text: string;
  charCount: number;
  wordCount: number;
  tokenEstimate: number;
  metadata?: Record<string, any>;
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
  chunks?: TextChunk[];
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

  // Active view mode: 'pages' | 'chunks' | 'json'
  const [viewMode, setViewMode] = useState<'pages' | 'chunks' | 'json'>('pages');

  // Selected page view index for Pages View (0 = Page 1, -1 = All Pages Combined)
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

  // Search filter query inside extracted page text
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Search filter query inside generated chunks
  const [chunkSearchQuery, setChunkSearchQuery] = useState<string>('');

  // Page filter for Chunks View (-1 = all pages)
  const [chunkPageFilter, setChunkPageFilter] = useState<number>(-1);

  // Copy success indicator state for chunk IDs
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name?: string | null } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // ACTION: Load Theme & Current Authenticated User Session
  // --------------------------------------------------------------------------
  useEffect(() => {
    const savedTheme = localStorage.getItem('classmate_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Check cached user in localStorage
    const cachedUser = localStorage.getItem('classmate_user');
    if (cachedUser) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch {}
    }

    // Fetch fresh user profile from backend session cookie
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('classmate_user', JSON.stringify(data.user));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('classmate_user');
        }
      })
      .catch(() => {});
  }, []);

  // --------------------------------------------------------------------------
  // ACTION: Handle User Logout
  // --------------------------------------------------------------------------
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    localStorage.removeItem('classmate_user');
    showToast('Logged out successfully.', 'info');
  };

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
  // Validates file -> constructs FormData -> sends to /api/upload -> parses & chunks
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

      setUploadProgress({ percent: 85, statusText: 'Processing extracted text & chunks...' });

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
        setViewMode('pages');
        showToast(
          response.message || `Extracted ${response.document.totalPages || 1} page(s) and generated ${response.document.chunks?.length || 0} chunk(s)!`,
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
  // ACTION: Copy Text to System Clipboard
  // --------------------------------------------------------------------------
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const handleCopyChunk = (chunk: TextChunk) => {
    navigator.clipboard.writeText(chunk.text);
    setCopiedChunkId(chunk.id);
    showToast(`Chunk #${chunk.chunkIndex + 1} text copied!`, 'success');
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  // --------------------------------------------------------------------------
  // ACTION: Clear Currently Extracted Document & Reset Viewer
  // --------------------------------------------------------------------------
  const handleResetDocument = () => {
    setExtractedDoc(null);
    setSelectedPageIndex(0);
    setSearchQuery('');
    setChunkSearchQuery('');
    setViewMode('pages');
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

  // Helper: Filter active text with search highlight in Pages View
  const filteredText = searchQuery.trim()
    ? activeText
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
        .join('\n')
    : activeText;

  // Helper: Filter chunks in Chunks View
  const allChunks = extractedDoc?.chunks || [];
  const filteredChunks = allChunks.filter((chunk) => {
    const matchesPage = chunkPageFilter === -1 || chunk.pageNumber === chunkPageFilter;
    const matchesSearch =
      !chunkSearchQuery.trim() ||
      chunk.text.toLowerCase().includes(chunkSearchQuery.toLowerCase()) ||
      chunk.id.toLowerCase().includes(chunkSearchQuery.toLowerCase());
    return matchesPage && matchesSearch;
  });

  const totalChunkTokens = allChunks.reduce((sum, c) => sum + c.tokenEstimate, 0);

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
              <span className="badge-pulse"></span>
              <span>Parser & Chunker Active</span>
            </div>

            {currentUser ? (
              <div className="user-profile-pill">
                <UserIcon size={13} className="text-emerald" />
                <span className="user-email-text">{currentUser.name || currentUser.email}</span>
                <button
                  className="btn-logout"
                  onClick={handleLogout}
                  title="Log out"
                >
                  <LogOut size={12} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-signin">
                <LogIn size={13} />
                <span>Sign In</span>
              </Link>
            )}

            <button
              type="button"
              className="theme-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              suppressHydrationWarning
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN CONTENT AREA
          ==================================================================== */}
      <main className="main-content">
        <div className="container content-container">
          
          {/* Intro Heading */}
          <div className="intro-section">
            <h1 className="main-title">PDF Parser & Chunk Extractor</h1>
            <p className="main-desc">
              Upload any PDF file. The backend parses text page-by-page, performs sanitization, splits the document into semantic chunks with overlap, and displays the results below for live inspection.
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
                  {isUploading ? 'Parsing, Cleaning & Chunking...' : 'Click to browse or drop your PDF here'}
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
              EXTRACTED TEXT & CHUNKS TESTING VIEWER
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
                      {extractedDoc.sizeFormatted} • {extractedDoc.totalPages} Page(s) • {extractedDoc.totalWords.toLocaleString()} Words • {allChunks.length} Chunks (~{totalChunkTokens.toLocaleString()} tokens)
                    </span>
                  </div>
                </div>

                <div className="summary-actions">
                  {/* View Mode Switcher */}
                  <div className="view-mode-group">
                    <button
                      className={`btn-view-tab ${viewMode === 'pages' ? 'active' : ''}`}
                      onClick={() => setViewMode('pages')}
                      title="View Page by Page Text"
                    >
                      <FileText size={13} />
                      <span>Pages ({extractedDoc.totalPages})</span>
                    </button>
                    <button
                      className={`btn-view-tab ${viewMode === 'chunks' ? 'active' : ''}`}
                      onClick={() => setViewMode('chunks')}
                      title="View Generated Semantic Chunks"
                    >
                      <Scissors size={13} />
                      <span>Chunks ({allChunks.length})</span>
                    </button>
                    <button
                      className={`btn-view-tab ${viewMode === 'json' ? 'active' : ''}`}
                      onClick={() => setViewMode('json')}
                      title="View Raw In-Memory JSON Store"
                    >
                      <Code2 size={13} />
                      <span>JSON Store</span>
                    </button>
                  </div>

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
                <span>•</span>
                <span>Generated Chunks: <strong>{allChunks.length}</strong></span>
              </div>

              {/* ==============================================================
                  VIEW MODE 1: PAGES VIEW
                  ============================================================== */}
              {viewMode === 'pages' && (
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
                        placeholder="Search page text..."
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

              {/* ==============================================================
                  VIEW MODE 2: CHUNKS VIEW
                  ============================================================== */}
              {viewMode === 'chunks' && (
                <div className="chunks-viewer-container">
                  {/* Chunks Toolbar */}
                  <div className="chunks-toolbar">
                    <div className="chunks-filter-tabs">
                      <button
                        className={`chunk-tab ${chunkPageFilter === -1 ? 'active' : ''}`}
                        onClick={() => setChunkPageFilter(-1)}
                      >
                        All Pages ({allChunks.length} chunks)
                      </button>
                      {extractedDoc.pages.map((p) => {
                        const count = allChunks.filter((c) => c.pageNumber === p.pageNumber).length;
                        return (
                          <button
                            key={p.pageNumber}
                            className={`chunk-tab ${chunkPageFilter === p.pageNumber ? 'active' : ''}`}
                            onClick={() => setChunkPageFilter(p.pageNumber)}
                          >
                            Page {p.pageNumber} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="chunks-toolbar-right">
                      {/* Search Chunks */}
                      <div className="search-filter-wrap">
                        <Search size={13} className="search-icon" />
                        <input
                          type="text"
                          placeholder="Search in chunks..."
                          value={chunkSearchQuery}
                          onChange={(e) => setChunkSearchQuery(e.target.value)}
                          className="search-input"
                        />
                        {chunkSearchQuery && (
                          <button className="clear-search-btn" onClick={() => setChunkSearchQuery('')}>
                            &times;
                          </button>
                        )}
                      </div>

                      {/* Copy All Chunks */}
                      <button
                        className="btn-copy"
                        onClick={() =>
                          handleCopyText(
                            JSON.stringify(allChunks, null, 2),
                            'All Chunks JSON'
                          )
                        }
                      >
                        <Copy size={13} />
                        <span>Copy Chunks (JSON)</span>
                      </button>
                    </div>
                  </div>

                  {/* Chunks Statistics Bar */}
                  <div className="chunks-metrics-bar">
                    <div className="chunk-metric">
                      <span className="metric-label">Total Chunks:</span>
                      <span className="metric-val">{allChunks.length}</span>
                    </div>
                    <div className="chunk-metric">
                      <span className="metric-label">Filtered Chunks:</span>
                      <span className="metric-val">{filteredChunks.length}</span>
                    </div>
                    <div className="chunk-metric">
                      <span className="metric-label">Total Estimated Tokens:</span>
                      <span className="metric-val">~{totalChunkTokens.toLocaleString()}</span>
                    </div>
                    <div className="chunk-metric">
                      <span className="metric-label">Config:</span>
                      <span className="metric-val">Size: 500c • Overlap: 50c</span>
                    </div>
                  </div>

                  {/* Chunks Grid / List */}
                  <div className="chunks-list">
                    {filteredChunks.length === 0 ? (
                      <div className="no-matches-box">
                        <p>No chunks match the current filter or search criteria.</p>
                      </div>
                    ) : (
                      filteredChunks.map((chunk, idx) => (
                        <div key={chunk.id} className="chunk-card">
                          <div className="chunk-card-header">
                            <div className="chunk-header-left">
                              <span className="chunk-index-badge">Chunk #{chunk.chunkIndex + 1}</span>
                              {chunk.pageNumber && (
                                <span className="chunk-page-badge">Page {chunk.pageNumber}</span>
                              )}
                              <code className="chunk-id-tag">{chunk.id}</code>
                            </div>

                            <div className="chunk-header-right">
                              <span className="chunk-stat">{chunk.wordCount} words</span>
                              <span className="chunk-stat">{chunk.charCount} chars</span>
                              <span className="chunk-stat">~{chunk.tokenEstimate} tokens</span>
                              <button
                                className="btn-copy-chunk"
                                onClick={() => handleCopyChunk(chunk)}
                                title="Copy this chunk text"
                              >
                                {copiedChunkId === chunk.id ? (
                                  <>
                                    <Check size={12} className="text-emerald" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="chunk-card-body">
                            <pre className="chunk-text-pre">
                              <code>{chunk.text}</code>
                            </pre>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ==============================================================
                  VIEW MODE 3: RAW JSON STORE DEBUG VIEW
                  ============================================================== */}
              {viewMode === 'json' && (
                <div className="json-debug-container">
                  <div className="viewer-header">
                    <span className="viewer-title">
                      <Code2 size={14} /> Temporary In-Memory Store Document (including Pages & Chunks)
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
          font-family: var(--font-sans);
        }

        .container {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* Header */
        .header {
          border-bottom: 1px solid var(--border-subtle);
          background-color: var(--bg-primary);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-inner {
          height: 64px;
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

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .server-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.72rem;
          font-family: var(--font-mono);
          padding: 0.25rem 0.55rem;
          border-radius: var(--radius-xs);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .badge-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--emerald-primary);
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

        .btn-signin {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-xs);
          background: var(--text-primary);
          color: var(--bg-primary);
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .btn-signin:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .user-profile-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-xs);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          font-size: 0.75rem;
          font-family: var(--font-sans);
        }

        .user-email-text {
          color: var(--text-primary);
          font-weight: 500;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-logout {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.72rem;
          cursor: pointer;
          padding: 0.1rem 0.25rem;
          border-radius: 3px;
          transition: color var(--transition-fast);
        }

        .btn-logout:hover {
          color: var(--rose-primary);
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
          max-width: 640px;
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

        .upload-zone:hover {
          border-color: var(--text-secondary);
          background: var(--bg-tertiary);
        }

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
          gap: 1rem;
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
          gap: 0.35rem;
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
          gap: 0.65rem;
          flex-shrink: 0;
        }

        .view-mode-group {
          display: inline-flex;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          padding: 2px;
          gap: 2px;
        }

        .btn-view-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.6rem;
          border-radius: var(--radius-xs);
          background: transparent;
          border: none;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-view-tab:hover {
          color: var(--text-primary);
        }

        .btn-view-tab.active {
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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

        /* Page & Chunks Viewer Containers */
        .page-viewer-container,
        .chunks-viewer-container,
        .json-debug-container {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          overflow: hidden;
        }

        /* Page Tabs Bar */
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

        /* Chunks Toolbar */
        .chunks-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-subtle);
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .chunks-filter-tabs {
          display: flex;
          gap: 0.35rem;
          overflow-x: auto;
        }

        .chunk-tab {
          padding: 0.3rem 0.6rem;
          border-radius: var(--radius-xs);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .chunk-tab:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        .chunk-tab.active {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-color: var(--text-primary);
          font-weight: 600;
        }

        .chunks-toolbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Chunks Metrics Bar */
        .chunks-metrics-bar {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 0.5rem 1rem;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
          flex-wrap: wrap;
        }

        .chunk-metric {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .metric-val {
          color: var(--text-primary);
          font-weight: 600;
        }

        /* Chunks List */
        .chunks-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          max-height: 520px;
          overflow-y: auto;
          background: var(--bg-secondary);
        }

        .chunk-card {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          overflow: hidden;
          transition: border-color var(--transition-fast);
        }

        .chunk-card:hover {
          border-color: var(--border-medium);
        }

        .chunk-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.75rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.72rem;
          font-family: var(--font-mono);
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .chunk-header-left {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .chunk-index-badge {
          font-weight: 600;
          color: var(--text-primary);
          background: var(--bg-secondary);
          padding: 0.1rem 0.4rem;
          border-radius: 3px;
          border: 1px solid var(--border-subtle);
        }

        .chunk-page-badge {
          color: var(--emerald-primary);
          background: var(--emerald-subtle);
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
        }

        .chunk-id-tag {
          color: var(--text-muted);
          font-size: 0.68rem;
        }

        .chunk-header-right {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .chunk-stat {
          color: var(--text-muted);
        }

        .btn-copy-chunk {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.15rem 0.45rem;
          border-radius: 3px;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.68rem;
          font-family: var(--font-mono);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-copy-chunk:hover {
          color: var(--text-primary);
          border-color: var(--border-medium);
        }

        .chunk-card-body {
          padding: 0.85rem;
        }

        .chunk-text-pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          line-height: 1.6;
          color: var(--text-primary);
        }

        /* Search Filter */
        .search-filter-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 170px;
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
          padding: 2.5rem;
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
          .summary-actions { width: 100%; justify-content: space-between; }
          .page-tabs-bar { flex-direction: column; align-items: flex-start; }
          .chunks-toolbar { flex-direction: column; align-items: flex-start; }
          .chunks-toolbar-right { width: 100%; justify-content: space-between; }
          .search-filter-wrap { width: 100%; }
        }
      `}</style>
    </div>
  );
}
