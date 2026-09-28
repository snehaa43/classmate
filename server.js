const http = require('http');
const fs = require('fs');
const path = require('path');
const { PDFParse, VerbosityLevel } = require('pdf-parse');

const PORT = 3000;
// ACTION: Define maximum allowable file size (50MB)
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// ACTION: In-Memory Temporary Store for Parsed Documents (TTL: 1 hour)
const tempDocStore = new Map();
const TTL_MS = 60 * 60 * 1000;

function saveTemporaryDoc(doc) {
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const entry = { ...doc, expiresAt };
  tempDocStore.set(doc.id, entry);
  return entry;
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = urlObj.pathname;

  // ==========================================================================
  // ACTION 1: Handle Backend PDF Upload & Extraction Endpoint (/api/upload)
  // ==========================================================================
  if (req.method === 'POST' && (reqPath === '/api/upload' || reqPath === '/upload')) {
    const contentType = req.headers['content-type'] || '';

    // Step 1: Validate multipart/form-data header
    if (!contentType.includes('multipart/form-data')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        error: 'Invalid Content-Type. Request must be multipart/form-data.'
      }));
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;

    if (!boundary) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        error: 'Invalid multipart boundary format.'
      }));
    }

    const chunks = [];
    let totalBytes = 0;

    // Step 2: Stream incoming chunks and validate 50MB size limit
    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_FILE_SIZE_BYTES) {
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'File size exceeds maximum allowed 50 MB limit.'
        }));
      }
      chunks.push(chunk);
    });

    req.on('end', async () => {
      const fullBuffer = Buffer.concat(chunks);

      if (fullBuffer.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Empty request payload received.'
        }));
      }

      // Step 3: Parse multipart payload to extract file buffer
      const boundaryDelimiter = `--${boundary}`;
      const parts = splitBuffer(fullBuffer, Buffer.from(boundaryDelimiter));

      let uploadedFile = null;

      for (const part of parts) {
        const headerEndIndex = part.indexOf(Buffer.from('\r\n\r\n'));
        if (headerEndIndex === -1) continue;

        const headerStr = part.subarray(0, headerEndIndex).toString('utf-8');
        let bodyBuffer = part.subarray(headerEndIndex + 4);

        if (bodyBuffer.subarray(bodyBuffer.length - 2).toString() === '\r\n') {
          bodyBuffer = bodyBuffer.subarray(0, bodyBuffer.length - 2);
        }

        const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
        if (filenameMatch) {
          uploadedFile = {
            name: filenameMatch[1],
            data: bodyBuffer,
            size: bodyBuffer.length
          };
          break;
        }
      }

      if (!uploadedFile) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'No file found in multipart form-data submission.'
        }));
      }

      // Step 4: Validate file size (Empty file check)
      if (uploadedFile.size === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'The uploaded file is empty (0 bytes).'
        }));
      }

      // Step 5: Validate file extension (.pdf)
      if (!uploadedFile.name.toLowerCase().endsWith('.pdf')) {
        res.writeHead(415, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Invalid file type. Only PDF documents (.pdf) are permitted.'
        }));
      }

      // Step 6: Validate %PDF binary magic bytes
      const magicBytes = uploadedFile.data.subarray(0, 4).toString('ascii');
      if (magicBytes !== '%PDF') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Corrupted or invalid PDF header. Magic bytes (%PDF) not found.'
        }));
      }

// ============================================================================
// TEXT CLEANING PIPELINE
// Cleans, sanitizes, and normalizes raw text extracted from PDF streams.
// ============================================================================
function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // ACTION 1: Unicode Normalization (NFKC)
  text = text.normalize('NFKC');

  // ACTION 2: Ligature Normalization
  const ligatureMap = {
    'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl',
    'œ': 'oe', 'Œ': 'OE', 'æ': 'ae', 'Æ': 'AE'
  };
  text = text.replace(/[ﬁﬂﬀﬃﬄœŒæÆ]/g, (char) => ligatureMap[char] || char);

  // ACTION 3: Strip Non-Printable & Binary Control Characters
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200D\uFEFF\uFFFD]/g, '');

  // ACTION 4: Reconstruct Hyphenated Word Breaks
  text = text.replace(/(\b[a-zA-Z]{2,})-\s*\r?\n\s*([a-zA-Z]{2,}\b)/g, (_match, p1, p2) => p1 + p2);

  // ACTION 5: Normalize Horizontal Whitespace
  text = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\S\r\n]+/g, ' ').trim())
    .join('\n');

  // ACTION 6: Normalize Paragraph & Vertical Gaps
  text = text.replace(/\n{3,}/g, '\n\n');

  // ACTION 7: Trim Leading & Trailing Whitespace
  return text.trim();
}

// ============================================================================
// CHUNKING PIPELINE
// Splits cleaned page text into semantic, overlapping chunks
// ============================================================================
function chunkText(text, options = {}) {
  if (!text || typeof text !== 'string') return [];
  const raw = text.trim();
  if (raw.length === 0) return [];

  const chunkSize = options.chunkSize || 500;
  const chunkOverlap = Math.min(options.chunkOverlap || 50, Math.floor(chunkSize / 2));
  const separators = options.separators || ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''];

  if (raw.length <= chunkSize) {
    const words = raw.split(/\s+/).filter(Boolean);
    return [{
      id: `chunk_${Date.now()}_0`,
      chunkIndex: 0,
      text: raw,
      charCount: raw.length,
      wordCount: words.length,
      tokenEstimate: Math.ceil(raw.length / 4)
    }];
  }

  function splitHierarchy(content, sepIndex) {
    if (content.length <= chunkSize || sepIndex >= separators.length) {
      if (content.length <= chunkSize) return [content];
      const pieces = [];
      const step = Math.max(1, chunkSize - chunkOverlap);
      for (let i = 0; i < content.length; i += step) {
        pieces.push(content.substring(i, i + chunkSize));
      }
      return pieces;
    }

    const sep = separators[sepIndex];
    const parts = sep === '' ? Array.from(content) : content.split(sep);
    const docs = [];
    let currentPiece = [];
    let currentLen = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partLen = part.length + (sep.length || 0);

      if (part.length > chunkSize) {
        if (currentPiece.length > 0) {
          docs.push(currentPiece.join(sep));
          currentPiece = [];
          currentLen = 0;
        }
        const subPieces = splitHierarchy(part, sepIndex + 1);
        docs.push(...subPieces);
        continue;
      }

      if (currentLen + partLen > chunkSize && currentPiece.length > 0) {
        docs.push(currentPiece.join(sep));
        let overlapLen = 0;
        const overlapPiece = [];
        for (let j = currentPiece.length - 1; j >= 0; j--) {
          overlapPiece.unshift(currentPiece[j]);
          overlapLen += currentPiece[j].length + (sep.length || 0);
          if (overlapLen >= chunkOverlap) break;
        }
        currentPiece = overlapPiece;
        currentLen = overlapLen;
      }

      currentPiece.push(part);
      currentLen += partLen;
    }

    if (currentPiece.length > 0) {
      docs.push(currentPiece.join(sep));
    }
    return docs;
  }

  const rawSegments = splitHierarchy(raw, 0);
  const chunks = [];
  let chunkCounter = 0;

  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    if (trimmed.length > 0) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      chunks.push({
        id: `chunk_${Date.now()}_${chunkCounter}`,
        chunkIndex: chunkCounter++,
        text: trimmed,
        charCount: trimmed.length,
        wordCount: words.length,
        tokenEstimate: Math.ceil(trimmed.length / 4)
      });
    }
  }

  return chunks;
}

function chunkPages(pages, options) {
  const allChunks = [];
  let globalIndex = 0;
  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;
    const pageChunks = chunkText(page.text, options);
    for (const chunk of pageChunks) {
      allChunks.push({
        ...chunk,
        id: `chunk_p${page.pageNumber}_${chunk.chunkIndex}`,
        pageNumber: page.pageNumber,
        chunkIndex: globalIndex++
      });
    }
  }
  return allChunks;
}

      // Step 7: Parse PDF and extract page-by-page text
      try {
        const parser = new PDFParse({
          verbosity: VerbosityLevel.ERRORS,
          data: uploadedFile.data
        });

        await parser.load();
        const textResult = await parser.getText();
        const rawPages = textResult?.pages || [];
        const totalPages = textResult?.total || rawPages.length || 1;

        const pages = [];
        let totalWords = 0;
        let totalChars = 0;

        for (let i = 0; i < rawPages.length; i++) {
          const p = rawPages[i];
          const pageNumber = p.num || (i + 1);
          const rawText = (p.text || '').trim();
          const cleanedText = cleanExtractedText(rawText);

          const words = cleanedText.length > 0 ? cleanedText.split(/\s+/).filter(Boolean) : [];
          const wordCount = words.length;
          const charCount = cleanedText.length;

          totalWords += wordCount;
          totalChars += charCount;

          pages.push({
            pageNumber,
            text: cleanedText || `[Page ${pageNumber}: No readable text content]`,
            rawText,
            wordCount,
            charCount
          });
        }

        if (pages.length === 0 && textResult?.text) {
          const fallbackCleaned = cleanExtractedText(textResult.text);
          const words = fallbackCleaned.length > 0 ? fallbackCleaned.split(/\s+/).filter(Boolean) : [];
          pages.push({
            pageNumber: 1,
            text: fallbackCleaned || '[Page 1: Empty content]',
            rawText: textResult.text,
            wordCount: words.length,
            charCount: fallbackCleaned.length
          });
          totalWords = words.length;
          totalChars = fallbackCleaned.length;
        }

        try {
          await parser.destroy();
        } catch (_) {}

        // Step 8: Chunk Pages
        const chunks = chunkPages(pages);

        const sizeFormatted = uploadedFile.size > 1024 * 1024
          ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.round(uploadedFile.size / 1024)} KB`;

        const docId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Step 9: Store extracted text temporarily in memory Map
        const storedDoc = saveTemporaryDoc({
          id: docId,
          filename: uploadedFile.name,
          sizeBytes: uploadedFile.size,
          sizeFormatted,
          totalPages: Math.max(totalPages, pages.length),
          totalWords,
          totalChars,
          pages,
          chunks,
          uploadedAt: new Date().toISOString()
        });

        // Step 10: Return JSON payload with extracted pages & chunks
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `PDF parsed successfully! Extracted ${pages.length} page(s) and ${chunks.length} chunk(s).`,
          document: storedDoc
        }));

      } catch (parseErr) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Failed to extract text from PDF document: ' + parseErr.message
        }));
      }
    });

    req.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message || 'Server error' }));
    });

    return;
  }

  // ==========================================================================
  // ACTION 2: Static File Serving
  // ==========================================================================
  let targetPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(__dirname, targetPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let index;

  while ((index = buf.indexOf(delimiter, start)) !== -1) {
    if (index > start) {
      parts.push(buf.subarray(start, index));
    }
    start = index + delimiter.length;
  }

  if (start < buf.length) {
    parts.push(buf.subarray(start));
  }

  return parts;
}

server.listen(PORT, () => {
  console.log(`Classmate Backend Server running on http://localhost:${PORT}`);
});
