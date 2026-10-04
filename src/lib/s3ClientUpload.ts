export interface UploadProgressCallback {
  (progressPercent: number, loadedBytes: number, totalBytes: number): void;
}

export interface S3UploadResult {
  success: boolean;
  key: string;
  fileUrl: string;
  bucket: string;
  region: string;
  filename: string;
  size: number;
}

/**
 * Uploads a PDF file directly from the browser to AWS S3 using a Presigned URL.
 *
 * @param file - The PDF File object selected by the user.
 * @param onProgress - Optional callback to receive upload progress percentage (0 - 100).
 * @returns Object containing the uploaded S3 key, URL, and metadata.
 */
export async function uploadPdfToS3Direct(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<S3UploadResult> {
  // Step 1: Request Presigned URL from Next.js server
  const presignedResponse = await fetch('/api/s3/presigned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/pdf',
    }),
  });

  const responseJson = await presignedResponse.json();

  if (!presignedResponse.ok || !responseJson.success) {
    throw new Error(
      responseJson.error || `Failed to obtain presigned upload URL (Status: ${presignedResponse.status})`
    );
  }

  const { uploadUrl, key, fileUrl, bucket, region } = responseJson.data;

  // Step 2: Upload directly to S3 using XMLHttpRequest for progress tracking
  return new Promise<S3UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');

    // Track upload progress
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100, file.size, file.size);
        resolve({
          success: true,
          key,
          fileUrl,
          bucket,
          region,
          filename: file.name,
          size: file.size,
        });
      } else {
        reject(
          new Error(
            `AWS S3 direct upload failed with status ${xhr.status}: ${xhr.statusText || 'Check bucket CORS settings'}`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Network error during S3 upload. Make sure S3 CORS (Cross-Origin Resource Sharing) is configured on your bucket.'
        )
      );
    };

    xhr.ontimeout = () => {
      reject(new Error('S3 upload timed out. Please try again.'));
    };

    xhr.send(file);
  });
}
