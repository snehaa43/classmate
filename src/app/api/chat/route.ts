import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { executeGroundedRag, NO_INFO_MESSAGE } from '@/lib/rag';

/**
 * ============================================================================
 * POST /api/chat
 * ============================================================================
 * Authenticated RAG Question Answering Route:
 * 1. Validates incoming question
 * 2. Identifies authenticated user session
 * 3. Verifies document ownership
 * 4. Generates query embedding & searches pgvector
 * 5. Injects retrieved context into prompt
 * 6. Invokes Gemini LLM
 * 7. Returns grounded answer with sources and pipeline steps
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = body.question || body.prompt || body.message || body.query;
    const documentId = body.documentId || undefined;
    const model = body.model || 'gemini-3.8-flash';

    // 1. Validation: Ensure a question was provided
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Question parameter is required and must be a non-empty string.'
        },
        { status: 400 }
      );
    }

    // 2. Identify Authenticated User (from session cookie)
    const authUser = await getAuthUser();
    const userId = authUser ? authUser.userId : null;

    // 3. Execute Complete Grounded RAG Pipeline
    const ragResult = await executeGroundedRag({
      question: question.trim(),
      documentId,
      userId,
      model
    });

    if (!ragResult.success && ragResult.error === 'Forbidden document access') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: You do not have permission to query this document.',
          answer: 'Access denied: You do not have permission to query this document.',
          sources: []
        },
        { status: 403 }
      );
    }

    // 4. Return standard JSON response matching specification
    return NextResponse.json({
      success: true,
      question: ragResult.question,
      answer: ragResult.answer,
      document: ragResult.documentTitle,
      documentId: ragResult.documentId,
      sources: ragResult.sources,
      citations: ragResult.citations,
      pipeline: ragResult.pipeline,
      model: ragResult.model
    });
  } catch (error: any) {
    console.error('[API /api/chat Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An internal server error occurred while processing the RAG chat request.',
        answer: NO_INFO_MESSAGE,
        sources: []
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * GET /api/chat
 * ============================================================================
 * Allows querying via URL query parameters for fast testing:
 * ?question=...&documentId=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get('question') || searchParams.get('prompt') || searchParams.get('query') || searchParams.get('q');
  const documentId = searchParams.get('documentId') || searchParams.get('docId') || undefined;
  const model = searchParams.get('model') || 'gemini-3.8-flash';

  if (!question) {
    return NextResponse.json(
      {
        success: false,
        error: 'Please provide a question in the URL parameter "?question=..." or "?q=..."'
      },
      { status: 400 }
    );
  }

  const mockPostRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, documentId, model })
  });

  return POST(mockPostRequest);
}
