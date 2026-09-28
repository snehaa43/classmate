/**
 * ============================================================================
 * CLASSMATE — PDF UPLOAD & PAGE-BY-PAGE TEXT EXTRACTION CLIENT ENGINE
 * ============================================================================
 * Handles real PDF file uploads, FormData construction, progress tracking,
 * server response parsing, and interactive page-by-page text inspection.
 * (All mock/sample documents and hardcoded contents have been removed.)
 */

// ----------------------------------------------------------------------------
// CONFIGURATION & CONSTANTS
// ----------------------------------------------------------------------------
const CONFIG = {
  UPLOAD_ENDPOINT: '/api/upload',
  MAX_FILE_SIZE_MB: 50,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_EXTENSIONS: ['.pdf'],
  ALLOWED_MIMES: ['application/pdf', '']
};

// ----------------------------------------------------------------------------
// APPLICATION STATE
// ----------------------------------------------------------------------------
const AppState = {
  currentDocument: null,     // Holds the parsed PDF document from backend
  selectedPageIndex: 0,      // Currently selected page index (0-indexed)
  isUploading: false,        // Upload in-progress indicator
  searchQuery: ''            // Active search filter string
};

// ----------------------------------------------------------------------------
// ACTION 1: Initialize Application on DOM Ready
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initUploadDropzone();
  initControls();
});

// ----------------------------------------------------------------------------
// ACTION 2: Theme Toggle (Dark / Light Mode)
// ----------------------------------------------------------------------------
function initThemeToggle() {
  const themeBtn = document.getElementById('theme-btn');
  if (!themeBtn) return;

  const savedTheme = localStorage.getItem('classmate_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(themeBtn, savedTheme);

  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('classmate_theme', next);
    updateThemeIcon(themeBtn, next);
  });
}

function updateThemeIcon(btn, theme) {
  btn.innerHTML = theme === 'dark'
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

// ----------------------------------------------------------------------------
// ACTION 3: Drag & Drop Zone and File Selection Handler
// ----------------------------------------------------------------------------
function initUploadDropzone() {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  if (!uploadZone || !fileInput) return;

  // Click on dropzone triggers hidden file input
  uploadZone.addEventListener('click', () => {
    if (!AppState.isUploading) {
      fileInput.click();
    }
  });

  // Drag over styling
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragging');
  });

  // Drag leave styling
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragging');
  });

  // File drop event
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  // File input change event
  fileInput.addEventListener('change', (e) => {
    if (e.target && e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });
}

// ----------------------------------------------------------------------------
// ACTION 4: PDF Validation & Upload Pipeline
// ----------------------------------------------------------------------------
async function handleFileUpload(file) {
  if (!file) return;

  // Step 1: Validate file extension
  const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
  const isPdfMime = CONFIG.ALLOWED_MIMES.includes(file.type);

  if (!isPdfExt && !isPdfMime) {
    showNotification('Validation Error: Only PDF documents (.pdf) are allowed.', 'error');
    return;
  }

  // Step 2: Validate file size (Empty file check)
  if (file.size === 0) {
    showNotification('Validation Error: The selected file is empty (0 bytes).', 'error');
    return;
  }

  // Step 3: Validate upper bound limit (<= 50MB)
  if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    showNotification(`Validation Error: File size (${sizeMb} MB) exceeds ${CONFIG.MAX_FILE_SIZE_MB} MB limit.`, 'error');
    return;
  }

  // Step 4: Construct FormData payload with validated PDF
  const formData = new FormData();
  formData.append('file', file);

  // Step 5: Update UI to uploading state
  AppState.isUploading = true;
  setUploadProgress(20, 'Sending PDF to backend parser...');

  try {
    // Step 6: Dispatch fetch request
    const res = await fetch(CONFIG.UPLOAD_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    setUploadProgress(85, 'Processing extracted text...');

    const responseText = await res.text();
    let response = null;

    try {
      response = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('JSON Parse Error:', parseErr, 'Raw response:', responseText);
      AppState.isUploading = false;
      resetUploadUI();
      showNotification(`Server returned invalid response (Status ${res.status}): ${responseText.substring(0, 80)}`, 'error');
      return;
    }

    AppState.isUploading = false;
    resetUploadUI();

    // Step 7: Handle successful extraction
    if (res.ok && response && response.success && response.document) {
      AppState.currentDocument = response.document;
      AppState.selectedPageIndex = 0;
      renderExtractedDocument();
      showNotification(
        response.message || `Successfully extracted ${response.document.totalPages || 1} page(s)!`,
        'success'
      );
    } else {
      // Step 8: Handle backend validation or parsing errors
      const errorMsg = response?.error || `Server responded with status ${res.status}`;
      showNotification(`Parsing Failed: ${errorMsg}`, 'error');
    }
  } catch (err) {
    AppState.isUploading = false;
    resetUploadUI();
    showNotification(`Network Error: ${err.message || 'Failed to contact backend server.'}`, 'error');
  }
}

// ----------------------------------------------------------------------------
// ACTION 5: Render Extracted Document & Page Tabs
// ----------------------------------------------------------------------------
function renderExtractedDocument() {
  const doc = AppState.currentDocument;
  if (!doc) return;

  const resultsWrapper = document.getElementById('results-wrapper');
  const docFilename = document.getElementById('doc-filename');
  const docStats = document.getElementById('doc-stats');
  const storeId = document.getElementById('store-id');
  const pageTabs = document.getElementById('page-tabs');

  if (!resultsWrapper) return;

  // Update Document Summary Bar
  if (docFilename) docFilename.textContent = doc.filename;
  if (docStats) {
    docStats.textContent = `${doc.sizeFormatted} • ${doc.totalPages} Page(s) • ${doc.totalWords.toLocaleString()} Words`;
  }
  if (storeId) storeId.textContent = doc.id;

  // Render Page Selection Tabs
  if (pageTabs) {
    pageTabs.innerHTML = '';

    doc.pages.forEach((page, index) => {
      const btn = document.createElement('button');
      btn.className = `page-tab ${index === AppState.selectedPageIndex ? 'active' : ''}`;
      btn.innerHTML = `Page ${page.pageNumber} <span style="font-size: 0.68rem; opacity: 0.75;">(${page.wordCount}w)</span>`;
      btn.addEventListener('click', () => {
        AppState.selectedPageIndex = index;
        updateActiveTab(index);
        displayPageContent(index);
      });
      pageTabs.appendChild(btn);
    });
  }

  // Display initial page content
  displayPageContent(AppState.selectedPageIndex);
  resultsWrapper.style.display = 'flex';
}

// ----------------------------------------------------------------------------
// ACTION 6: Display Selected Page Text & Metrics
// ----------------------------------------------------------------------------
function displayPageContent(pageIndex) {
  const doc = AppState.currentDocument;
  if (!doc || !doc.pages[pageIndex]) return;

  const page = doc.pages[pageIndex];
  const pageIndicator = document.getElementById('page-indicator');
  const pageText = document.getElementById('page-text');

  if (pageIndicator) {
    pageIndicator.innerHTML = `<i class="fa-solid fa-layer-group"></i> Page ${page.pageNumber} of ${doc.totalPages} — <strong>${page.wordCount} words</strong> (${page.charCount} chars)`;
  }

  if (pageText) {
    pageText.textContent = page.text || '[No readable text on this page]';
  }
}

function updateActiveTab(activeIndex) {
  const tabs = document.querySelectorAll('.page-tab');
  tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i === activeIndex);
  });
}

// ----------------------------------------------------------------------------
// ACTION 7: Viewer Controls (Copy Text & Clear Document)
// ----------------------------------------------------------------------------
function initControls() {
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  const resultsWrapper = document.getElementById('results-wrapper');

  // Copy current page text to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const doc = AppState.currentDocument;
      if (!doc) return;

      const page = doc.pages[AppState.selectedPageIndex];
      if (page && page.text) {
        navigator.clipboard.writeText(page.text);
        showNotification(`Page ${page.pageNumber} text copied to clipboard!`, 'success');
      }
    });
  }

  // Clear document and reset viewer
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      AppState.currentDocument = null;
      AppState.selectedPageIndex = 0;
      if (resultsWrapper) resultsWrapper.style.display = 'none';
      showNotification('Document cleared from view.', 'info');
    });
  }
}

// ----------------------------------------------------------------------------
// ACTION 8: Progress Indicator Helpers
// ----------------------------------------------------------------------------
function setUploadProgress(percent, statusText) {
  const progressOverlay = document.getElementById('progress-overlay');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressName = document.getElementById('progress-name');

  if (progressOverlay) progressOverlay.style.display = 'flex';
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressPercent) progressPercent.textContent = `${percent}%`;
  if (progressName) progressName.textContent = statusText;
}

function resetUploadUI() {
  const progressOverlay = document.getElementById('progress-overlay');
  const uploadHeading = document.getElementById('upload-heading');
  const iconWrap = document.getElementById('icon-wrap');

  if (progressOverlay) progressOverlay.style.display = 'none';
  if (uploadHeading) uploadHeading.textContent = 'Click to browse or drop your PDF here';
  if (iconWrap) iconWrap.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i>';
}

// ----------------------------------------------------------------------------
// ACTION 9: Toast Notifications
// ----------------------------------------------------------------------------
function showNotification(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');

  if (!toast || !toastText) return;

  toastText.textContent = message;
  toast.className = `toast-alert toast-${type}`;

  if (toastIcon) {
    if (type === 'success') {
      toastIcon.className = 'fa-solid fa-circle-check';
      toastIcon.style.color = 'var(--emerald-primary, #10b981)';
    } else if (type === 'error') {
      toastIcon.className = 'fa-solid fa-circle-exclamation';
      toastIcon.style.color = 'var(--rose-primary, #f43f5e)';
    } else {
      toastIcon.className = 'fa-solid fa-circle-info';
      toastIcon.style.color = 'var(--text-secondary, #94a3b8)';
    }
  }

  toast.style.display = 'inline-flex';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}
