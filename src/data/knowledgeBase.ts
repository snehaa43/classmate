export interface Chunk {
  id: number | string;
  range: string;
  vectorNorm: string;
  text: string;
  pageNumber?: number;
  chunkIndex?: number;
  tokenEstimate?: number;
  charCount?: number;
  wordCount?: number;
}

export interface Citation {
  index: number;
  chunkId: number | string;
  page: string;
  score: string;
  quote: string;
}

export interface QAResponse {
  answer: string;
  citations: Citation[];
}

export interface DocumentItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  meta: {
    type: string;
    pages: number;
    chunks: number;
    tokens: string;
    embeddingModel: string;
    dimension: string;
    similarity: string;
  };
  suggestedQueries: string[];
  chunks: Chunk[];
  qaDatabase: Record<string, QAResponse>;
}

// Clean knowledge base with zero sample/mock datasets
export const KNOWLEDGE_BASE: Record<string, DocumentItem> = {};

export const CODE_SNIPPETS: Record<string, string> = {
  python: '',
  typescript: '',
  curl: ''
};
