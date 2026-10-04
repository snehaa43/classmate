import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listStoredDocuments } from '@/lib/documentStorage';

/**
 * ============================================================================
 * GET /api/documents
 * ============================================================================
 * Lists all documents belonging to the authenticated user.
 */
export async function GET() {
  try {
    const authUser = await getAuthUser().catch(() => null);
    const userId = authUser?.userId || null;

    const documents = await listStoredDocuments(userId);

    return NextResponse.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error: any) {
    console.error('[List Documents Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to list documents.' },
      { status: 500 }
    );
  }
}
