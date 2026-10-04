'use client';

import React, { useState, useRef } from 'react';
import { uploadPdfToS3Direct, S3UploadResult } from '@/lib/s3ClientUpload';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2, Download, ExternalLink } from 'lucide-react';

export default function S3PdfUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<S3UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are supported.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
      setResult(null);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      const res = await uploadPdfToS3Direct(file, (percent) => {
        setProgress(percent);
      });

      setResult(res);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleGetSecureDownload = async () => {
    if (!result?.key) return;

    try {
      setDownloadingUrl(true);
      const res = await fetch('/api/s3/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: result.key, downloadFilename: result.filename }),
      });

      const data = await res.json();
      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert(data.error || 'Failed to generate download link');
      }
    } catch (e: any) {
      alert('Error fetching secure URL: ' + e.message);
    } finally {
      setDownloadingUrl(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Direct S3 PDF Uploader</h3>
          <p className="text-xs text-slate-400">Uploads directly from your browser to Amazon S3 via Presigned URL</p>
        </div>
      </div>

      {/* Dropzone / File Selector */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          file
            ? 'border-indigo-500/50 bg-indigo-950/20'
            : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          {file ? (
            <>
              <FileText className="w-10 h-10 text-indigo-400 animate-pulse" />
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-10 h-10 text-slate-400 mb-1" />
              <p className="text-sm font-medium text-slate-300">
                Click to browse or drop your PDF here
              </p>
              <p className="text-xs text-slate-500">Supports PDF files up to 100MB</p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Uploading to Amazon S3...</span>
            <span className="font-mono text-indigo-400 font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full transition-all duration-150 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2.5 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-5">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading to S3 ({progress}%)...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Upload PDF to S3
            </>
          )}
        </button>
      </div>

      {/* Success Result Box */}
      {result && (
        <div className="mt-5 p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Uploaded Successfully to AWS S3!</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Bucket:</span>
              <span className="font-mono text-white">{result.bucket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Region:</span>
              <span className="font-mono text-white">{result.region}</span>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
              <span className="text-slate-400">S3 Object Key:</span>
              <span className="font-mono text-slate-200 text-[11px] break-all bg-slate-950/60 p-1.5 rounded">
                {result.key}
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={handleGetSecureDownload}
              disabled={downloadingUrl}
              className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
            >
              {downloadingUrl ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              Download / View File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
