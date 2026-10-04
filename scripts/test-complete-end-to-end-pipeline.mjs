/**
 * ============================================================================
 * COMPLETE END-TO-END RAG PIPELINE TEST SUITE (9 STAGES)
 * PDF -> Extract -> Clean -> Chunk -> Embed -> Store -> Retrieve -> LLM -> Answer
 * ============================================================================
 */

import { executeCompleteEndToEndRagPipeline } from '../src/lib/rag.ts';
import { parsePdfPageByPage, cleanExtractedText } from '../src/lib/pdfParser.ts';
import { chunkPages, chunkText } from '../src/lib/chunker.ts';
import { embedChunks, generateEmbedding, cosineSimilarity } from '../src/lib/embeddings.js';
import { POST as pipelineRouteHandler } from '../src/app/api/pipeline/route.ts';

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

// Generate a valid minimal PDF buffer in memory for end-to-end testing
function createSamplePdfBuffer() {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R >>
endobj
5 0 obj
<< /Length 280 >>
stream
BT
/F1 12 Tf
72 712 Td
(CS401: Database Management Systems - Lecture 1) Tj
0 -20 Td
(Relational Normalization: 1NF eliminates repeating groups. 2NF removes partial key dependencies.) Tj
0 -20 Td
(3NF removes transitive dependencies. BCNF ensures every determinant is a candidate key.) Tj
0 -20 Td
(ACID Properties: Atomicity ensures all-or-nothing execution. Consistency preserves integrity constraints.) Tj
0 -20 Td
(Isolation provides serializability using 2-Phase Locking. Durability guarantees committed changes persist via Write-Ahead Logging.) Tj
ET
endstream
endobj
6 0 obj
<< /Length 250 >>
stream
BT
/F1 12 Tf
72 712 Td
(CS401: Database Management Systems - Lecture 2) Tj
0 -20 Td
(Indexing Mechanisms: B+ Tree fanout is typically 100 to 200 with O(log N) lookup time.) Tj
0 -20 Td
(Vector Indexing with pgvector uses HNSW graphs or IVF-Flat indexes with cosine distance.) Tj
0 -20 Td
(Query Optimization uses dynamic programming to find the minimum cost join tree.) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000124 00000 n 
0000000214 00000 n 
0000000304 00000 n 
0000000636 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
940
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

async function runCompletePipelineTestSuite() {
  console.log('====================================================================');
  console.log('🚀 TESTING COMPLETE 9-STAGE END-TO-END RAG ARCHITECTURE');
  console.log('   PDF -> Extract -> Clean -> Chunk -> Embed -> Store -> Retrieve -> LLM -> Answer');
  console.log('====================================================================\n');

  const pdfBuffer = createSamplePdfBuffer();

  // --------------------------------------------------------------------------
  // TEST STAGE 1 & 2: PDF Ingestion & Extraction
  // --------------------------------------------------------------------------
  console.log('1️⃣ STAGE 1 & 2: PDF Parsing & Text Extraction:');
  const parsedPdf = await parsePdfPageByPage(pdfBuffer);
  assert(parsedPdf.totalPages >= 1, `Extracted ${parsedPdf.totalPages} pages from binary PDF`);
  assert(parsedPdf.totalWords > 20, `Extracted ${parsedPdf.totalWords} words from PDF`);
  assert(parsedPdf.pages[0].pageNumber === 1, 'First page is 1-indexed');
  console.log(`     Extracted ${parsedPdf.totalPages} pages, ${parsedPdf.totalWords} words, ${parsedPdf.totalChars} chars.\n`);

  // --------------------------------------------------------------------------
  // TEST STAGE 3: Text Cleaning & Normalization
  // --------------------------------------------------------------------------
  console.log('2️⃣ STAGE 3: Text Cleaning & Normalization:');
  const dirtySample = 'Database   ﬁle   nor-\nmalization\u200B with    redundant\n\n\n\nspaces.';
  const cleanedText = cleanExtractedText(dirtySample);
  assert(!cleanedText.includes('ﬁ'), 'Ligature "ﬁ" expanded to "fi"');
  assert(!cleanedText.includes('nor-\nmalization'), 'Hyphenated line break joined to "normalization"');
  assert(!cleanedText.includes('\n\n\n\n'), 'Consecutive newlines reduced to standard paragraph gap');
  assert(!cleanedText.includes('\u200B'), 'Zero-width space control character stripped');
  console.log(`     Cleaned: "${cleanedText}"\n`);

  // --------------------------------------------------------------------------
  // TEST STAGE 4: Semantic Chunking
  // --------------------------------------------------------------------------
  console.log('3️⃣ STAGE 4: Semantic Boundary Chunking:');
  const rawChunks = chunkPages(parsedPdf.pages, { chunkSize: 250, chunkOverlap: 30 });
  assert(rawChunks.length >= 1, `Generated ${rawChunks.length} semantic chunks`);
  assert(rawChunks[0].tokenEstimate > 0, `Computed token estimate: ${rawChunks[0].tokenEstimate} tokens`);
  assert(typeof rawChunks[0].pageNumber === 'number', `Attached pageNumber: ${rawChunks[0].pageNumber}`);
  console.log(`     Created ${rawChunks.length} chunks across pages.\n`);

  // --------------------------------------------------------------------------
  // TEST STAGE 5: Vector Embeddings Generation (768-d)
  // --------------------------------------------------------------------------
  console.log('4️⃣ STAGE 5: Vector Embeddings (Gemini 768-d):');
  const sampleText = 'Relational Normalization and 3NF database constraints';
  const queryEmbedding = await generateEmbedding(sampleText, { outputDimensionality: 768 });
  assert(Array.isArray(queryEmbedding), 'Embedding is an array');
  assert(queryEmbedding.length === 768, `Vector dimension is exactly 768-d (got ${queryEmbedding.length})`);
  
  const embedResult = await embedChunks(rawChunks.slice(0, 2));
  assert(embedResult.success === true, 'Batch chunk embedding succeeded');
  assert(embedResult.dimension === 768, `Chunks enriched with ${embedResult.dimension}-d vectors`);
  console.log(`     Vectorized ${embedResult.totalChunks} chunks with ${embedResult.dimension}-d embeddings.\n`);

  // --------------------------------------------------------------------------
  // TEST STAGE 6, 7, 8, 9: Complete Pipeline Execution (Direct Question)
  // --------------------------------------------------------------------------
  console.log('5️⃣ STAGES 1-9: Complete Pipeline Execution (What is 3NF and BCNF?):');
  const directResult = await executeCompleteEndToEndRagPipeline({
    pdfBuffer,
    filename: 'CS401_DBMS_Lectures.pdf',
    title: 'CS401: DBMS Notes',
    question: 'What is 3NF and BCNF according to the lecture notes?'
  });

  assert(directResult.success === true, 'End-to-end pipeline returned success=true');
  assert(directResult.stages.pdf.status === 'completed', 'Stage 1 (PDF) completed');
  assert(directResult.stages.extract.status === 'completed', 'Stage 2 (Extract) completed');
  assert(directResult.stages.clean.status === 'completed', 'Stage 3 (Clean) completed');
  assert(directResult.stages.chunk.status === 'completed', 'Stage 4 (Chunk) completed');
  assert(directResult.stages.embed.status === 'completed', 'Stage 5 (Embed) completed');
  assert(directResult.stages.store.status === 'completed' || directResult.stages.store.status === 'fallback', 'Stage 6 (Store) completed (DB/Memory Store)');
  assert(directResult.stages.retrieve.status === 'completed', 'Stage 7 (Retrieve) completed');
  assert(directResult.stages.llm.status === 'completed', 'Stage 8 (LLM) completed');
  assert(directResult.stages.answer.status === 'completed', 'Stage 9 (Answer) completed');
  assert(directResult.sources.length > 0, `Retrieved ${directResult.sources.length} grounded sources`);
  assert(directResult.answer.toLowerCase().includes('3nf') || directResult.answer.toLowerCase().includes('transitive') || directResult.answer.toLowerCase().includes('bcnf') || directResult.answer.toLowerCase().includes('candidate key'), 'Answer contains grounded 3NF/BCNF normalization rules');
  console.log(`     Answer Preview: "${directResult.answer.substring(0, 140)}..."\n`);

  // --------------------------------------------------------------------------
  // TEST STAGES 1-9: Rephrased Query / Semantic Retrieval (ACID Durability)
  // --------------------------------------------------------------------------
  console.log('6️⃣ STAGES 1-9: Semantic Retrieval for Rephrased Query (How do we guarantee committed data is never lost?):');
  const semanticResult = await executeCompleteEndToEndRagPipeline({
    pdfBuffer,
    filename: 'CS401_DBMS_Lectures.pdf',
    title: 'CS401: DBMS Notes',
    question: 'How does the database guarantee that committed data is never lost during crashes?'
  });

  assert(semanticResult.success === true, 'Semantic pipeline query succeeded');
  assert(semanticResult.sources.length > 0, 'Found matching chunks for rephrased query');
  assert(semanticResult.answer.toLowerCase().includes('durability') || semanticResult.answer.toLowerCase().includes('write-ahead') || semanticResult.answer.toLowerCase().includes('log') || semanticResult.answer.toLowerCase().includes('commit'), 'Answer retrieved Durability / Write-Ahead Logging mechanism');
  console.log(`     Answer Preview: "${semanticResult.answer.substring(0, 140)}..."\n`);

  // --------------------------------------------------------------------------
  // TEST STAGES 1-9: Anti-Hallucination Refusal for Unrelated Question
  // --------------------------------------------------------------------------
  console.log('7️⃣ STAGES 1-9: Anti-Hallucination Guardrail (Unrelated Question):');
  const unrelatedResult = await executeCompleteEndToEndRagPipeline({
    pdfBuffer,
    filename: 'CS401_DBMS_Lectures.pdf',
    title: 'CS401: DBMS Notes',
    question: 'What is the recipe for chocolate chip cookies?'
  });

  const unAnswerLower = unrelatedResult.answer.toLowerCase();
  const refusesHallucination = unAnswerLower.includes("couldn't find") ||
                               unAnswerLower.includes("not available") ||
                               unAnswerLower.includes("not mentioned") ||
                               unAnswerLower.includes("uploaded notes");
  assert(refusesHallucination, 'Refuses to hallucinate on baking recipe: returned no-information message');
  console.log(`     System Response: "${unrelatedResult.answer}"\n`);

  // --------------------------------------------------------------------------
  // TEST: POST /api/pipeline Route Protocol
  // --------------------------------------------------------------------------
  console.log('8️⃣ Testing POST /api/pipeline Endpoint Protocol:');
  const apiReq = new Request('http://localhost:3000/api/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Lecture 1: Indexing with B+ Trees. Fanout is 100 to 200 with O(log N) lookup time.',
      filename: 'CS401_Syllabus.txt',
      title: 'CS401 Syllabus',
      question: 'What is the fanout and lookup complexity of B+ Trees?'
    })
  });

  const apiRes = await pipelineRouteHandler(apiReq);
  const apiData = await apiRes.json();
  assert(apiData.success === true, 'API /api/pipeline returns success=true');
  assert(apiData.stages && apiData.stages.embed && apiData.stages.retrieve, 'API returns complete 9-stage telemetry');
  assert(apiData.answer.toLowerCase().includes('fanout') || apiData.answer.includes('100') || apiData.answer.includes('log'), 'API returned grounded B+ Tree answer');
  console.log(`     API Latency: ${apiData.pipelineLatencyMs}ms\n`);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('====================================================================');
  console.log(`📊 END-TO-END RAG TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🎉 COMPLETE 9-STAGE RAG ARCHITECTURE TESTED & VERIFIED 100%!');
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED!`);
  }
  console.log('====================================================================\n');
}

runCompletePipelineTestSuite().catch((err) => {
  console.error('Fatal error in pipeline test suite:', err);
  process.exit(1);
});
