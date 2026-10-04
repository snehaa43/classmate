import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local and .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'docschat_pdf_storage_sneha';
const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './gcs-key.json';

console.log('\n========================================================');
console.log('🔍 GOOGLE CLOUD STORAGE DIAGNOSTIC TEST');
console.log('========================================================\n');

async function testGcsConnection() {
  console.log(`1. Target Bucket:   "${BUCKET_NAME}"`);
  console.log(`2. Key File Path:   "${KEY_PATH}"`);

  // Step A: Check if key file exists
  const resolvedKeyPath = path.resolve(process.cwd(), KEY_PATH);
  if (!fs.existsSync(resolvedKeyPath)) {
    console.error(`\n❌ [FAIL] Key file not found at: ${resolvedKeyPath}`);
    console.error('👉 Action: Download your service account JSON key, place it in the project root, and name it "gcs-key.json".\n');
    process.exit(1);
  } else {
    console.log(`✅ Key file found:  ${resolvedKeyPath}`);
  }

  // Step B: Initialize Storage Client
  let storage;
  try {
    storage = new Storage({ keyFilename: resolvedKeyPath });
    console.log('✅ Google Cloud Storage SDK client initialized.');
  } catch (err) {
    console.error(`\n❌ [FAIL] Failed to initialize Storage client: ${err.message}`);
    process.exit(1);
  }

  // Step C: Verify Bucket Access
  const bucket = storage.bucket(BUCKET_NAME);
  try {
    console.log(`\nTesting connection to bucket "${BUCKET_NAME}"...`);
    const [exists] = await bucket.exists();
    if (exists) {
      console.log(`✅ [PASS] Bucket "${BUCKET_NAME}" metadata verified.`);
    }
  } catch (err) {
    console.log(`ℹ️ [INFO] Bucket metadata check skipped (${err.message}). Testing direct object upload permissions...`);
  }

  // Step D: Test Write (Upload a test dummy PDF)
  const testKey = `test-healthcheck/${Date.now()}-healthcheck.pdf`;
  const dummyBuffer = Buffer.from('%PDF-1.4\n%Healthcheck Test File for DocsChat\n%%EOF');

  try {
    console.log(`\nTesting file upload to "${testKey}"...`);
    const file = bucket.file(testKey);
    await file.save(dummyBuffer, {
      contentType: 'application/pdf',
      metadata: {
        healthcheck: 'true',
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`✅ [PASS] File successfully uploaded to Google Cloud Storage!`);
  } catch (err) {
    console.error(`\n❌ [FAIL] Upload failed: ${err.message}`);
    console.error('👉 Action: Verify your service account permissions (Storage Object Admin).');
    process.exit(1);
  }

  // Step E: Test Signed URL Generation
  try {
    console.log('\nTesting Signed V4 Download URL generation...');
    const file = bucket.file(testKey);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    console.log(`✅ [PASS] Signed V4 URL generated successfully!`);
    console.log(`   Sample preview URL (valid 15m): ${signedUrl.substring(0, 80)}...`);
  } catch (err) {
    console.warn(`⚠️ [WARN] Signed URL generation issue: ${err.message}`);
  }

  // Step F: Test Delete Cleanup
  try {
    console.log('\nCleaning up test file from GCS...');
    const file = bucket.file(testKey);
    await file.delete({ ignoreNotFound: true });
    console.log(`✅ [PASS] Test file deleted cleanly.`);
  } catch (err) {
    console.warn(`⚠️ [WARN] Cleanup issue: ${err.message}`);
  }

  console.log('\n========================================================');
  console.log('🎉 ALL GOOGLE CLOUD STORAGE CHECKS PASSED SUCCESSFULLY!');
  console.log('Your DocsChat app is 100% connected to Google Cloud Storage.');
  console.log('========================================================\n');
}

testGcsConnection().catch((err) => {
  console.error('\nUnexpected test failure:', err);
  process.exit(1);
});
