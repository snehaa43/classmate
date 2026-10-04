import { NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/s3';
import { getAuthUser } from '@/lib/auth';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, contentType = 'application/pdf', fileSize } = body;

    // 1. Validate input parameters
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Filename is required and must be a string.' },
        { status: 400 }
      );
    }

    if (!filename.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Only PDF files (.pdf) are allowed.' },
        { status: 400 }
      );
    }

    // 2. Validate file size if provided
    if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
        },
        { status: 413 }
      );
    }

    // 3. (Optional) Check authentication if user is logged in
    const authUser = await getAuthUser().catch(() => null);
    const folder = authUser ? `users/${authUser.userId}/pdfs` : 'uploads/pdfs';

    // 4. Generate Presigned URL
    const presignedData = await getPresignedUploadUrl({
      filename,
      contentType,
      folder,
      expiresIn: 900, // 15 minutes
    });

    return NextResponse.json({
      success: true,
      data: presignedData,
    });
  } catch (error: any) {
    console.error('[Presigned URL Route Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate S3 presigned URL.',
      },
      { status: 500 }
    );
  }
}
