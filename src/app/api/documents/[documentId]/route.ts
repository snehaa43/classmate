import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { deletePDF } from '@/lib/storage';

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

/**
 * ============================================================================
 * GET /api/documents/[documentId]
 * ============================================================================
 * Fetches metadata and chunks for a single document with user ownership check.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const authUser = await getAuthUser().catch(() => null);

    const document = await (prisma.document as any).findUnique({
      where: { id: documentId },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            pageNumber: true,
            chunkIndex: true,
            charCount: true,
            wordCount: true,
            tokenEstimate: true,
            content: true,
            metadata: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found.' },
        { status: 404 }
      );
    }

    // Ownership check
    if (document.userId && (!authUser || authUser.userId !== document.userId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You do not have permission to view this document.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('[Document Detail Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch document details.' },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * DELETE /api/documents/[documentId]
 * ============================================================================
 * Deletes a document from both Google Cloud Storage and PostgreSQL.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const authUser = await getAuthUser().catch(() => null);

    // 1. Find document to verify existence & ownership
    const document = await (prisma.document as any).findUnique({
      where: { id: documentId },
      select: { id: true, userId: true, storageKey: true, filename: true },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found.' },
        { status: 404 }
      );
    }

    // 2. Strict Ownership Verification
    if (document.userId && (!authUser || authUser.userId !== document.userId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You cannot delete another user’s document.' },
        { status: 403 }
      );
    }

    // 3. Delete PDF from Google Cloud Storage
    let gcsDeleted = false;
    if (document.storageKey) {
      try {
        gcsDeleted = await deletePDF(document.storageKey);
      } catch (gcsErr: any) {
        console.warn('[Document Delete] GCS object delete warning:', gcsErr?.message || gcsErr);
      }
    }

    // 4. Delete Document from PostgreSQL (foreign key cascade deletes chunks)
    await (prisma.document as any).delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      success: true,
      message: `Document "${document.filename || documentId}" and stored PDF were deleted successfully.`,
      documentId,
      gcsDeleted,
    });
  } catch (error: any) {
    console.error('[Document Delete Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete document.' },
      { status: 500 }
    );
  }
}
