import { NextResponse } from 'next/server';
import { tempPdfStore } from '@/lib/pdfParser';

/**
 * ACTION: GET Endpoint to Retrieve Stored Extracted PDF by ID
 * Allows client or tests to inspect temporarily cached page text
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = tempPdfStore.get(id);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: `Document with ID "${id}" was not found or has expired from temporary memory.`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error fetching stored document.'
      },
      { status: 500 }
    );
  }
}
