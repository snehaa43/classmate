import type { ParsedPage, TemporaryPdfDocument } from './pdfParser';

/**
 * ============================================================================
 * TYPE DEFINITIONS FOR TEXT CHUNKING
 * ============================================================================
 */

export interface TextChunk {
  id: string;               // Unique chunk identifier (e.g. chunk_doc_p1_0)
  documentId?: string;      // ID of parent document (if applicable)
  pageNumber?: number;      // Originating page number (1-indexed)
  chunkIndex: number;       // Sequential position of the chunk (0-indexed)
  text: string;             // Chunk text content
  charCount: number;        // Total character length of chunk
  wordCount: number;        // Total word count of chunk
  tokenEstimate: number;    // Estimated token count (1 token ~= 4 chars)
  embedding?: number[];     // Vector embedding array (e.g., 3072 or 768 float values from @google/genai)
  vectorNorm?: string | number; // Euclidean vector norm / magnitude
  dimension?: number;       // Dimension length of embedding vector
  embeddingModel?: string;  // Model used for embedding (e.g. 'gemini-embedding-001')
  metadata?: Record<string, any>; // Optional additional metadata tags
}

export interface ChunkOptions {
  chunkSize?: number;       // Target chunk size in characters (Default: 500)
  chunkOverlap?: number;    // Number of overlapping characters (Default: 50)
  separators?: string[];    // Hierarchical split separators (Default: ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''])
  minChunkSize?: number;    // Minimum allowable chunk size in chars (Default: 20)
}

/**
 * Default Chunking Configuration Constants
 */
export const DEFAULT_CHUNK_OPTIONS: Required<ChunkOptions> = {
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''],
  minChunkSize: 20
};

/**
 * ============================================================================
 * ACTION 1: Token Estimation Helper
 * Calculates an approximate token count based on character and word heuristics
 * ============================================================================
 */
export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  // Standard heuristic: ~4 characters per token in English text
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * ============================================================================
 * ACTION 2: Core Recursive Text Chunking Function
 * Splits text hierarchically using sentence and paragraph boundaries with overlap
 * ============================================================================
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  // Step 1: Validate and sanitize input
  if (!text || typeof text !== 'string') return [];

  const raw = text.trim();
  if (raw.length === 0) return [];

  // Step 2: Merge options with defaults
  const chunkSize = Math.max(50, options?.chunkSize || DEFAULT_CHUNK_OPTIONS.chunkSize);
  const maxOverlap = Math.floor(chunkSize / 2);
  const chunkOverlap = Math.min(
    Math.max(0, options?.chunkOverlap ?? DEFAULT_CHUNK_OPTIONS.chunkOverlap),
    maxOverlap
  );
  const separators = options?.separators || DEFAULT_CHUNK_OPTIONS.separators;
  const minChunkSize = options?.minChunkSize || DEFAULT_CHUNK_OPTIONS.minChunkSize;

  // Step 3: Fast-path return if text fits in a single chunk
  if (raw.length <= chunkSize) {
    const words = raw.split(/\s+/).filter(Boolean);
    return [
      {
        id: `chunk_${Date.now()}_0`,
        chunkIndex: 0,
        text: raw,
        charCount: raw.length,
        wordCount: words.length,
        tokenEstimate: estimateTokens(raw)
      }
    ];
  }

  // Step 4: Recursive split helper using hierarchical separators
  function splitHierarchy(content: string, separatorIndex: number): string[] {
    // Base case: content fits within limit or no more separators available
    if (content.length <= chunkSize || separatorIndex >= separators.length) {
      if (content.length <= chunkSize) return [content];

      // Fallback: hard slice for continuous uninterrupted character sequences
      const pieces: string[] = [];
      const step = Math.max(1, chunkSize - chunkOverlap);
      for (let i = 0; i < content.length; i += step) {
        pieces.push(content.substring(i, i + chunkSize));
      }
      return pieces;
    }

    const separator = separators[separatorIndex];
    const parts = separator === '' ? Array.from(content) : content.split(separator);

    const accumulatedDocs: string[] = [];
    let currentPiece: string[] = [];
    let currentLength = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partLen = part.length + (separator.length || 0);

      // If an individual part is larger than chunkSize, recursively split it with finer separators
      if (part.length > chunkSize) {
        if (currentPiece.length > 0) {
          accumulatedDocs.push(currentPiece.join(separator));
          currentPiece = [];
          currentLength = 0;
        }
        const subPieces = splitHierarchy(part, separatorIndex + 1);
        accumulatedDocs.push(...subPieces);
        continue;
      }

      // If adding this part exceeds chunkSize, commit the current chunk
      if (currentLength + partLen > chunkSize && currentPiece.length > 0) {
        accumulatedDocs.push(currentPiece.join(separator));

        // Compute overlap by retaining trailing elements from current piece
        let overlapLength = 0;
        const overlapPiece: string[] = [];
        for (let j = currentPiece.length - 1; j >= 0; j--) {
          overlapPiece.unshift(currentPiece[j]);
          overlapLength += currentPiece[j].length + (separator.length || 0);
          if (overlapLength >= chunkOverlap) break;
        }

        currentPiece = overlapPiece;
        currentLength = overlapLength;
      }

      currentPiece.push(part);
      currentLength += partLen;
    }

    // Push trailing elements
    if (currentPiece.length > 0) {
      accumulatedDocs.push(currentPiece.join(separator));
    }

    return accumulatedDocs;
  }

  // Step 5: Execute recursive splitting
  const rawSegments = splitHierarchy(raw, 0);

  // Step 6: Construct formatted TextChunk array with metadata
  const chunks: TextChunk[] = [];
  let chunkCounter = 0;

  for (const segment of rawSegments) {
    const trimmed = segment.trim();

    // Skip segments smaller than minChunkSize unless it's the only one
    if (trimmed.length < minChunkSize && chunks.length > 0) {
      continue;
    }

    if (trimmed.length > 0) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      chunks.push({
        id: `chunk_${Date.now()}_${chunkCounter}`,
        chunkIndex: chunkCounter++,
        text: trimmed,
        charCount: trimmed.length,
        wordCount: words.length,
        tokenEstimate: estimateTokens(trimmed)
      });
    }
  }

  return chunks;
}

/**
 * ============================================================================
 * ACTION 3: Page-Aware Chunking Function
 * Chunks an array of extracted PDF pages, tagging each chunk with pageNumber
 * ============================================================================
 */
export function chunkPages(pages: ParsedPage[], options?: ChunkOptions): TextChunk[] {
  if (!pages || !Array.isArray(pages) || pages.length === 0) return [];

  const allChunks: TextChunk[] = [];
  let globalChunkIndex = 0;

  // Iterate each page and chunk its text content
  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;

    const pageChunks = chunkText(page.text, options);

    for (const chunk of pageChunks) {
      allChunks.push({
        ...chunk,
        id: `chunk_p${page.pageNumber}_${chunk.chunkIndex}`,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        metadata: {
          pageNumber: page.pageNumber,
          source: 'page-extraction'
        }
      });
    }
  }

  return allChunks;
}

/**
 * ============================================================================
 * ACTION 4: Document-Level Chunking Function
 * Chunks a complete TemporaryPdfDocument and enriches chunks with document ID
 * ============================================================================
 */
export function chunkPdfDocument(
  doc: TemporaryPdfDocument,
  options?: ChunkOptions
): {
  chunks: TextChunk[];
  totalChunks: number;
  totalTokens: number;
} {
  if (!doc || !doc.pages) {
    return { chunks: [], totalChunks: 0, totalTokens: 0 };
  }

  const rawChunks = chunkPages(doc.pages, options);

  // Attach documentId to all generated chunks
  const chunks = rawChunks.map((c) => ({
    ...c,
    id: `chunk_${doc.id}_p${c.pageNumber || 1}_${c.chunkIndex}`,
    documentId: doc.id
  }));

  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenEstimate, 0);

  return {
    chunks,
    totalChunks: chunks.length,
    totalTokens
  };
}
