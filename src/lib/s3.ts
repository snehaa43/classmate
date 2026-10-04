import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the AWS S3 client instance
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

export interface PresignedUrlParams {
  filename: string;
  contentType?: string;
  folder?: string;
  expiresIn?: number; // In seconds (default: 900 = 15 minutes)
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  bucket: string;
  region: string;
  fileUrl: string;
}

/**
 * Generates an Amazon S3 presigned PUT URL allowing the client browser
 * to upload a PDF directly to the specified S3 bucket.
 */
export async function getPresignedUploadUrl({
  filename,
  contentType = 'application/pdf',
  folder = 'pdfs',
  expiresIn = 900,
}: PresignedUrlParams): Promise<PresignedUrlResult> {
  if (!S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not defined.');
  }

  // Clean filename: remove illegal chars and spaces
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const key = `${folder}/${timestamp}_${randomSuffix}_${cleanFilename}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    // Add custom metadata
    Metadata: {
      originalName: filename,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Generate the presigned URL
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  const region = process.env.AWS_REGION || 'us-east-1';
  const fileUrl = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    bucket: S3_BUCKET_NAME,
    region,
    fileUrl,
  };
}

/**
 * Generates a time-limited Presigned GET URL for securely downloading/viewing a private S3 object
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600, // 1 hour
  downloadFilename?: string
): Promise<string> {
  if (!S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not defined.');
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: downloadFilename
      ? `attachment; filename="${downloadFilename}"`
      : undefined,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Deletes a file from the S3 bucket
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  if (!S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not defined.');
  }

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Downloads a file buffer from S3 for server-side processing
 */
export async function getFileBufferFromS3(key: string): Promise<Buffer> {
  if (!S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not defined.');
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body as any;
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
