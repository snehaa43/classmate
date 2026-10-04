import { PDFParse, VerbosityLevel } from 'pdf-parse';

/**
 * ============================================================================
 * TYPE DEFINITIONS FOR PARSED PDF PAGES & TEMPORARY STORAGE
 * ============================================================================
 */

export interface ParsedPage {
  pageNumber: number;   // 1-indexed page number
  text: string;         // Cleaned text content of the page
  rawText?: string;     // Original uncleaned text from PDF parser
  wordCount: number;    // Number of words on this page
  charCount: number;    // Character count on this page
}

export interface TemporaryPdfDocument {
  id: string;               // Unique document identifier
  filename: string;         // Original file name (e.g. syllabus.pdf)
  sizeBytes: number;        // File size in bytes
  sizeFormatted: string;    // Human-readable size (e.g. 2.4 MB)
  totalPages: number;       // Total number of pages extracted
  totalWords: number;       // Total words across all pages
  totalChars: number;       // Total characters across all pages
  pages: ParsedPage[];      // Page-by-page extracted text array
  chunks?: import('./chunker').TextChunk[]; // Optional pre-computed semantic chunks
  uploadedAt: string;       // ISO timestamp of upload
  expiresAt: string;        // Expiration timestamp (e.g. 1 hour TTL)
}

// Re-export chunking types and functions for unified access
export * from './chunker';

/**
 * ============================================================================
 * TEXT CLEANING PIPELINE
 * Cleans, sanitizes, and normalizes raw text extracted from PDF streams.
 * ============================================================================
 */
export function cleanExtractedText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // --------------------------------------------------------------------------
  // ACTION 1: Unicode Normalization (NFKC)
  // Decomposes and recomposes Unicode characters to canonical forms
  // --------------------------------------------------------------------------
  text = text.normalize('NFKC');

  // --------------------------------------------------------------------------
  // ACTION 2: Ligature Normalization
  // Expands standard font ligatures (e.g., 'ﬁ' -> 'fi', 'ﬂ' -> 'fl')
  // --------------------------------------------------------------------------
  const ligatureMap: Record<string, string> = {
    'ﬁ': 'fi',
    'ﬂ': 'fl',
    'ﬀ': 'ff',
    'ﬃ': 'ffi',
    'ﬄ': 'ffl',
    'œ': 'oe',
    'Œ': 'OE',
    'æ': 'ae',
    'Æ': 'AE'
  };
  text = text.replace(/[ﬁﬂﬀﬃﬄœŒæÆ]/g, (char) => ligatureMap[char] || char);

  // --------------------------------------------------------------------------
  // ACTION 3: Strip Non-Printable & Binary Control Characters
  // Removes ASCII control codes, zero-width spaces, and replacement glyphs
  // Preserves standard line breaks (\n, \r) and horizontal tabs (\t)
  // --------------------------------------------------------------------------
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200D\uFEFF\uFFFD]/g, '');

  // --------------------------------------------------------------------------
  // ACTION 4: Reconstruct Hyphenated Word Breaks
  // Joins words split across consecutive lines with a hyphen (e.g. 'docu-\nment' -> 'document')
  // --------------------------------------------------------------------------
  text = text.replace(/(\b[a-zA-Z]{2,})-\s*\r?\n\s*([a-zA-Z]{2,}\b)/g, (_match, p1, p2) => p1 + p2);

  // --------------------------------------------------------------------------
  // ACTION 5: Normalize Horizontal Whitespace
  // Converts non-breaking spaces & consecutive tabs/spaces to single space
  // Trims each line individually
  // --------------------------------------------------------------------------
  text = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\S\r\n]+/g, ' ').trim())
    .join('\n');

  // --------------------------------------------------------------------------
  // ACTION 6: Normalize Paragraph & Vertical Gaps
  // Reduces 3 or more consecutive newlines down to 2 (\n\n) to preserve paragraphs
  // --------------------------------------------------------------------------
  text = text.replace(/\n{3,}/g, '\n\n');

  // --------------------------------------------------------------------------
  // ACTION 7: Trim Leading & Trailing Whitespace
  // --------------------------------------------------------------------------
  return text.trim();
}

/**
 * ============================================================================
 * TEMPORARY IN-MEMORY STORE
 * Stores extracted PDF pages temporarily in RAM with a Time-To-Live (TTL)
 * ============================================================================
 */
class TemporaryPdfStore {
  // Key: documentId, Value: TemporaryPdfDocument
  private store: Map<string, TemporaryPdfDocument> = new Map();

  // TTL: 1 hour in milliseconds
  private readonly TTL_MS = 60 * 60 * 1000;

  /**
   * Action: Save a newly parsed PDF document into the temporary store
   */
  public save(doc: Omit<TemporaryPdfDocument, 'expiresAt'>): TemporaryPdfDocument {
    // Calculate expiration timestamp (current time + 1 hour)
    const expiresAt = new Date(Date.now() + this.TTL_MS).toISOString();
    const entry: TemporaryPdfDocument = { ...doc, expiresAt };

    // Store in RAM Map
    this.store.set(doc.id, entry);

    // Run cleanup of expired records
    this.cleanupExpired();

    return entry;
  }

  /**
   * Action: Retrieve an extracted PDF document from the temporary store by ID
   */
  public get(id: string): TemporaryPdfDocument | undefined {
    const doc = this.store.get(id);
    if (!doc) return undefined;

    // Check if expired
    if (new Date(doc.expiresAt).getTime() < Date.now()) {
      this.store.delete(id);
      return undefined;
    }

    return doc;
  }

  /**
   * Action: Remove expired items from memory to prevent memory leaks
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, doc] of this.store.entries()) {
      if (new Date(doc.expiresAt).getTime() < now) {
        this.store.delete(id);
      }
    }
  }

  /**
   * Action: Get all currently stored temporary document IDs (for debug/testing)
   */
  public listAllIds(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Action: Get all active documents as an array
   */
  public getAll(): TemporaryPdfDocument[] {
    this.cleanupExpired();
    return Array.from(this.store.values());
  }

  /**
   * Action: Return entries iterator
   */
  public entries(): IterableIterator<[string, TemporaryPdfDocument]> {
    this.cleanupExpired();
    return this.store.entries();
  }
}

// Global Singleton Instance of Temporary In-Memory Store
export const tempPdfStore = new TemporaryPdfStore();

/**
 * ============================================================================
 * PDF PAGE-BY-PAGE EXTRACTION FUNCTION
 * Parses PDF binary buffer and extracts text for each individual page
 * ============================================================================
 */
export async function parsePdfPageByPage(buffer: Buffer): Promise<{
  pages: ParsedPage[];
  totalPages: number;
  totalWords: number;
  totalChars: number;
}> {
  // Action 1: Instantiate PDFParse with input buffer
  const parser = new PDFParse({
    verbosity: VerbosityLevel.ERRORS,
    data: buffer
  });

  try {
    // Action 2: Load document stream
    await (parser as any).load?.();

    // Action 3: Extract structured text and pages
    const textResult = await parser.getText();

    const rawPages = textResult?.pages || [];
    const totalPages = textResult?.total || rawPages.length || 1;

    const pages: ParsedPage[] = [];
    let totalWords = 0;
    let totalChars = 0;

    // Action 4: Process, clean, and compute statistics for each extracted page
    for (let i = 0; i < rawPages.length; i++) {
      const p = rawPages[i];
      const pageNumber = p.num || (i + 1);
      const rawText = (p.text || '').trim();

      // Action 4a: Apply text cleaning pipeline
      const cleanedText = cleanExtractedText(rawText);

      // Action 4b: Compute word and character counts on cleaned text
      const words = cleanedText.length > 0 ? cleanedText.split(/\s+/).filter(Boolean) : [];
      const wordCount = words.length;
      const charCount = cleanedText.length;

      totalWords += wordCount;
      totalChars += charCount;

      pages.push({
        pageNumber,
        text: cleanedText || `[Page ${pageNumber}: No readable text content or scanned image]`,
        rawText,
        wordCount,
        charCount
      });
    }

    // Action 5: Fallback if pages array was empty but text property exists
    if (pages.length === 0 && textResult?.text) {
      const fallbackCleaned = cleanExtractedText(textResult.text);
      const words = fallbackCleaned.length > 0 ? fallbackCleaned.split(/\s+/).filter(Boolean) : [];
      pages.push({
        pageNumber: 1,
        text: fallbackCleaned || '[Page 1: Empty text content]',
        rawText: textResult.text,
        wordCount: words.length,
        charCount: fallbackCleaned.length
      });
      totalWords = words.length;
      totalChars = fallbackCleaned.length;
    }

    return {
      pages,
      totalPages: Math.max(totalPages, pages.length),
      totalWords,
      totalChars
    };
  } finally {
    // Action 6: Always release parser resources
    try {
      await parser.destroy();
    } catch {
      // Ignore cleanup error if already destroyed
    }
  }
}


