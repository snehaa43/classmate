import { NextResponse } from 'next/server';
import { tempPdfStore } from '@/lib/pdfParser';
import {
  generateEmbedding,
  generateBatchEmbeddings,
  embedChunks,
  searchPdfChunks,
  DEFAULT_EMBEDDING_MODEL
} from '@/lib/embeddings';

/**
 * ============================================================================
 * POST /api/embeddings
 * ============================================================================
 * Generates vector embeddings using Google GenAI (@google/genai) for:
 * 1. Single text: { text: "..." }
 * 2. PDF chunks array: { chunks: [{ id, text, pageNumber, ... }] }
 * 3. In-memory PDF document by ID: { documentId: "pdf_..." }
 * 4. Semantic vector search over chunks: { action: "search", query: "...", chunks / documentId }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      text,
      texts,
      chunks,
      documentId,
      query,
      action,
      model = DEFAULT_EMBEDDING_MODEL,
      topK = 4,
      batchSize = 20
    } = body;

    // ------------------------------------------------------------------------
    // CASE 1: Semantic Vector Search Over Document Chunks
    // ------------------------------------------------------------------------
    if (action === 'search' || (query && (documentId || chunks))) {
      const searchTargetChunks = chunks || (documentId ? tempPdfStore.get(documentId)?.chunks : null);

      if (!searchTargetChunks || searchTargetChunks.length === 0) {
        return NextResponse.json(
          {
            error: documentId
              ? `Document with ID "${documentId}" was not found or has no chunks.`
              : 'No PDF chunks provided for vector search.'
          },
          { status: 404 }
        );
      }

      const results = await searchPdfChunks(query, searchTargetChunks, {
        topK: Number(topK) || 4,
        model
      });

      return NextResponse.json({
        success: true,
        action: 'search',
        query,
        model,
        totalSearched: searchTargetChunks.length,
        resultsCount: results.length,
        results
      });
    }

    // ------------------------------------------------------------------------
    // CASE 2: Embed Chunks of an In-Memory Cached PDF Document (via documentId)
    // ------------------------------------------------------------------------
    if (documentId) {
      const doc = tempPdfStore.get(documentId);
      if (!doc) {
        return NextResponse.json(
          { error: `Document with ID "${documentId}" was not found or has expired.` },
          { status: 404 }
        );
      }

      if (!doc.chunks || doc.chunks.length === 0) {
        return NextResponse.json(
          { error: `Document "${doc.filename}" contains no chunks to embed.` },
          { status: 400 }
        );
      }

      const embedResult = await embedChunks(doc.chunks, { model, batchSize });
      doc.chunks = embedResult.chunks;
      tempPdfStore.save(doc);

      return NextResponse.json({
        success: true,
        documentId: doc.id,
        filename: doc.filename,
        totalChunks: embedResult.totalChunks,
        dimension: embedResult.dimension,
        dimensions: embedResult.dimension,
        model: embedResult.model,
        chunks: embedResult.chunks
      });
    }

    // ------------------------------------------------------------------------
    // CASE 3: Embed an Array of PDF Chunks Directly
    // ------------------------------------------------------------------------
    if (chunks && Array.isArray(chunks)) {
      if (chunks.length === 0) {
        return NextResponse.json(
          { error: 'Chunks array cannot be empty.' },
          { status: 400 }
        );
      }

      const embedResult = await embedChunks(chunks, { model, batchSize });

      return NextResponse.json({
        success: true,
        totalChunks: embedResult.totalChunks,
        dimension: embedResult.dimension,
        dimensions: embedResult.dimension,
        model: embedResult.model,
        chunks: embedResult.chunks
      });
    }

    // ------------------------------------------------------------------------
    // CASE 4: Embed a Batch of Text Strings
    // ------------------------------------------------------------------------
    if (texts && Array.isArray(texts)) {
      if (texts.length === 0) {
        return NextResponse.json(
          { error: 'Texts array cannot be empty.' },
          { status: 400 }
        );
      }

      const embeddings = await generateBatchEmbeddings(texts, { model, batchSize });

      return NextResponse.json({
        success: true,
        count: texts.length,
        dimension: embeddings[0]?.length || 0,
        dimensions: embeddings[0]?.length || 0,
        model,
        embeddings
      });
    }

    // ------------------------------------------------------------------------
    // CASE 5: Embed a Single Text Query / Chunk
    // ------------------------------------------------------------------------
    if (text && typeof text === 'string') {
      const embedding = await generateEmbedding(text, { model });

      return NextResponse.json({
        success: true,
        dimensions: embedding.length,
        dimension: embedding.length,
        model,
        embedding
      });
    }

    // If nothing provided
    return NextResponse.json(
      {
        error: 'Please provide "chunks", "documentId", "text", "texts", or "query".'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('API Error in /api/embeddings:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to generate embedding'
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * GET /api/embeddings
 * ============================================================================
 * Inspects embedding status for a stored PDF document or lists all cached documents.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (documentId) {
      const doc = tempPdfStore.get(documentId);
      if (!doc) {
        return NextResponse.json(
          { error: `Document "${documentId}" was not found or has expired.` },
          { status: 404 }
        );
      }

      const totalChunks = doc.chunks?.length || 0;
      const embeddedChunks = (doc.chunks || []).filter(
        (c) => c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0
      ).length;

      return NextResponse.json({
        success: true,
        documentId: doc.id,
        filename: doc.filename,
        totalPages: doc.totalPages,
        totalChunks,
        embeddedChunks,
        isFullyEmbedded: totalChunks > 0 && embeddedChunks === totalChunks,
        dimensions: doc.chunks?.[0]?.dimension || (doc.chunks?.[0]?.embedding?.length ?? null),
        embeddingModel: doc.chunks?.[0]?.embeddingModel || DEFAULT_EMBEDDING_MODEL
      });
    }

    return NextResponse.json({
      success: true,
      activeDocuments: tempPdfStore.listAllIds(),
      defaultModel: DEFAULT_EMBEDDING_MODEL
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to inspect embeddings' },
      { status: 500 }
    );
  }
}