import { NextResponse } from 'next/server';
import { tempPdfStore } from '@/lib/pdfParser';
import {
  generateEmbedding,
  generateBatchEmbeddings,
  embedChunks,
  searchPdfChunks,
  DEFAULT_EMBEDDING_MODEL
} from '@/lib/embeddings';
import {
  searchChunksWithPgvector,
  getStoredDocumentById,
  listStoredDocuments
} from '@/lib/documentStorage';

/**
 * ============================================================================
 * POST /api/embeddings
 * ============================================================================
 * Generates vector embeddings using Google GenAI (@google/genai) and performs
 * semantic vector searches across memory and PostgreSQL pgvector store:
 * 1. Single text: { text: "..." }
 * 2. PDF chunks array: { chunks: [{ id, text, pageNumber, ... }] }
 * 3. In-memory / Database PDF document by ID: { documentId: "doc_..." }
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
      // Step A: If documentId is provided, try pgvector search from PostgreSQL first
      if (documentId && !chunks) {
        try {
          const queryVector = await generateEmbedding(query, { model });
          const dbResults = await searchChunksWithPgvector(queryVector, {
            documentId,
            topK: Number(topK) || 4
          });

          if (dbResults && dbResults.length > 0) {
            return NextResponse.json({
              success: true,
              action: 'search',
              source: 'postgresql_pgvector',
              query,
              model,
              resultsCount: dbResults.length,
              results: dbResults.map((r) => ({
                chunk: {
                  id: r.id,
                  documentId: r.documentId,
                  text: r.content,
                  pageNumber: r.pageNumber,
                  chunkIndex: r.chunkIndex,
                  tokenEstimate: r.tokenEstimate,
                  metadata: r.metadata
                },
                score: r.similarity,
                similarityFormatted: r.similarityFormatted,
                rank: r.rank
              }))
            });
          }
        } catch (dbSearchErr) {
          console.warn('[Embeddings Route] pgvector search fallback:', dbSearchErr?.message || dbSearchErr);
        }
      }

      // Step B: In-memory fallback
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
        source: 'in_memory_cosine',
        query,
        model,
        totalSearched: searchTargetChunks.length,
        resultsCount: results.length,
        results
      });
    }

    // ------------------------------------------------------------------------
    // CASE 2: Embed Chunks of a Cached PDF Document (via documentId)
    // ------------------------------------------------------------------------
    if (documentId) {
      const doc = tempPdfStore.get(documentId);
      if (!doc) {
        // Check database
        const dbDoc = await getStoredDocumentById(documentId);
        if (dbDoc && dbDoc.chunks?.length > 0) {
          const mappedChunks = dbDoc.chunks.map((c) => ({
            id: c.id,
            text: c.content,
            pageNumber: c.pageNumber,
            chunkIndex: c.chunkIndex,
            metadata: c.metadata
          }));
          const embedResult = await embedChunks(mappedChunks, { model, batchSize });

          return NextResponse.json({
            success: true,
            source: 'database',
            documentId: dbDoc.id,
            title: dbDoc.title,
            filename: dbDoc.filename,
            totalChunks: embedResult.totalChunks,
            dimension: embedResult.dimension,
            dimensions: embedResult.dimension,
            model: embedResult.model,
            chunks: embedResult.chunks
          });
        }

        return NextResponse.json(
          { error: `Document with ID "${documentId}" was not found.` },
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
 * Inspects document & page metadata, chunk embedding status from PostgreSQL / memory.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (documentId) {
      // 1. Check PostgreSQL Database first for persisted document & page metadata
      const dbDoc = await getStoredDocumentById(documentId);
      if (dbDoc) {
        const totalChunks = dbDoc.chunks?.length || 0;
        return NextResponse.json({
          success: true,
          source: 'postgresql_database',
          documentId: dbDoc.id,
          title: dbDoc.title,
          filename: dbDoc.filename,
          totalPages: dbDoc.totalPages,
          totalWords: dbDoc.totalWords,
          totalChars: dbDoc.totalChars,
          fileSize: dbDoc.fileSize,
          sizeFormatted: dbDoc.sizeFormatted,
          mimeType: dbDoc.mimeType,
          pageMetadata: dbDoc.pageMetadata,
          metadata: dbDoc.metadata,
          totalChunks,
          isFullyEmbedded: true,
          dimensions: 768,
          defaultModel: DEFAULT_EMBEDDING_MODEL,
          createdAt: dbDoc.createdAt
        });
      }

      // 2. In-memory fallback
      const doc = tempPdfStore.get(documentId);
      if (!doc) {
        return NextResponse.json(
          { error: `Document "${documentId}" was not found.` },
          { status: 404 }
        );
      }

      const totalChunks = doc.chunks?.length || 0;
      const embeddedChunks = (doc.chunks || []).filter(
        (c) => c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0
      ).length;

      return NextResponse.json({
        success: true,
        source: 'in_memory',
        documentId: doc.id,
        filename: doc.filename,
        totalPages: doc.totalPages,
        totalWords: doc.totalWords,
        totalChars: doc.totalChars,
        totalChunks,
        embeddedChunks,
        isFullyEmbedded: totalChunks > 0 && embeddedChunks === totalChunks,
        dimensions: doc.chunks?.[0]?.dimension || (doc.chunks?.[0]?.embedding?.length ?? 768),
        embeddingModel: doc.chunks?.[0]?.embeddingModel || DEFAULT_EMBEDDING_MODEL
      });
    }

    // List all stored documents from PostgreSQL
    const dbDocs = await listStoredDocuments();

    return NextResponse.json({
      success: true,
      activeDocuments: tempPdfStore.listAllIds(),
      storedDatabaseDocuments: dbDocs,
      defaultModel: DEFAULT_EMBEDDING_MODEL
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to inspect embeddings' },
      { status: 500 }
    );
  }
}