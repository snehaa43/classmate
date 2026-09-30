import { NextResponse } from 'next/server';
import { parsePdfPageByPage, tempPdfStore, chunkPages } from '@/lib/pdfParser';
import { embedChunks } from '@/lib/embeddings';

// Action: Define maximum allowable file size (50MB in bytes)
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // ------------------------------------------------------------------------
    // ACTION 1: Validate Request Content-Type Header
    // Ensure the incoming request is a multipart/form-data payload
    // ------------------------------------------------------------------------
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Content-Type header. Request must be multipart/form-data.'
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 2: Parse FormData and Extract Uploaded File Object
    // ------------------------------------------------------------------------
    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('pdf')) as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided. Please attach a PDF file with field name "file" or "pdf".'
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 3: Validate File Size (Empty file & Upper Bound Limit)
    // ------------------------------------------------------------------------
    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'The uploaded file is empty (0 bytes).'
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          success: false,
          error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 50 MB.`
        },
        { status: 413 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 4: Validate File MIME Type & File Extension
    // ------------------------------------------------------------------------
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf' || file.type === '';

    if (!isPdfExt && !isPdfMime) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file format "${file.type || 'unknown'}". Only PDF files (.pdf) are permitted.`
        },
        { status: 415 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 5: Convert File to Binary Buffer & Verify Magic Bytes (%PDF)
    // ------------------------------------------------------------------------
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const magicHeader = buffer.subarray(0, 4).toString('ascii');

    if (magicHeader !== '%PDF') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid PDF structure. File does not contain standard %PDF header magic bytes.'
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 6: Parse PDF, Clean and Extract Text Page by Page
    // ------------------------------------------------------------------------
    const { pages, totalPages, totalWords, totalChars } = await parsePdfPageByPage(buffer);

    // ------------------------------------------------------------------------
    // ACTION 7: Chunk Extracted Text Page by Page into Semantic Chunks
    // ------------------------------------------------------------------------
    let chunks = chunkPages(pages);

    // ------------------------------------------------------------------------
    // ACTION 7b: Vectorize PDF Chunks with Google GenAI Embeddings
    // ------------------------------------------------------------------------
    let isEmbedded = false;
    let embeddingDimension = 0;
    const shouldEmbed = formData.get('embed') !== 'false';

    if (shouldEmbed && chunks.length > 0) {
      try {
        const embedResult = await embedChunks(chunks);
        chunks = embedResult.chunks as any;
        isEmbedded = true;
        embeddingDimension = embedResult.dimension;
      } catch (embErr: any) {
        console.warn('[Upload Route] Vector embedding skipped/failed:', embErr?.message || embErr);
      }
    }

    // ------------------------------------------------------------------------
    // ACTION 8: Format Document Metadata
    // ------------------------------------------------------------------------
    const docId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    // ------------------------------------------------------------------------
    // ACTION 9: Store Extracted Text & Chunks in In-Memory Cache (TTL: 1 hour)
    // ------------------------------------------------------------------------
    const storedDocument = tempPdfStore.save({
      id: docId,
      filename: file.name,
      sizeBytes: file.size,
      sizeFormatted,
      totalPages,
      totalWords,
      totalChars,
      pages,
      chunks,
      uploadedAt: new Date().toISOString()
    });

    // ------------------------------------------------------------------------
    // ACTION 10: Return JSON Response with Extracted Pages & Chunks
    // ------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      message: `PDF parsed successfully! Extracted ${totalPages} page(s), ${totalWords.toLocaleString()} words, and generated ${chunks.length} chunks${isEmbedded ? ` with ${embeddingDimension}-d vector embeddings` : ''}.`,
      document: storedDocument,
      embedded: isEmbedded,
      dimension: embeddingDimension
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error while parsing PDF.'
      },
      { status: 500 }
    );
  }
}
