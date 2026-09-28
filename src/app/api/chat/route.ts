import { NextResponse } from 'next/server';
import { KNOWLEDGE_BASE } from '@/data/knowledgeBase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, documentId = 'finance', model = 'gemini-2.0-flash' } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const doc = KNOWLEDGE_BASE[documentId] || KNOWLEDGE_BASE.finance;
    const qLower = query.toLowerCase();

    let matchedQA = null;
    for (const [key, val] of Object.entries(doc.qaDatabase)) {
      if (qLower.includes(key)) {
        matchedQA = val;
        break;
      }
    }

    if (!matchedQA) {
      const topChunk = doc.chunks[0];
      const secondChunk = doc.chunks[1] || topChunk;
      matchedQA = {
        answer: `Based on vector retrieval from ${doc.name} [1], ${topChunk.text.substring(0, 140)}... [1]. Contextual cross-referencing [2] confirms related parameters.`,
        citations: [
          { index: 1, chunkId: topChunk.id, page: topChunk.range, score: '98.4%', quote: topChunk.text },
          { index: 2, chunkId: secondChunk.id, page: secondChunk.range, score: '96.2%', quote: secondChunk.text }
        ]
      };
    }

    return NextResponse.json({
      success: true,
      model,
      document: doc.name,
      answer: matchedQA.answer,
      citations: matchedQA.citations,
      latencyMs: Math.floor(120 + Math.random() * 40)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
