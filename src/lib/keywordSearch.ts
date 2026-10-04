/**
 * ============================================================================
 * KEYWORD SEARCH & SPARSE LEXICAL RETRIEVAL ENGINE
 * ============================================================================
 * Provides BM25 / TF-IDF style lexical keyword matching, exact phrase boosting,
 * tokenization, document search, and hybrid score fusion for RAG systems.
 */

// Common English stopwords to filter during multi-word query tokenization
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves'
]);

export interface KeywordMatchResult {
  id: string | number;
  documentId?: string;
  documentTitle?: string;
  documentFilename?: string;
  pageNumber?: number;
  chunkIndex?: number;
  content: string;
  score: number;
  similarity: number;
  similarityFormatted: string;
  rank: number;
  tokenEstimate: number;
  charCount: number;
  wordCount: number;
  matchedKeywords: string[];
  matchCount: number;
  searchMode: 'keyword' | 'vector' | 'hybrid';
  metadata?: any;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  filename?: string;
  category?: string;
  totalPages?: number;
  totalChunks?: number;
  totalWords?: number;
  matchScore: number;
  matchedKeywords: string[];
  matchingChunksCount: number;
  topMatchingChunks: KeywordMatchResult[];
  metadata?: any;
}

export interface KeywordSearchOptions {
  topK?: number;
  minScore?: number;
  documentId?: string;
  exactPhraseBoost?: number;
  k1?: number; // BM25 term frequency saturation parameter (default: 1.2)
  b?: number;  // BM25 document length normalization parameter (default: 0.75)
}

/**
 * Tokenizes text into normalized search terms, preserving numbers, symbols, and acronyms.
 */
export function tokenizeQuery(query: string, filterStopwords = true): string[] {
  if (!query || typeof query !== 'string') return [];

  // Match words, hyphenated terms (e.g. CS-701, HBM3e, DAI-7), percentages (e.g. 99.95%), and alphanumeric tokens
  const rawTokens = query
    .toLowerCase()
    .match(/\$?[a-z0-9]+(?:[-_.][a-z0-9]+)*%?/g) || [];

  if (!filterStopwords || rawTokens.length <= 1) {
    return rawTokens.filter((t) => t.length > 0);
  }

  const filtered = rawTokens.filter((t) => !STOPWORDS.has(t) && t.length > 1);
  return filtered.length > 0 ? filtered : rawTokens;
}

/**
 * Extracts all matching terms and exact phrase matches from a target text.
 */
export function extractMatchedTerms(query: string, text: string): {
  matchedKeywords: string[];
  matchCount: number;
  hasExactPhrase: boolean;
} {
  if (!query || !text) {
    return { matchedKeywords: [], matchCount: 0, hasExactPhrase: false };
  }

  const cleanQuery = query.trim().toLowerCase();
  const cleanText = text.toLowerCase();
  const tokens = tokenizeQuery(query);

  const matchedKeywordsSet = new Set<string>();
  let matchCount = 0;

  // Check for full exact phrase match
  const hasExactPhrase = cleanQuery.length > 3 && cleanText.includes(cleanQuery);
  if (hasExactPhrase) {
    matchedKeywordsSet.add(cleanQuery);
    // Count exact phrase occurrences
    const phraseRegex = new RegExp(escapeRegExp(cleanQuery), 'gi');
    const phraseMatches = text.match(phraseRegex);
    if (phraseMatches) matchCount += phraseMatches.length * 2;
  }

  // Check individual token matches
  for (const token of tokens) {
    if (!token) continue;
    const tokenRegex = new RegExp(`\\b${escapeRegExp(token)}|${escapeRegExp(token)}`, 'gi');
    const matches = text.match(tokenRegex);
    if (matches && matches.length > 0) {
      matchedKeywordsSet.add(token);
      matchCount += matches.length;
    }
  }

  return {
    matchedKeywords: Array.from(matchedKeywordsSet),
    matchCount,
    hasExactPhrase
  };
}

/**
 * Helper to escape special characters for Regular Expressions.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates a BM25-inspired lexical relevance score for a chunk given query terms.
 */
export function scoreChunkByKeywords(
  chunkText: string,
  query: string,
  avgDocLength = 100,
  options?: KeywordSearchOptions
): { score: number; matchedKeywords: string[]; matchCount: number } {
  if (!chunkText || !query) {
    return { score: 0, matchedKeywords: [], matchCount: 0 };
  }

  const { matchedKeywords, matchCount, hasExactPhrase } = extractMatchedTerms(query, chunkText);
  if (matchCount === 0 || matchedKeywords.length === 0) {
    return { score: 0, matchedKeywords: [], matchCount: 0 };
  }

  const k1 = options?.k1 ?? 1.2;
  const b = options?.b ?? 0.75;
  const exactBoost = options?.exactPhraseBoost ?? 2.5;

  const queryTokens = tokenizeQuery(query);
  const textWords = chunkText.toLowerCase().split(/\s+/).filter(Boolean);
  const docLen = textWords.length || 1;

  let totalScore = 0;

  // Compute BM25 term frequency score for each query token
  for (const token of queryTokens) {
    // Count term frequency in chunk
    const tokenRegex = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi');
    const exactWordMatches = (chunkText.match(tokenRegex) || []).length;
    
    // Partial substring fallback count
    const partialMatches = exactWordMatches > 0 
      ? exactWordMatches 
      : (chunkText.toLowerCase().split(token).length - 1);

    if (partialMatches > 0) {
      const tf = partialMatches;
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLength));
      const termScore = numerator / denominator;
      
      // Bonus if exact word boundary match
      const wordBoundaryBonus = exactWordMatches > 0 ? 1.3 : 1.0;
      totalScore += termScore * wordBoundaryBonus;
    }
  }

  // Fraction of query terms covered
  const coverageRatio = queryTokens.length > 0 
    ? matchedKeywords.filter((k) => queryTokens.includes(k)).length / queryTokens.length 
    : 1.0;

  totalScore *= Math.max(0.5, 0.5 + coverageRatio * 0.5);

  // Apply boost for exact phrase match
  if (hasExactPhrase) {
    totalScore *= exactBoost;
  }

  // Normalize score into standard 0.0 - 1.0 similarity range
  // Using hyperbolic tangent mapping so high keyword counts asymptote smoothly near 0.99
  const normalizedScore = Math.max(0.0, Math.min(0.99, Math.tanh(totalScore / 3.0)));

  return {
    score: normalizedScore,
    matchedKeywords,
    matchCount
  };
}

/**
 * Performs fast, pure keyword search across in-memory chunks.
 */
export function searchInMemoryChunksWithKeywords(
  query: string,
  chunks: Array<{
    id?: string | number;
    text?: string;
    content?: string;
    pageNumber?: number;
    chunkIndex?: number;
    tokenEstimate?: number;
    charCount?: number;
    wordCount?: number;
    documentId?: string;
    documentTitle?: string;
    documentFilename?: string;
    metadata?: any;
    range?: string;
  }>,
  options: KeywordSearchOptions = {}
): KeywordMatchResult[] {
  if (!query || !chunks || chunks.length === 0) return [];

  const { topK = 4, minScore = 0.0, documentId } = options;
  const filteredChunks = documentId 
    ? chunks.filter((c) => !c.documentId || c.documentId === documentId) 
    : chunks;

  const avgLength =
    filteredChunks.reduce((acc, c) => acc + ((c.text || c.content || '').split(/\s+/).length || 0), 0) /
      (filteredChunks.length || 1) || 100;

  const scored: Array<{ chunk: any; score: number; matchedKeywords: string[]; matchCount: number }> = [];

  for (let idx = 0; idx < filteredChunks.length; idx++) {
    const chunk = filteredChunks[idx];
    const text = chunk.text || chunk.content || '';
    const { score, matchedKeywords, matchCount } = scoreChunkByKeywords(text, query, avgLength, options);

    if (score > minScore && matchCount > 0) {
      scored.push({
        chunk,
        score,
        matchedKeywords,
        matchCount
      });
    }
  }

  // Sort by highest keyword relevance score
  scored.sort((a, b) => b.score - a.score || b.matchCount - a.matchCount);

  return scored.slice(0, topK).map((item, idx) => {
    const c = item.chunk;
    const text = c.text || c.content || '';
    const wordCount = c.wordCount || text.split(/\s+/).filter(Boolean).length;
    const charCount = c.charCount || text.length;
    const tokenEstimate = c.tokenEstimate || Math.ceil(charCount / 4);

    return {
      id: c.id ?? `chunk_${idx + 1}`,
      documentId: c.documentId || 'document',
      documentTitle: c.documentTitle || c.range || 'Document',
      documentFilename: c.documentFilename,
      pageNumber: c.pageNumber || (c.range ? parseInt(c.range.match(/\d+/)?.[0] || '1', 10) : 1),
      chunkIndex: c.chunkIndex ?? idx,
      content: text,
      score: item.score,
      similarity: item.score,
      similarityFormatted: `${(item.score * 100).toFixed(1)}%`,
      rank: idx + 1,
      tokenEstimate,
      charCount,
      wordCount,
      matchedKeywords: item.matchedKeywords,
      matchCount: item.matchCount,
      searchMode: 'keyword',
      metadata: c.metadata
    };
  });
}

/**
 * Searches across documents in memory by title, filename, metadata, and chunk contents.
 */
export function searchInMemoryDocumentsWithKeywords(
  query: string,
  documents: Record<string, any> | Array<any>,
  options: KeywordSearchOptions = {}
): DocumentSearchResult[] {
  if (!query) return [];

  const docsList: any[] = Array.isArray(documents)
    ? documents
    : Object.values(documents);

  const results: DocumentSearchResult[] = [];
  const queryTokens = tokenizeQuery(query);
  const cleanQuery = query.toLowerCase().trim();

  for (const doc of docsList) {
    const docId = doc.id || doc._id || 'unknown';
    const title = doc.name || doc.title || doc.filename || 'Untitled Document';
    const filename = doc.filename || doc.name || '';
    const category = doc.category || doc.meta?.type || 'General';

    // 1. Check title & filename matches
    const titleMatch = extractMatchedTerms(query, `${title} ${filename} ${category}`);
    
    // 2. Search inner chunks
    const chunks: any[] = (doc.chunks || []).map((c: any, idx: number) => ({
      ...c,
      documentId: docId,
      documentTitle: title,
      documentFilename: filename
    }));

    const matchingChunks = searchInMemoryChunksWithKeywords(query, chunks, {
      ...options,
      topK: options.topK || 4
    });

    // Compute aggregate document match score
    let docScore = 0;
    const allMatchedKeywords = new Set<string>([...titleMatch.matchedKeywords]);

    if (titleMatch.matchCount > 0) {
      docScore += titleMatch.hasExactPhrase ? 0.95 : 0.8;
    }

    if (matchingChunks.length > 0) {
      // Add contribution from top chunks
      const topChunkScore = matchingChunks[0].score;
      docScore = Math.max(docScore, topChunkScore * 0.9 + (matchingChunks.length * 0.05));
      matchingChunks.forEach((mc) => {
        mc.matchedKeywords.forEach((k) => allMatchedKeywords.add(k));
      });
    }

    if (docScore > 0 || matchingChunks.length > 0) {
      results.push({
        id: docId,
        title,
        filename,
        category,
        totalPages: doc.meta?.pages || doc.totalPages || 1,
        totalChunks: chunks.length,
        totalWords: doc.totalWords || (doc.meta?.tokens ? parseInt(doc.meta.tokens.replace(/,/g, ''), 10) : 0),
        matchScore: Math.min(0.99, docScore),
        matchedKeywords: Array.from(allMatchedKeywords),
        matchingChunksCount: matchingChunks.length,
        topMatchingChunks: matchingChunks,
        metadata: doc.meta || doc.metadata
      });
    }
  }

  // Sort by document match score descending
  results.sort((a, b) => b.matchScore - a.matchScore || b.matchingChunksCount - a.matchingChunksCount);

  return results.slice(0, options.topK || 10);
}

/**
 * Fuses Dense Vector Results and Sparse Keyword Results using Reciprocal Rank Fusion (RRF)
 * Formula: RRF_Score(d) = sum( 1 / (k + rank_dense(d)), 1 / (k + rank_sparse(d)) )
 */
export function combineHybridScores(
  vectorResults: any[],
  keywordResults: KeywordMatchResult[],
  options: { rrfK?: number; topK?: number; denseWeight?: number; sparseWeight?: number } = {}
): KeywordMatchResult[] {
  const rrfK = options.rrfK || 60;
  const topK = options.topK || 4;
  const denseWeight = options.denseWeight ?? 0.6;
  const sparseWeight = options.sparseWeight ?? 0.4;

  const fusedMap = new Map<string, { item: any; rrfScore: number; matchedKeywords: Set<string>; matchCount: number }>();

  // Process Vector Results
  vectorResults.forEach((res, idx) => {
    const key = String(res.id || `chunk_${idx}`);
    const score = res.similarity ?? 0.5;
    const rrfContribution = (1 / (rrfK + (idx + 1))) * denseWeight;

    fusedMap.set(key, {
      item: { ...res },
      rrfScore: rrfContribution,
      matchedKeywords: new Set<string>(),
      matchCount: 0
    });
  });

  // Process Keyword Results
  keywordResults.forEach((res, idx) => {
    const key = String(res.id || `chunk_${idx}`);
    const rrfContribution = (1 / (rrfK + (idx + 1))) * sparseWeight;

    if (fusedMap.has(key)) {
      const existing = fusedMap.get(key)!;
      existing.rrfScore += rrfContribution;
      (res.matchedKeywords || []).forEach((k) => existing.matchedKeywords.add(k));
      existing.matchCount += res.matchCount || 1;
    } else {
      fusedMap.set(key, {
        item: { ...res },
        rrfScore: rrfContribution,
        matchedKeywords: new Set<string>(res.matchedKeywords || []),
        matchCount: res.matchCount || 1
      });
    }
  });

  const sortedList = Array.from(fusedMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);

  // Normalize scores to 0.0 - 1.0 range
  const maxScore = sortedList[0]?.rrfScore || 1;

  return sortedList.slice(0, topK).map((entry, idx) => {
    const rawSim = entry.rrfScore / maxScore;
    const sim = Math.max(0.01, Math.min(0.99, rawSim));

    return {
      ...entry.item,
      rank: idx + 1,
      score: sim,
      similarity: sim,
      similarityFormatted: `${(sim * 100).toFixed(1)}%`,
      matchedKeywords: Array.from(entry.matchedKeywords),
      matchCount: entry.matchCount,
      searchMode: 'hybrid'
    };
  });
}
