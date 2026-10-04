import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';

/**
 * ============================================================================
 * GOOGLE CLOUD STORAGE (GCS) SERVER-SIDE UTILITY
 * ============================================================================
 * Manages secure, private PDF uploads, signed access URLs, and lifecycle deletions.
 * Does NOT expose credentials to the client/browser.
 */

// Read bucket name from environment variable
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';

// Singleton Storage instance
let storageInstance: Storage | null = null;

/**
 * Initializes and returns the Google Cloud Storage client instance.
 * Automatically supports:
 * 1. Google Application Default Credentials (ADC): `gcloud auth application-default login`
 * 2. GOOGLE_APPLICATION_CREDENTIALS environment variable (filepath to service-account.json)
 * 3. GCS_CREDENTIALS_JSON (inline JSON string for Vercel/container deployments)
 */
export function getStorageClient(): Storage {
  if (storageInstance) {
    return storageInstance;
  }

  // Check if credentials are provided via JSON string in environment variable (useful for Vercel/serverless)
  if (process.env.GCS_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GCS_CREDENTIALS_JSON);
      storageInstance = new Storage({
        credentials,
        projectId: credentials.project_id || process.env.GOOGLE_CLOUD_PROJECT,
      });
      return storageInstance;
    } catch (err: any) {
      console.warn('[GCS Storage] Failed to parse GCS_CREDENTIALS_JSON, falling back to ADC:', err.message);
    }
  }

  // Default: Application Default Credentials (ADC) or GOOGLE_APPLICATION_CREDENTIALS file path
  storageInstance = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });

  return storageInstance;
}

/**
 * Helper to get the target GCS Bucket reference.
 */
export function getGcsBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME || GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error(
      'GCS_BUCKET_NAME environment variable is not defined. Please set GCS_BUCKET_NAME in your .env.local file.'
    );
  }
  const storage = getStorageClient();
  return storage.bucket(bucketName);
}

/**
 * Checks whether Google Cloud Storage is configured with a bucket name.
 */
export function isGcsConfigured(): boolean {
  return Boolean(process.env.GCS_BUCKET_NAME || GCS_BUCKET_NAME);
}

export interface UploadPDFParams {
  buffer: Buffer;
  filename: string;
  userId?: string | null;
  documentId: string;
  metadata?: Record<string, string>;
}

export interface UploadPDFResult {
  storageKey: string;
  bucket: string;
  sizeBytes: number;
}

/**
 * Uploads a PDF Buffer directly to Google Cloud Storage.
 * Generates an isolated, collision-free object key:
 * `users/{userId}/{documentId}/{uuid}-{sanitizedFileName}.pdf`
 *
 * @param params - Upload parameters including binary buffer, filename, userId, documentId
 * @returns Object containing the GCS storageKey and bucket name
 */
export async function uploadPDF(params: UploadPDFParams): Promise<UploadPDFResult> {
  const { buffer, filename, userId, documentId, metadata = {} } = params;

  if (!buffer || buffer.length === 0) {
    throw new Error('Cannot upload an empty PDF buffer to Google Cloud Storage.');
  }

  const bucket = getGcsBucket();

  // Sanitize filename and construct unique storage key
  const sanitizedName = filename
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 80);

  const safeUserId = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'anonymous';
  const safeDocId = documentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueUuid = crypto.randomUUID().substring(0, 8);
  const storageKey = `users/${safeUserId}/${safeDocId}/${uniqueUuid}-${sanitizedName}.pdf`;

  const file = bucket.file(storageKey);

  // Upload the buffer to GCS with private ACL and correct MIME metadata
  await file.save(buffer, {
    contentType: 'application/pdf',
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      metadata: {
        originalFilename: filename,
        userId: userId || 'anonymous',
        documentId,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    },
  });

  return {
    storageKey,
    bucket: bucket.name,
    sizeBytes: buffer.length,
  };
}

/**
 * Generates a time-limited Signed V4 URL for securely downloading/viewing a private GCS PDF.
 *
 * @param storageKey - The GCS object path (e.g., `users/usr_123/doc_456/uuid-notes.pdf`)
 * @param expiresInMinutes - Lifetime of the signed URL (default: 15 minutes)
 * @param downloadFilename - Optional custom filename for Content-Disposition header
 */
export async function getPDFSignedUrl(
  storageKey: string,
  expiresInMinutes = 15,
  downloadFilename?: string
): Promise<string> {
  if (!storageKey) {
    throw new Error('GCS storageKey is required to generate a signed URL.');
  }

  const bucket = getGcsBucket();
  const file = bucket.file(storageKey);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    responseDisposition: downloadFilename
      ? `inline; filename="${downloadFilename.replace(/"/g, '')}"`
      : undefined,
  });

  return url;
}

/**
 * Downloads a stored PDF from Google Cloud Storage into a Buffer.
 * Useful for server-side PDF processing or verification.
 *
 * @param storageKey - The GCS object path
 */
export async function downloadPDF(storageKey: string): Promise<Buffer> {
  if (!storageKey) {
    throw new Error('GCS storageKey is required to download PDF buffer.');
  }

  const bucket = getGcsBucket();
  const file = bucket.file(storageKey);

  const [buffer] = await file.download();
  return buffer;
}

/**
 * Deletes a PDF object from Google Cloud Storage.
 *
 * @param storageKey - The GCS object path
 * @returns true if deleted or object did not exist, false on unexpected error
 */
export async function deletePDF(storageKey: string): Promise<boolean> {
  if (!storageKey) {
    return false;
  }

  try {
    const bucket = getGcsBucket();
    const file = bucket.file(storageKey);

    // ignoreNotFound: true avoids throwing if the file was already removed
    await file.delete({ ignoreNotFound: true });
    return true;
  } catch (err: any) {
    console.warn(`[GCS Storage] Failed to delete GCS object "${storageKey}":`, err?.message || err);
    return false;
  }
}

/**
 * Retrieves metadata for a stored GCS PDF object.
 *
 * @param storageKey - The GCS object path
 */
export async function getPDFMetadata(storageKey: string) {
  if (!storageKey) {
    throw new Error('GCS storageKey is required to fetch metadata.');
  }

  const bucket = getGcsBucket();
  const file = bucket.file(storageKey);

  const [metadata] = await file.getMetadata();
  return {
    name: metadata.name,
    size: Number(metadata.size || 0),
    contentType: metadata.contentType,
    updated: metadata.updated,
    timeCreated: metadata.timeCreated,
    customMetadata: metadata.metadata || {},
  };
}
