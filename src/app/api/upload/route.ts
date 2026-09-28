import { NextResponse } from 'next/server';

// Maximum file size: 50MB
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Content-Type. Request must be multipart/form-data with a FormData body.'
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('pdf')) as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided. Please attach a PDF file with field name "file" or "pdf".'
        },
        { status: 400 }
      );
    }

    // 1. File Size Validation
    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'The uploaded file is empty (0 bytes).'
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          success: false,
          error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 50 MB.`
        },
        { status: 413 }
      );
    }

    // 2. MIME & File Extension Validation
    const isPdfMime = file.type === 'application/pdf' || file.type === '';
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');

    if (!isPdfMime && !isPdfExt) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type "${file.type}". Only PDF documents (.pdf) are permitted.`
        },
        { status: 415 }
      );
    }

    // 3. Binary Header Verification (%PDF Magic Bytes)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const header = buffer.subarray(0, 4).toString('ascii');

    if (header !== '%PDF') {
      return NextResponse.json(
        {
          success: false,
          error: 'Corrupted or invalid PDF header. The file content does not start with standard %PDF magic bytes.'
        },
        { status: 400 }
      );
    }

    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    return NextResponse.json({
      success: true,
      message: 'PDF received, validated, and stored in memory successfully.',
      file: {
        name: file.name,
        sizeBytes: file.size,
        sizeFormatted,
        type: file.type || 'application/pdf',
        lastModified: file.lastModified,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Server error occurred while processing PDF upload.'
      },
      { status: 500 }
    );
  }
}
