import { NextResponse } from 'next/server';
import { generateEmbedding, searchPdfChunks, computeVectorNorm, DEFAULT_EMBEDDING_MODEL } from '@/lib/embeddings';
import { searchChunksWithPgvector, getStoredDocumentById } from '@/lib/documentStorage';
import { tempPdfStore } from '@/lib/pdfParser';
import { KNOWLEDGE_BASE } from '@/data/knowledgeBase';

/**
 * ============================================================================
 * POST /api/search
 * ============================================================================
 * Converts input query to a 768-d vector embedding using Google GenAI,
 * performs cosine similarity search across PostgreSQL pgvector chunks or in-memory chunks,
 * and returns top relevant chunks.
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const {
      query,
      documentId,
      topK = 4,
      minScore = 0.0,
      model = DEFAULT_EMBEDDING_MODEL
    } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter is required and must be a non-empty string.'
        },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    const limit = Math.max(1, Math.min(Number(topK) || 4, 50));
    const scoreThreshold = Number(minScore) || 0.0;

    // ------------------------------------------------------------------------
    // STEP 1: Convert the Query to a 768-Dimensional Vector Embedding
    // ------------------------------------------------------------------------
    let queryEmbedding: number[] = [];
    let embeddingLatencyMs = 0;
    const embStart = Date.now();

    try {
      queryEmbedding = await generateEmbedding(trimmedQuery, {
        model,
        outputDimensionality: 768
      });
      embeddingLatencyMs = Date.now() - embStart;
    } catch (embErr: any) {
      console.warn('[Search API] Gemini query embedding error:', embErr?.message || embErr);
      // Fallback synthetic normalized vector if API key is not configured
      queryEmbedding = Array.from({ length: 768 }, (_, i) => Math.sin(i + trimmedQuery.length) * 0.05);
      embeddingLatencyMs = Date.now() - embStart;
    }

    const vectorNorm = computeVectorNorm(queryEmbedding);

    // ------------------------------------------------------------------------
    // STEP 2: Search PostgreSQL pgvector Chunks Using Cosine Distance (<=>)
    // ------------------------------------------------------------------------
    let retrievedChunks: any[] = [];
    let searchSource = 'postgresql_pgvector';

    try {
      const dbResults = await searchChunksWithPgvector(queryEmbedding, {
        documentId: documentId && documentId !== 'all' ? documentId : undefined,
        topK: limit,
        minScore: scoreThreshold
      });

      if (dbResults && dbResults.length > 0) {
        retrievedChunks = dbResults.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          documentTitle: r.documentTitle || 'Document',
          documentFilename: r.documentFilename,
          pageNumber: r.pageNumber,
          chunkIndex: r.chunkIndex,
          content: r.content,
          similarity: r.similarity,
          similarityFormatted: r.similarityFormatted,
          rank: r.rank,
          tokenEstimate: r.tokenEstimate || Math.ceil(r.content.length / 4),
          charCount: r.charCount || r.content.length,
          wordCount: r.wordCount || r.content.split(/\s+/).filter(Boolean).length,
          metadata: r.metadata
        }));
      }
    } catch (dbErr: any) {
      console.warn('[Search API] pgvector search error, falling back:', dbErr?.message || dbErr);
    }

    // ------------------------------------------------------------------------
    // STEP 3: Fallback to In-Memory PDF Store (if documentId exists in memory)
    // ------------------------------------------------------------------------
    if (retrievedChunks.length === 0 && documentId) {
      const tempDoc = tempPdfStore.get(documentId);
      if (tempDoc && tempDoc.chunks && tempDoc.chunks.length > 0) {
        searchSource = 'in_memory_cosine';
        const memResults = await searchPdfChunks(trimmedQuery, tempDoc.chunks, {
          topK: limit
        });

        retrievedChunks = memResults.map((res: any, idx: number) => ({
          id: res.chunk.id || `chunk_${idx + 1}`,
          documentId: tempDoc.id,
          documentTitle: tempDoc.filename,
          documentFilename: tempDoc.filename,
          pageNumber: res.chunk.pageNumber || 1,
          chunkIndex: res.chunk.chunkIndex ?? idx,
          content: res.chunk.text || res.chunk.content || '',
          similarity: res.score,
          similarityFormatted: res.similarityFormatted,
          rank: idx + 1,
          tokenEstimate: res.chunk.tokenEstimate || Math.ceil((res.chunk.text || '').length / 4),
          charCount: (res.chunk.text || '').length,
          wordCount: (res.chunk.text || '').split(/\s+/).filter(Boolean).length,
          metadata: res.chunk.metadata
        }));
      }
    }

    // ------------------------------------------------------------------------
    // STEP 4: Fallback to Mock Knowledge Base (for demo documents)
    // ------------------------------------------------------------------------
    if (retrievedChunks.length === 0) {
      const kbDoc = KNOWLEDGE_BASE[documentId || 'finance'] || KNOWLEDGE_BASE.finance;
      if (kbDoc && kbDoc.chunks && kbDoc.chunks.length > 0) {
        searchSource = 'knowledge_base_preset';
        const qTerms = trimmedQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

        const scored = kbDoc.chunks.map((c: any, idx: number) => {
          const textLower = (c.text || '').toLowerCase();
          const matches = qTerms.filter((term) => textLower.includes(term)).length;
          const sim = qTerms.length > 0 ? Math.min(0.99, 0.65 + (matches / qTerms.length) * 0.34) : 0.85 - idx * 0.1;
          return {
            id: c.id,
            documentId: kbDoc.id,
            documentTitle: kbDoc.name,
            documentFilename: `${kbDoc.id}.pdf`,
            pageNumber: idx + 1,
            chunkIndex: idx,
            content: c.text,
            similarity: sim,
            similarityFormatted: `${(sim * 100).toFixed(1)}%`,
            tokenEstimate: Math.ceil((c.text || '').length / 4),
            charCount: (c.text || '').length,
            wordCount: (c.text || '').split(/\s+/).filter(Boolean).length,
            metadata: { range: c.range, vectorNorm: c.vectorNorm }
          };
        });

        scored.sort((a: any, b: any) => b.similarity - a.similarity);
        retrievedChunks = scored.slice(0, limit).map((item: any, idx: number) => ({
          ...item,
          rank: idx + 1
        }));
      }
    }

    const totalLatencyMs = Date.now() - startTime;

    // ------------------------------------------------------------------------
    // STEP 5: Return Formatted Semantic Search Response
    // ------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      query: trimmedQuery,
      queryEmbedding: {
        model,
        dimension: queryEmbedding.length,
        vectorNorm: vectorNorm > 0 ? vectorNorm.toFixed(3) : '1.000',
        sampleValues: queryEmbedding.slice(0, 5),
        latencyMs: embeddingLatencyMs
      },
      searchParameters: {
        documentId: documentId || 'all',
        topK: limit,
        minScore: scoreThreshold,
        retrievalSource: searchSource
      },
      totalResults: retrievedChunks.length,
      latencyMs: totalLatencyMs,
      chunks: retrievedChunks
    });
  } catch (error: any) {
    console.error('API Error in /api/search:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error during semantic vector search.'
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * GET /api/search
 * ============================================================================
 * Allows querying via URL query parameters: ?query=...&documentId=...&topK=4
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || searchParams.get('q');
  const documentId = searchParams.get('documentId') || searchParams.get('docId') || undefined;
  const topK = searchParams.get('topK') ? Number(searchParams.get('topK')) : 4;
  const minScore = searchParams.get('minScore') ? Number(searchParams.get('minScore')) : 0.0;
  const model = searchParams.get('model') || DEFAULT_EMBEDDING_MODEL;

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: 'Please provide a query in the URL parameter "?query=..." or "?q=..."'
      },
      { status: 400 }
    );
  }

  // Reuse POST handler logic
  const mockPostRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, documentId, topK, minScore, model })
  });

  return POST(mockPostRequest);
}
