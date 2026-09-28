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
          const words = rawText.length > 0 ? rawText.split(/\s+/).filter(Boolean) : [];
          const wordCount = words.length;
          const charCount = rawText.length;

          totalWords += wordCount;
          totalChars += charCount;

          pages.push({
            pageNumber,
            text: rawText || `[Page ${pageNumber}: No readable text content]`,
            wordCount,
            charCount
          });
        }

        if (pages.length === 0 && textResult?.text) {
          const fallbackText = textResult.text.trim();
          const words = fallbackText.length > 0 ? fallbackText.split(/\s+/).filter(Boolean) : [];
          pages.push({
            pageNumber: 1,
            text: fallbackText || '[Page 1: Empty content]',
            wordCount: words.length,
            charCount: fallbackText.length
          });
          totalWords = words.length;
          totalChars = fallbackText.length;
        }

        try {
          await parser.destroy();
        } catch (_) {}

        const sizeFormatted = uploadedFile.size > 1024 * 1024
          ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.round(uploadedFile.size / 1024)} KB`;

        const docId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Step 8: Store extracted text temporarily in memory Map
        const storedDoc = saveTemporaryDoc({
          id: docId,
          filename: uploadedFile.name,
          sizeBytes: uploadedFile.size,
          sizeFormatted,
          totalPages: Math.max(totalPages, pages.length),
          totalWords,
          totalChars,
          pages,
          uploadedAt: new Date().toISOString()
        });

        // Step 9: Return JSON payload with extracted pages
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `PDF parsed successfully! Extracted ${pages.length} page(s).`,
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
