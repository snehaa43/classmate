const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

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

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = urlObj.pathname;

  // Handle Backend PDF Upload Endpoint via FormData / Multipart
  if (req.method === 'POST' && (reqPath === '/api/upload' || reqPath === '/upload')) {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        error: 'Invalid Content-Type. Request must be multipart/form-data with FormData.'
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

    req.on('end', () => {
      const fullBuffer = Buffer.concat(chunks);

      if (fullBuffer.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Empty request payload received.'
        }));
      }

      // Parse multipart body
      const boundaryDelimiter = `--${boundary}`;
      const parts = splitBuffer(fullBuffer, Buffer.from(boundaryDelimiter));

      let uploadedFile = null;

      for (const part of parts) {
        const headerEndIndex = part.indexOf(Buffer.from('\r\n\r\n'));
        if (headerEndIndex === -1) continue;

        const headerStr = part.subarray(0, headerEndIndex).toString('utf-8');
        let bodyBuffer = part.subarray(headerEndIndex + 4);

        // Strip trailing \r\n
        if (bodyBuffer.subarray(bodyBuffer.length - 2).toString() === '\r\n') {
          bodyBuffer = bodyBuffer.subarray(0, bodyBuffer.length - 2);
        }

        const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
        if (filenameMatch) {
          uploadedFile = {
            name: filenameMatch[1],
            data: bodyBuffer,
            size: bodyBuffer.length,
            header: headerStr
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

      // 1. File Size Validation
      if (uploadedFile.size === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'The uploaded file is empty (0 bytes).'
        }));
      }

      // 2. File Type / Extension Validation
      if (!uploadedFile.name.toLowerCase().endsWith('.pdf')) {
        res.writeHead(415, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Invalid file type. Only PDF documents (.pdf) are permitted.'
        }));
      }

      // 3. Binary Magic Byte Header Verification (%PDF)
      const magicBytes = uploadedFile.data.subarray(0, 4).toString('ascii');
      if (magicBytes !== '%PDF') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Corrupted or invalid PDF header. Magic bytes (%PDF) not found.'
        }));
      }

      const sizeFormatted = uploadedFile.size > 1024 * 1024
        ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(uploadedFile.size / 1024)} KB`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'PDF received, validated, and stored in memory successfully by backend server.',
        file: {
          name: uploadedFile.name,
          sizeBytes: uploadedFile.size,
          sizeFormatted,
          type: 'application/pdf',
          uploadedAt: new Date().toISOString()
        }
      }));
    });

    req.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message || 'Server error' }));
    });

    return;
  }

  // Static File Serving
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
