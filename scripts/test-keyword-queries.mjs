/**
 * ============================================================================
 * TEST SUITE: KEYWORD SEARCH & DOCUMENT SEARCH VERIFICATION
 * ============================================================================
 * Tests:
 * 1. Single & Multi-word Keyword Search on Text Chunks
 * 2. Exact Phrase Match & BM25 Scoring / Boosting
 * 3. Document Search (Title, Metadata & Content)
 * 4. Document-Filtered Keyword Retrieval (documentId scoping)
 * 5. Case-insensitivity & Symbol/Percentage handling (e.g. "99.95%", "HBM3e", "DAI-7")
 * 6. Hybrid Score Fusion (Dense Vector + Sparse Keyword RRF)
 * 7. Verification of matching chunk results & rank ordering
 */

import {
  tokenizeQuery,
  extractMatchedTerms,
  scoreChunkByKeywords,
  searchInMemoryChunksWithKeywords,
  searchInMemoryDocumentsWithKeywords,
  combineHybridScores
} from '../src/lib/keywordSearch.ts';

import { KNOWLEDGE_BASE } from '../src/data/knowledgeBase.ts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runTestSuite() {
  console.log('====================================================================');
  console.log('🧪 RUNNING TEST SUITE: KEYWORD SEARCH, DOCUMENT SEARCH & CHUNK RETRIEVAL');
  console.log('====================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Tokenization and Symbol Preservation
  // --------------------------------------------------------------------------
  console.log('1️⃣ Testing Tokenization & Symbol Resilience:');
  const tokens1 = tokenizeQuery('What is the 99.95% SLA and HBM3e GPU cluster?');
  assert(tokens1.includes('99.95%'), 'Preserves percentage terms: "99.95%"');
  assert(tokens1.includes('hbm3e'), 'Preserves alphanumeric technical terms: "hbm3e"');
  assert(tokens1.includes('gpu'), 'Preserves acronyms: "gpu"');
  assert(tokens1.includes('cluster'), 'Preserves standard keywords: "cluster"');
  assert(!tokens1.includes('the') && !tokens1.includes('is'), 'Filters common stopwords');

  // --------------------------------------------------------------------------
  // TEST 2: Exact Phrase Matching & Term Extraction
  // --------------------------------------------------------------------------
  console.log('\n2️⃣ Testing Exact Phrase & Keyword Term Extraction:');
  const sampleText = 'TechCorp consolidated revenue reached $4.82B, representing an 18.4% YoY increase with GPU compute cluster allocation.';
  const matchResult = extractMatchedTerms('GPU compute cluster', sampleText);
  assert(matchResult.hasExactPhrase === true, 'Detects exact multi-word phrase "GPU compute cluster"');
  assert(matchResult.matchCount >= 4, `Counts occurrence hits correctly (Found: ${matchResult.matchCount})`);
  assert(matchResult.matchedKeywords.length >= 3, `Extracts matched keywords: ${matchResult.matchedKeywords.join(', ')}`);

  // --------------------------------------------------------------------------
  // TEST 3: BM25 Lexical Scoring on Chunks
  // --------------------------------------------------------------------------
  console.log('\n3️⃣ Testing BM25 Lexical Chunk Scoring:');
  const score1 = scoreChunkByKeywords(sampleText, 'GPU compute cluster');
  const score2 = scoreChunkByKeywords(sampleText, 'unrelated medical trial');
  assert(score1.score > 0.5, `High relevance score for matching text: ${(score1.score * 100).toFixed(1)}%`);
  assert(score2.score === 0, 'Zero score for non-matching query');
  assert(score1.matchedKeywords.length > 0, `Matched terms identified: ${score1.matchedKeywords.join(', ')}`);

  // --------------------------------------------------------------------------
  // TEST 4: Single Keyword Chunk Retrieval
  // --------------------------------------------------------------------------
  console.log('\n4️⃣ Testing Single Keyword Queries on Knowledge Base Chunks:');
  
  // Flatten all chunks from Knowledge Base
  const allKBChunks = [];
  Object.values(KNOWLEDGE_BASE).forEach((doc) => {
    doc.chunks.forEach((c) => {
      allKBChunks.push({
        id: c.id,
        documentId: doc.id,
        documentTitle: doc.name,
        range: c.range,
        text: c.text
      });
    });
  });

  // Query A: "EBITDA" / "revenue"
  const revenueResults = searchInMemoryChunksWithKeywords('revenue', allKBChunks, { topK: 4 });
  assert(revenueResults.length > 0, `Found ${revenueResults.length} matching chunks for keyword "revenue"`);
  assert(revenueResults[0].content.toLowerCase().includes('revenue'), 'Top chunk contains "revenue"');
  assert(revenueResults[0].matchedKeywords.includes('revenue'), 'Matched keyword tag contains "revenue"');
  console.log(`     Top Result: [${revenueResults[0].documentTitle}] "${revenueResults[0].content.substring(0, 80)}..."`);

  // Query B: "99.95%" (SLA uptime in Legal doc)
  const slaResults = searchInMemoryChunksWithKeywords('99.95%', allKBChunks, { topK: 3 });
  assert(slaResults.length > 0, `Found ${slaResults.length} matching chunks for "99.95%"`);
  assert(slaResults[0].documentId === 'legal', 'Correctly identified Legal Contract document for 99.95% SLA');
  assert(slaResults[0].content.includes('99.95%'), 'Verbatim contains "99.95%"');

  // Query C: "Cross-Encoder" (AI Research doc)
  const rerankResults = searchInMemoryChunksWithKeywords('Cross-Encoder', allKBChunks, { topK: 3 });
  assert(rerankResults.length > 0, `Found ${rerankResults.length} matching chunks for "Cross-Encoder"`);
  assert(rerankResults[0].documentId === 'research', 'Correctly identified AI Research document for "Cross-Encoder"');
  assert(rerankResults[0].content.toLowerCase().includes('cross-encoder'), 'Verbatim contains "cross-encoder"');

  // Query D: "DAI-7" (Clinical Trial doc)
  const clinicalResults = searchInMemoryChunksWithKeywords('DAI-7', allKBChunks, { topK: 3 });
  assert(clinicalResults.length > 0, `Found ${clinicalResults.length} matching chunks for "DAI-7"`);
  assert(clinicalResults[0].documentId === 'clinical', 'Correctly identified Clinical Study for "DAI-7"');

  // --------------------------------------------------------------------------
  // TEST 5: Document-Filtered Keyword Search (Scoped documentId)
  // --------------------------------------------------------------------------
  console.log('\n5️⃣ Testing Document Scoping (documentId filter):');
  const financeOnlyResults = searchInMemoryChunksWithKeywords('risk', allKBChunks, {
    documentId: 'finance',
    topK: 4
  });
  assert(financeOnlyResults.length > 0, `Retrieved ${financeOnlyResults.length} chunks within 'finance' document`);
  assert(financeOnlyResults.every((r) => r.documentId === 'finance'), 'All retrieved chunks belong to finance doc');

  // --------------------------------------------------------------------------
  // TEST 6: Document Search (Search across documents & return nested chunks)
  // --------------------------------------------------------------------------
  console.log('\n6️⃣ Testing Document-Level Search Engine:');
  
  // Search for "Financial"
  const docResultsFinance = searchInMemoryDocumentsWithKeywords('Financial Report', KNOWLEDGE_BASE, { topK: 3 });
  assert(docResultsFinance.length > 0, `Found ${docResultsFinance.length} matching document(s) for "Financial Report"`);
  assert(docResultsFinance[0].id === 'finance', `Top matching document is "${docResultsFinance[0].title}"`);
  assert(docResultsFinance[0].topMatchingChunks.length > 0, `Returned ${docResultsFinance[0].topMatchingChunks.length} top matching chunks inside document`);

  // Search for "Phase 3 clinical trial protocol"
  const docResultsClinical = searchInMemoryDocumentsWithKeywords('clinical trial phase 3', KNOWLEDGE_BASE, { topK: 3 });
  assert(docResultsClinical.length > 0, `Found matching document for "clinical trial phase 3"`);
  assert(docResultsClinical[0].id === 'clinical', `Top matching document is "${docResultsClinical[0].title}"`);

  // --------------------------------------------------------------------------
  // TEST 7: Case-Insensitivity & Punctuation Resilience
  // --------------------------------------------------------------------------
  console.log('\n7️⃣ Testing Case-Insensitivity & Punctuation Tolerance:');
  const lowerResults = searchInMemoryChunksWithKeywords('ebitda', allKBChunks);
  const upperResults = searchInMemoryChunksWithKeywords('EBITDA', allKBChunks);
  const mixedResults = searchInMemoryChunksWithKeywords('eBiTdA', allKBChunks);
  assert(lowerResults.length === upperResults.length && upperResults.length === mixedResults.length, 'Consistent results across lower, UPPER, and MiXeD case');

  const hyphenResults1 = searchInMemoryChunksWithKeywords('cross encoder', allKBChunks);
  const hyphenResults2 = searchInMemoryChunksWithKeywords('cross-encoder', allKBChunks);
  assert(hyphenResults1.length > 0 && hyphenResults2.length > 0, 'Matches both hyphenated and space-separated variations');

  // --------------------------------------------------------------------------
  // TEST 8: Hybrid Score Fusion (Dense + Sparse Reciprocal Rank Fusion)
  // --------------------------------------------------------------------------
  console.log('\n8️⃣ Testing Hybrid Search Fusion (RRF):');
  const mockVectorResults = [
    { id: 1, documentId: 'finance', content: 'Revenue surge in Q4...', similarity: 0.95 },
    { id: 2, documentId: 'finance', content: 'Segment performance cloud ARR...', similarity: 0.88 }
  ];
  const mockKeywordResults = [
    { id: 2, documentId: 'finance', content: 'Segment performance cloud ARR...', similarity: 0.92, matchedKeywords: ['cloud', 'ARR'], matchCount: 2, rank: 1, tokenEstimate: 20, charCount: 80, wordCount: 15, searchMode: 'keyword' },
    { id: 3, documentId: 'finance', content: 'Operating expenses R&D...', similarity: 0.70, matchedKeywords: ['R&D'], matchCount: 1, rank: 2, tokenEstimate: 20, charCount: 80, wordCount: 15, searchMode: 'keyword' }
  ];

  const hybridResults = combineHybridScores(mockVectorResults, mockKeywordResults, { topK: 3 });
  assert(hybridResults.length > 0, `Generated ${hybridResults.length} fused hybrid results`);
  assert(hybridResults[0].id === 2, 'Item present in both vector and keyword ranks achieves top boosted hybrid rank (RRF)');
  assert(hybridResults[0].searchMode === 'hybrid', 'Tagged with searchMode: "hybrid"');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`📊 TEST RESULTS SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🎉 ALL KEYWORD SEARCH & DOCUMENT SEARCH TESTS PASSED 100% SUCCESSFULLY!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
  }
  console.log('====================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
