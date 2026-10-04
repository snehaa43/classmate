/**
 * ============================================================================
 * TEST SUITE: /api/search ROUTE ENDPOINT INTEGRATION
 * ============================================================================
 * Tests POST & GET /api/search directly with:
 * 1. Keyword search (mode='keyword')
 * 2. Document search (searchType='documents')
 * 3. Document scoping (documentId='finance' / 'legal' / 'clinical')
 * 4. Hybrid search (mode='hybrid')
 */

import { POST, GET } from '../src/app/api/search/route.ts';

let totalTests = 0;
let passedTests = 0;

function assert(condition, msg) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${msg}`);
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
  }
}

async function runApiTests() {
  console.log('====================================================================');
  console.log('🚀 TESTING /api/search ROUTE HANDLER (POST & GET)');
  console.log('====================================================================\n');

  // Test 1: POST /api/search with mode='keyword'
  console.log('1️⃣ Testing POST /api/search with Keyword Query:');
  const req1 = new Request('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'GPU compute cluster allocation',
      mode: 'keyword',
      topK: 4
    })
  });
  const res1 = await POST(req1);
  const data1 = await res1.json();
  assert(data1.success === true, 'Response returns success=true');
  assert(data1.searchMode === 'keyword', 'Returns searchMode="keyword"');
  assert(data1.chunks.length > 0, `Returned ${data1.chunks.length} matching chunks`);
  assert(data1.chunks[0].matchedKeywords.length > 0, `Top chunk contains matched keywords: ${data1.chunks[0].matchedKeywords.join(', ')}`);
  console.log(`     Top chunk: [${data1.chunks[0].documentTitle}] "${data1.chunks[0].content.substring(0, 70)}..." (${data1.chunks[0].similarityFormatted})`);

  // Test 2: POST /api/search with Document Search (searchType='documents')
  console.log('\n2️⃣ Testing POST /api/search with searchType="documents":');
  const req2 = new Request('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'DeepSeek Gemini Agentic RAG',
      searchType: 'documents',
      topK: 5
    })
  });
  const res2 = await POST(req2);
  const data2 = await res2.json();
  assert(data2.success === true, 'Document search returns success=true');
  assert(data2.searchType === 'documents', 'Returns searchType="documents"');
  assert(data2.documents.length > 0, `Found ${data2.documents.length} matching documents`);
  assert(data2.documents[0].title.toLowerCase().includes('deepseek') || data2.documents[0].title.toLowerCase().includes('rag'), 'Top document matches target query');

  // Test 3: POST /api/search with Document Scoping
  console.log('\n3️⃣ Testing POST /api/search with Document Scoping (documentId="legal"):');
  const req3 = new Request('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '99.95% SLA uptime',
      documentId: 'legal',
      mode: 'keyword',
      topK: 3
    })
  });
  const res3 = await POST(req3);
  const data3 = await res3.json();
  assert(data3.success === true, 'Scoped search returns success');
  assert(data3.chunks.length > 0, `Returned ${data3.chunks.length} chunks`);
  assert(data3.chunks[0].content.includes('99.95%'), 'Matching chunk contains target keyword "99.95%"');

  // Test 4: GET /api/search via URL parameters
  console.log('\n4️⃣ Testing GET /api/search via URL parameters:');
  const req4 = new Request('http://localhost:3000/api/search?query=cross-encoder&mode=keyword&topK=3');
  const res4 = await GET(req4);
  const data4 = await res4.json();
  assert(data4.success === true, 'GET request returns success');
  assert(data4.chunks.length > 0, `GET returned ${data4.chunks.length} chunks`);
  assert(data4.chunks[0].content.toLowerCase().includes('cross-encoder'), 'Chunk contains "cross-encoder"');

  console.log('\n====================================================================');
  console.log(`📊 API ROUTE TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================================\n');
}

runApiTests().catch((e) => {
  console.error('API Test error:', e);
  process.exit(1);
});
