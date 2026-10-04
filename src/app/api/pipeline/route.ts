import { NextResponse } from 'next/server';
import { executeCompleteEndToEndRagPipeline } from '@/lib/rag';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let question = '';
    let pdfBuffer: Buffer | undefined;
    let filename = 'class_notes.pdf';
    let title = 'Class Notes';
    let rawText: string | undefined;

    // Handle multipart/form-data upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      question = (formData.get('question') as string) || '';
      title = (formData.get('title') as string) || title;

      const file = (formData.get('file') || formData.get('pdf')) as File | null;
      if (file) {
        filename = file.name || filename;
        const arrayBuf = await file.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuf);
      } else {
        rawText = (formData.get('text') as string) || undefined;
      }
    } else {
      // Handle JSON payload
      const body = await request.json();
      question = body.question || '';
      filename = body.filename || filename;
      title = body.title || title;
      rawText = body.text || body.content || undefined;

      if (body.pdfBase64) {
        pdfBuffer = Buffer.from(body.pdfBase64, 'base64');
      }
    }

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field "question".'
        },
        { status: 400 }
      );
    }

    const authUser = await getAuthUser();

    // Execute complete 9-stage RAG pipeline
    const result = await executeCompleteEndToEndRagPipeline({
      pdfBuffer,
      rawText,
      filename,
      title,
      question: question.trim(),
      userId: authUser?.userId || null
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/pipeline] Pipeline execution error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to execute end-to-end RAG pipeline.'
      },
      { status: 500 }
    );
  }
}
