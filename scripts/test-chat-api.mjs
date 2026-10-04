/**
 * ============================================================================
 * TEST: /api/chat ROUTE ENDPOINT
 * ============================================================================
 */

import { POST, GET } from '../src/app/api/chat/route.ts';

async function runChatTests() {
  console.log('====================================================================');
  console.log('🧪 TESTING /api/chat ROUTE (Direct & Document RAG)');
  console.log('====================================================================\n');

  // Test 1: Direct Prompt without Document
  console.log('1️⃣ Testing Direct Prompt (POST):');
  const req1 = new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Explain what a vector embedding is in simple terms.'
    })
  });
  const res1 = await POST(req1);
  const data1 = await res1.json();
  console.log('   Response Success:', data1.success);
  console.log('   Answer Preview:', (data1.answer || data1.reply || '').substring(0, 100) + '...');
  console.log('   Model Used:', data1.model);
  console.log('   Latency:', data1.latencyMs, 'ms\n');

  // Test 2: RAG Grounded Query on "finance" Document
  console.log('2️⃣ Testing Document-Grounded RAG Prompt (POST):');
  const req2 = new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'What was the Q4 total consolidated revenue?',
      documentId: 'finance'
    })
  });
  const res2 = await POST(req2);
  const data2 = await res2.json();
  console.log('   Response Success:', data2.success);
  console.log('   Document Name:', data2.document);
  console.log('   Citations Count:', data2.citations?.length || 0);
  console.log('   Answer Preview:', (data2.answer || '').substring(0, 120) + '...\n');

  // Test 3: GET /api/chat URL Parameter
  console.log('3️⃣ Testing GET /api/chat?prompt=...:');
  const req3 = new Request('http://localhost:3000/api/chat?prompt=What+is+machine+learning?');
  const res3 = await GET(req3);
  const data3 = await res3.json();
  console.log('   Response Success:', data3.success);
  console.log('   Answer Preview:', (data3.answer || '').substring(0, 100) + '...\n');

  console.log('====================================================================');
  console.log('🎉 ALL /api/chat TESTS EXECUTED SUCCESSFULLY!');
  console.log('====================================================================');
}

runChatTests().catch(console.error);
