import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getPDFSignedUrl, downloadPDF, isGcsConfigured } from '@/lib/storage';

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

/**
 * ============================================================================
 * GET /api/documents/[documentId]/file
 * ============================================================================
 * Authenticated, secure endpoint to retrieve or view private PDF files stored in GCS.
 *
 * Query options:
 * - ?mode=url -> Returns a temporary signed V4 URL JSON
 * - ?download=true -> Triggers browser file download (attachment)
 * - default -> Streams PDF buffer directly with inline Content-Disposition
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID parameter is required.' },
        { status: 400 }
      );
    }

    // 1. Identify Authenticated User Session
    const authUser = await getAuthUser().catch(() => null);

    // 2. Fetch Document Record from PostgreSQL
    const document = await (prisma.document as any).findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        filename: true,
        storageKey: true,
        userId: true,
        mimeType: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found.' },
        { status: 404 }
      );
    }

    // 3. Strict Document Ownership Verification
    if (document.userId && (!authUser || authUser.userId !== document.userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: You do not have permission to access this document.',
        },
        { status: 403 }
      );
    }

    // 4. Verify GCS Storage Key
    if (!document.storageKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'No Google Cloud Storage file is associated with this document.',
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const isDownload = searchParams.get('download') === 'true';
    const filename = document.filename || `${document.title}.pdf`;

    // 5. Option A: Return Temporary Signed URL (valid for 15 minutes)
    if (mode === 'url') {
      const signedUrl = await getPDFSignedUrl(document.storageKey, 15, filename);
      return NextResponse.json({
        success: true,
        documentId: document.id,
        filename,
        signedUrl,
        expiresInSeconds: 900,
      });
    }

    // 6. Option B: Stream PDF Buffer Directly
    const pdfBuffer = await downloadPDF(document.storageKey);
    const dispositionType = isDownload ? 'attachment' : 'inline';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': document.mimeType || 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('[Document File Access Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to retrieve document from storage.',
      },
      { status: 500 }
    );
  }
}
