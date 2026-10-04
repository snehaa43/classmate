import { NextResponse } from 'next/server';
import { getPresignedDownloadUrl } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const { key, downloadFilename } = await request.json();

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'S3 object key is required.' },
        { status: 400 }
      );
    }

    const downloadUrl = await getPresignedDownloadUrl(key, 3600, downloadFilename);

    return NextResponse.json({
      success: true,
      downloadUrl,
    });
  } catch (error: any) {
    console.error('[Download URL Route Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate download URL.' },
      { status: 500 }
    );
  }
}
