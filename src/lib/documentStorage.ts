import { prisma } from './prisma';
import type { TextChunk } from './chunker';
import type { ParsedPage } from './pdfParser';

/**
 * ============================================================================
 * INTERFACES FOR DOCUMENT & PAGE METADATA PERSISTENCE
 * ============================================================================
 */

export interface PageMetadataItem {
  pageNumber: number;
  wordCount: number;
  charCount: number;
  textSnippet?: string;
  rawTextLength?: number;
}

export interface SaveDocumentParams {
  id?: string;
  title: string;
  filename?: string;
  storageKey?: string | null;
  fileSize?: number;
  sizeFormatted?: string;
  totalPages?: number;
  totalWords?: number;
  totalChars?: number;
  mimeType?: string;
  pages?: ParsedPage[];
  pageMetadata?: PageMetadataItem[];
  metadata?: Record<string, any>;
  userId?: string | null;
  chunks: TextChunk[];
}

export interface VectorSearchResult {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
  tokenEstimate?: number;
  charCount?: number;
  wordCount?: number;
  metadata?: any;
  similarity: number;
  similarityFormatted: string;
  rank: number;
  documentTitle?: string;
  documentFilename?: string;
}

/**
 * Helper to convert float array [0.1, 0.2, ...] to pgvector formatted string "[0.1,0.2,...]"
 */
export function formatVectorForPg(vector: number[]): string {
  if (!vector || !Array.isArray(vector) || vector.length === 0) {
    return '[]';
  }
  return `[${vector.join(',')}]`;
}

/**
 * ============================================================================
 * ACTION 1: Save Document with Page Metadata, Chunks, and Vector(768) Embeddings
 * ============================================================================
 * Persists document metadata, structured page-by-page metadata, semantic chunks,
 * GCS storageKey, and 768-dimensional pgvector embeddings in PostgreSQL via Prisma.
 */
export async function saveDocumentWithChunksAndEmbeddings(params: SaveDocumentParams) {
  const {
    id,
    title,
    filename,
    storageKey = null,
    fileSize,
    sizeFormatted,
    totalPages = 1,
    totalWords = 0,
    totalChars = 0,
    mimeType = 'application/pdf',
    pages = [],
    pageMetadata: customPageMetadata,
    metadata = {},
    userId = null,
    chunks = []
  } = params;

  // Build page metadata array if not explicitly passed
  const formattedPageMetadata: PageMetadataItem[] =
    customPageMetadata ||
    pages.map((p) => ({
      pageNumber: p.pageNumber,
      wordCount: p.wordCount,
      charCount: p.charCount,
      textSnippet: p.text ? p.text.substring(0, 160).replace(/\s+/g, ' ').trim() : '',
      rawTextLength: p.rawText?.length ?? p.charCount
    }));

  const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 1. Check if user exists if userId was provided
  let validUserId: string | null = null;
  if (userId) {
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      if (userExists) validUserId = userExists.id;
    } catch (e) {
      console.warn('[DocumentStorage] User lookup skipped or failed:', e);
    }
  }

  // 2. Create or Upsert Document Record in PostgreSQL
  const savedDocument = await (prisma.document as any).upsert({
    where: { id: docId },
    update: {
      title: title || filename || 'Untitled Document',
      filename: filename || title,
      storageKey: storageKey || undefined,
      fileSize,
      sizeFormatted,
      totalPages,
      totalWords,
      totalChars,
      mimeType,
      pageMetadata: formattedPageMetadata as any,
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
        totalChunks: chunks.length,
        hasVectorEmbeddings: chunks.some((c) => c.embedding && c.embedding.length > 0)
      },
      userId: validUserId
    },
    create: {
      id: docId,
      title: title || filename || 'Untitled Document',
      filename: filename || title,
      storageKey: storageKey || null,
      fileSize,
      sizeFormatted,
      totalPages,
      totalWords,
      totalChars,
      mimeType,
      pageMetadata: formattedPageMetadata as any,
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        totalChunks: chunks.length,
        hasVectorEmbeddings: chunks.some((c) => c.embedding && c.embedding.length > 0)
      },
      userId: validUserId
    }
  });

  // 3. Delete any previous chunks for this document if updating
  try {
    await prisma.chunk.deleteMany({
      where: { documentId: docId }
    });
  } catch {
    // Ignore error if new
  }

  // 4. Insert Chunks into PostgreSQL Database
  const savedChunks: any[] = [];
  const chunksWithEmbeddings: { id: string; embedding: number[] }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const chunkId = c.id || `chunk_${docId}_p${c.pageNumber || 1}_${i}`;
    const chunkIndex = typeof c.chunkIndex === 'number' ? c.chunkIndex : i;
    const content = c.text || (c as any).content || '';

    const newChunk = await prisma.chunk.create({
      data: {
        id: chunkId,
        content,
        pageNumber: c.pageNumber || 1,
        chunkIndex,
        charCount: c.charCount || content.length,
        wordCount: c.wordCount || (content ? content.split(/\s+/).filter(Boolean).length : 0),
        tokenEstimate: c.tokenEstimate || Math.ceil(content.length / 4),
        embeddingModel: c.embeddingModel || 'gemini-embedding-001',
        metadata: {
          ...(c.metadata || {}),
          vectorNorm: c.vectorNorm,
          dimension: c.dimension || c.embedding?.length || 768
        },
        documentId: docId
      }
    });

    savedChunks.push(newChunk);

    if (c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0) {
      chunksWithEmbeddings.push({
        id: chunkId,
        embedding: c.embedding
      });
    }
  }

  // 5. Store 768-d Vector Embeddings into PostgreSQL pgvector column via raw SQL
  let storedVectorsCount = 0;
  for (const item of chunksWithEmbeddings) {
    try {
      const vectorStr = formatVectorForPg(item.embedding);
      await prisma.$executeRawUnsafe(
        `UPDATE chunks SET embedding = $1::vector WHERE id = $2`,
        vectorStr,
        item.id
      );
      storedVectorsCount++;
    } catch (vecErr: any) {
      console.warn(`[DocumentStorage] Failed to store vector for chunk ${item.id}:`, vecErr?.message || vecErr);
    }
  }

  return {
    success: true,
    document: savedDocument,
    totalChunks: savedChunks.length,
    storedVectorsCount,
    pageCount: formattedPageMetadata.length,
    pageMetadata: formattedPageMetadata
  };
}

/**
 * ============================================================================
 * ACTION 2: Search Similar Chunks Using PostgreSQL pgvector Cosine Distance
 * ============================================================================
 * Queries PostgreSQL pgvector using the `<=>` cosine distance operator:
 * cosine_similarity = 1 - (embedding <=> query_vector)
 */
export async function searchChunksWithPgvector(
  queryVector: number[],
  options: {
    documentId?: string;
    topK?: number;
    minScore?: number;
  } = {}
): Promise<VectorSearchResult[]> {
  if (!queryVector || !Array.isArray(queryVector) || queryVector.length === 0) {
    return [];
  }

  const { documentId, topK = 4, minScore = 0.0 } = options;
  const vectorStr = formatVectorForPg(queryVector);

  try {
    let rows: any[] = [];

    if (documentId) {
      rows = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT 
          c.id, 
          c."documentId", 
          c.content, 
          c."pageNumber", 
          c."chunkIndex", 
          c."tokenEstimate",
          c."charCount",
          c."wordCount",
          c.metadata,
          (1 - (c.embedding <=> $1::vector)) AS similarity
        FROM chunks c
        WHERE c."documentId" = $2 AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT $3
        `,
        vectorStr,
        documentId,
        topK
      );
    } else {
      rows = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT 
          c.id, 
          c."documentId", 
          c.content, 
          c."pageNumber", 
          c."chunkIndex", 
          c."tokenEstimate",
          c."charCount",
          c."wordCount",
          c.metadata,
          d.title AS "documentTitle",
          d.filename AS "documentFilename",
          (1 - (c.embedding <=> $1::vector)) AS similarity
        FROM chunks c
        JOIN documents d ON d.id = c."documentId"
        WHERE c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT $2
        `,
        vectorStr,
        topK
      );
    }

    return (rows || [])
      .map((row, idx) => {
        const rawSim = typeof row.similarity === 'number' ? row.similarity : parseFloat(row.similarity || '0');
        const simClamped = Math.max(0, Math.min(1, rawSim));
        return {
          id: row.id,
          documentId: row.documentId,
          content: row.content,
          pageNumber: row.pageNumber,
          chunkIndex: row.chunkIndex,
          tokenEstimate: row.tokenEstimate,
          charCount: row.charCount,
          wordCount: row.wordCount,
          metadata: row.metadata,
          similarity: simClamped,
          similarityFormatted: `${(simClamped * 100).toFixed(1)}%`,
          rank: idx + 1,
          documentTitle: row.documentTitle,
          documentFilename: row.documentFilename
        };
      })
      .filter((r) => r.similarity >= minScore);
  } catch (err: any) {
    console.error('[DocumentStorage] pgvector search error:', err?.message || err);
    return [];
  }
}

/**
 * ============================================================================
 * ACTION 3: Retrieve Stored Document With Full Metadata & Chunks
 * ============================================================================
 */
export async function getStoredDocumentById(documentId: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' }
        },
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    return document;
  } catch (err: any) {
    console.error('[DocumentStorage] Error retrieving document:', err?.message || err);
    return null;
  }
}

/**
 * ============================================================================
 * ACTION 4: List All Stored Documents with Stats & Metadata
 * ============================================================================
 */
export async function listStoredDocuments(userId?: string | null) {
  try {
    const whereClause = userId ? { userId } : {};
    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        filename: true,
        storageKey: true,
        fileSize: true,
        sizeFormatted: true,
        totalPages: true,
        totalWords: true,
        totalChars: true,
        mimeType: true,
        pageMetadata: true,
        metadata: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { chunks: true }
        }
      }
    });

    return documents;
  } catch (err: any) {
    console.error('[DocumentStorage] Error listing documents:', err?.message || err);
    return [];
  }
}

/**
 * ============================================================================
 * ACTION 5: Search Chunks Using PostgreSQL Full-Text Search & Keyword Matching
 * ============================================================================
 * Queries PostgreSQL text chunks using lexical ranking (ts_rank + ILIKE exact boost)
 * Returns matching chunks with highlighted matched keywords and rankings.
 */
export async function searchChunksWithKeywords(
  query: string,
  options: {
    documentId?: string;
    topK?: number;
    minScore?: number;
  } = {}
) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const { documentId, topK = 4, minScore = 0.0 } = options;
  const trimmed = query.trim();
  const ilikePattern = `%${trimmed.replace(/[%_]/g, '')}%`;

  try {
    let rows: any[] = [];

    if (documentId) {
      rows = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT 
          c.id, 
          c."documentId", 
          c.content, 
          c."pageNumber", 
          c."chunkIndex", 
          c."tokenEstimate",
          c."charCount",
          c."wordCount",
          c.metadata,
          d.title AS "documentTitle",
          d.filename AS "documentFilename",
          (
            ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) * 1.5 +
            CASE WHEN c.content ILIKE $2 THEN 0.8 ELSE 0.0 END
          ) AS rank_score
        FROM chunks c
        JOIN documents d ON d.id = c."documentId"
        WHERE c."documentId" = $3
          AND (
            to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
            OR c.content ILIKE $2
          )
        ORDER BY rank_score DESC
        LIMIT $4
        `,
        trimmed,
        ilikePattern,
        documentId,
        topK
      );
    } else {
      rows = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT 
          c.id, 
          c."documentId", 
          c.content, 
          c."pageNumber", 
          c."chunkIndex", 
          c."tokenEstimate",
          c."charCount",
          c."wordCount",
          c.metadata,
          d.title AS "documentTitle",
          d.filename AS "documentFilename",
          (
            ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) * 1.5 +
            CASE WHEN c.content ILIKE $2 THEN 0.8 ELSE 0.0 END
          ) AS rank_score
        FROM chunks c
        JOIN documents d ON d.id = c."documentId"
        WHERE (
          to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
          OR c.content ILIKE $2
        )
        ORDER BY rank_score DESC
        LIMIT $3
        `,
        trimmed,
        ilikePattern,
        topK
      );
    }

    return (rows || []).map((row, idx) => {
      const rawScore = typeof row.rank_score === 'number' ? row.rank_score : parseFloat(row.rank_score || '0.5');
      const normalizedScore = Math.max(0.1, Math.min(0.99, Math.tanh(rawScore)));

      // Extract matched terms
      const text = row.content || '';
      const queryWords = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
      const matched = queryWords.filter((w) => text.toLowerCase().includes(w));

      return {
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        pageNumber: row.pageNumber,
        chunkIndex: row.chunkIndex,
        tokenEstimate: row.tokenEstimate || Math.ceil(text.length / 4),
        charCount: row.charCount || text.length,
        wordCount: row.wordCount || text.split(/\s+/).filter(Boolean).length,
        metadata: row.metadata,
        score: normalizedScore,
        similarity: normalizedScore,
        similarityFormatted: `${(normalizedScore * 100).toFixed(1)}%`,
        rank: idx + 1,
        documentTitle: row.documentTitle,
        documentFilename: row.documentFilename,
        matchedKeywords: matched.length > 0 ? matched : [trimmed],
        matchCount: matched.length || 1,
        searchMode: 'keyword' as const
      };
    }).filter((r) => r.similarity >= minScore);
  } catch (err: any) {
    console.warn('[DocumentStorage] Database keyword search error:', err?.message || err);
    return [];
  }
}

/**
 * ============================================================================
 * ACTION 6: Search Documents by Keyword (Title, Metadata, and Content)
 * ============================================================================
 */
export async function searchDocumentsByKeyword(
  query: string,
  options: { userId?: string | null; topK?: number } = {}
) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const { userId, topK = 10 } = options;
  const trimmed = query.trim();
  const pattern = `%${trimmed.replace(/[%_]/g, '')}%`;

  try {
    const whereClause: any = {
      OR: [
        { title: { contains: trimmed, mode: 'insensitive' } },
        { filename: { contains: trimmed, mode: 'insensitive' } },
        { chunks: { some: { content: { contains: trimmed, mode: 'insensitive' } } } }
      ]
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const docs = await prisma.document.findMany({
      where: whereClause,
      take: topK,
      orderBy: { updatedAt: 'desc' },
      include: {
        chunks: {
          where: {
            content: { contains: trimmed, mode: 'insensitive' }
          },
          take: 3,
          orderBy: { chunkIndex: 'asc' }
        },
        _count: {
          select: { chunks: true }
        }
      }
    });

    return docs.map((doc, idx) => ({
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      totalPages: doc.totalPages || 1,
      totalChunks: doc._count.chunks,
      totalWords: doc.totalWords || 0,
      matchScore: Math.min(0.99, 0.75 + doc.chunks.length * 0.08),
      matchingChunksCount: doc.chunks.length,
      topMatchingChunks: doc.chunks.map((c, cIdx) => ({
        id: c.id,
        documentId: doc.id,
        documentTitle: doc.title,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        content: c.content,
        similarity: 0.85 - cIdx * 0.05,
        similarityFormatted: `${((0.85 - cIdx * 0.05) * 100).toFixed(1)}%`,
        rank: cIdx + 1,
        tokenEstimate: c.tokenEstimate || Math.ceil(c.content.length / 4),
        charCount: c.charCount || c.content.length,
        wordCount: c.wordCount || c.content.split(/\s+/).filter(Boolean).length,
        matchedKeywords: [trimmed],
        matchCount: 1,
        searchMode: 'keyword' as const
      })),
      metadata: doc.metadata
    }));
  } catch (err: any) {
    console.warn('[DocumentStorage] Database document keyword search error:', err?.message || err);
    return [];
  }
}

/**
 * ============================================================================
 * ACTION 7: Delete Document by ID with Strict Ownership Verification
 * ============================================================================
 * Removes Document from PostgreSQL (cascades automatically to Chunks)
 * and returns the storageKey for GCS object deletion.
 */
export async function deleteDocumentById(
  documentId: string,
  userId?: string | null
): Promise<{ success: boolean; storageKey?: string | null; error?: string }> {
  try {
    const document = await (prisma.document as any).findUnique({
      where: { id: documentId },
      select: { id: true, userId: true, storageKey: true }
    });

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    // Verify ownership if document is tied to a user
    if (document.userId && document.userId !== userId) {
      return { success: false, error: 'Forbidden: You do not own this document' };
    }

    // Delete document from PostgreSQL (foreign keys cascade to chunks)
    await (prisma.document as any).delete({
      where: { id: documentId }
    });

    return {
      success: true,
      storageKey: document.storageKey
    };
  } catch (err: any) {
    console.error('[DocumentStorage] Error deleting document:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Database error while deleting document'
    };
  }
}


