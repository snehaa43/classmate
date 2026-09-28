import { PDFParse, VerbosityLevel } from 'pdf-parse';

/**
 * ============================================================================
 * TYPE DEFINITIONS FOR PARSED PDF PAGES & TEMPORARY STORAGE
 * ============================================================================
 */

export interface ParsedPage {
  pageNumber: number;   // 1-indexed page number
  text: string;         // Extracted text content of the page
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
  uploadedAt: string;       // ISO timestamp of upload
  expiresAt: string;        // Expiration timestamp (e.g. 1 hour TTL)
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
    await parser.load();

    // Action 3: Extract structured text and pages
    const textResult = await parser.getText();

    const rawPages = textResult?.pages || [];
    const totalPages = textResult?.total || rawPages.length || 1;

    const pages: ParsedPage[] = [];
    let totalWords = 0;
    let totalChars = 0;

    // Action 4: Process and compute statistics for each extracted page
    for (let i = 0; i < rawPages.length; i++) {
      const p = rawPages[i];
      const pageNumber = p.num || (i + 1);
      const rawText = (p.text || '').trim();

      // Compute word and character counts
      const words = rawText.length > 0 ? rawText.split(/\s+/).filter(Boolean) : [];
      const wordCount = words.length;
      const charCount = rawText.length;

      totalWords += wordCount;
      totalChars += charCount;

      pages.push({
        pageNumber,
        text: rawText || `[Page ${pageNumber}: No readable text content or scanned image]`,
        wordCount,
        charCount
      });
    }

    // Action 5: Fallback if pages array was empty but text property exists
    if (pages.length === 0 && textResult?.text) {
      const fallbackText = textResult.text.trim();
      const words = fallbackText.length > 0 ? fallbackText.split(/\s+/).filter(Boolean) : [];
      pages.push({
        pageNumber: 1,
        text: fallbackText || '[Page 1: Empty text content]',
        wordCount: words.length,
        charCount: fallbackText.length
      });
      totalWords = words.length;
      totalChars = fallbackText.length;
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

