import { NextResponse } from 'next/server';
import { parsePdfPageByPage, tempPdfStore, chunkPages } from '@/lib/pdfParser';
import { embedChunks } from '@/lib/embeddings';
import { getAuthUser } from '@/lib/auth';
import { saveDocumentWithChunksAndEmbeddings } from '@/lib/documentStorage';
import { uploadPDF, deletePDF, isGcsConfigured } from '@/lib/storage';

// Action: Define maximum allowable file size (50MB in bytes)
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  let uploadedGcsKey: string | null = null;

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
    // ACTION 6: Authenticate User Session & Generate Document Identifier
    // ------------------------------------------------------------------------
    const authUser = await getAuthUser().catch(() => null);
    const userId = authUser?.userId || null;
    const docId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // ------------------------------------------------------------------------
    // ACTION 7: Upload PDF Binary to Google Cloud Storage (GCS)
    // Key pattern: users/{userId}/{docId}/{uuid}-{sanitizedName}.pdf
    // ------------------------------------------------------------------------
    if (isGcsConfigured()) {
      try {
        const gcsResult = await uploadPDF({
          buffer,
          filename: file.name,
          userId,
          documentId: docId,
          metadata: {
            uploadedByEmail: authUser?.email || 'anonymous',
          }
        });
        uploadedGcsKey = gcsResult.storageKey;
      } catch (gcsErr: any) {
        console.error('[Upload Route] Google Cloud Storage Upload Failed:', gcsErr);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to store PDF in Google Cloud Storage: ${gcsErr?.message || 'Storage upload error'}`
          },
          { status: 500 }
        );
      }
    } else {
      console.warn('[Upload Route] GCS_BUCKET_NAME is not set; proceeding with in-memory & PostgreSQL storage.');
    }

    // ------------------------------------------------------------------------
    // ACTION 8: Parse PDF, Clean and Extract Text Page by Page
    // ------------------------------------------------------------------------
    let pages;
    let totalPages = 1;
    let totalWords = 0;
    let totalChars = 0;

    try {
      const parsed = await parsePdfPageByPage(buffer);
      pages = parsed.pages;
      totalPages = parsed.totalPages;
      totalWords = parsed.totalWords;
      totalChars = parsed.totalChars;
    } catch (parseErr: any) {
      // If parsing fails after GCS upload, cleanup the uploaded GCS object
      if (uploadedGcsKey) {
        await deletePDF(uploadedGcsKey).catch(() => {});
      }
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse PDF text content: ${parseErr?.message || parseErr}`
        },
        { status: 422 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 9: Chunk Extracted Text Page by Page into Semantic Chunks
    // ------------------------------------------------------------------------
    let chunks = chunkPages(pages);

    // ------------------------------------------------------------------------
    // ACTION 10: Vectorize PDF Chunks with Google GenAI Embeddings (768-d)
    // ------------------------------------------------------------------------
    let isEmbedded = false;
    let embeddingDimension = 0;
    const shouldEmbed = formData.get('embed') !== 'false';

    if (shouldEmbed && chunks.length > 0) {
      try {
        const embedResult = await embedChunks(chunks);
        chunks = embedResult.chunks as any;
        isEmbedded = true;
        embeddingDimension = embedResult.dimension || 768;
      } catch (embErr: any) {
        console.warn('[Upload Route] Vector embedding skipped/failed:', embErr?.message || embErr);
      }
    }

    // ------------------------------------------------------------------------
    // ACTION 11: Format Document Metadata & Cache in In-Memory Store
    // ------------------------------------------------------------------------
    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;

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
    // ACTION 12: Store Document Metadata + GCS storageKey + Chunks + pgvector Embeddings in PostgreSQL
    // ------------------------------------------------------------------------
    let dbPersisted = false;
    let dbError: string | null = null;
    let dbResult: any = null;

    try {
      const customTitle = (formData.get('title') as string) || file.name;

      dbResult = await saveDocumentWithChunksAndEmbeddings({
        id: docId,
        title: customTitle,
        filename: file.name,
        storageKey: uploadedGcsKey,
        fileSize: file.size,
        sizeFormatted,
        totalPages,
        totalWords,
        totalChars,
        mimeType: file.type || 'application/pdf',
        pages,
        userId,
        metadata: {
          embedded: isEmbedded,
          dimension: embeddingDimension,
          originalName: file.name,
          clientMime: file.type,
          storageKey: uploadedGcsKey,
          gcsStored: Boolean(uploadedGcsKey)
        },
        chunks
      });

      dbPersisted = true;
    } catch (err: any) {
      console.warn('[Upload Route] PostgreSQL persistence warning:', err?.message || err);
      dbError = err?.message || 'Database write skipped';
    }

    // ------------------------------------------------------------------------
    // ACTION 13: Return Comprehensive JSON Response
    // ------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      message: `PDF parsed and stored successfully! Extracted ${totalPages} page(s), ${totalWords.toLocaleString()} words, and generated ${chunks.length} chunks${isEmbedded ? ` with ${embeddingDimension}-d vector embeddings` : ''}.`,
      document: {
        ...storedDocument,
        storageKey: uploadedGcsKey,
      },
      storageKey: uploadedGcsKey,
      gcsStored: Boolean(uploadedGcsKey),
      persistedInDatabase: dbPersisted,
      dbDocumentId: dbResult?.document?.id || docId,
      dbError: dbError || undefined,
      embedded: isEmbedded,
      dimension: embeddingDimension,
      pageMetadata: dbResult?.pageMetadata || pages.map((p) => ({
        pageNumber: p.pageNumber,
        wordCount: p.wordCount,
        charCount: p.charCount,
        textSnippet: p.text.substring(0, 140)
      }))
    });

  } catch (error: any) {
    if (uploadedGcsKey) {
      await deletePDF(uploadedGcsKey).catch(() => {});
    }
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error while processing PDF upload.'
      },
      { status: 500 }
    );
  }
}
