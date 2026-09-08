import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, X, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { extractTextFromPdf, PdfExtractionError } from '../../services/pdfExtractor';

export interface UploadedResumeMeta {
  fileName: string;
  fileSize: number;
  fileType: string;
  dataUrl?: string;
  extractedText?: string;
  file?: File;
}

interface FileUploadProps {
  resume?: UploadedResumeMeta | null;
  onFileSelect: (fileMeta: UploadedResumeMeta) => void;
  onRemove: () => void;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  resume,
  onFileSelect,
  onRemove,
  error: externalError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFile = async (file: File) => {
    setInternalError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setInternalError('Please upload a PDF document (.pdf).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setInternalError('File size exceeds the 20MB limit.');
      return;
    }

    setIsExtracting(true);

    try {
      // 1. Extract text and validate non-empty, word count >= 50
      const extracted = await extractTextFromPdf(file);

      // 2. Read as data URL for persistent offline preview
      const reader = new FileReader();
      reader.onload = () => {
        setIsExtracting(false);
        onFileSelect({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          dataUrl: reader.result as string,
          extractedText: extracted.text,
          file,
        });
      };
      reader.onerror = () => {
        setIsExtracting(false);
        setInternalError('Failed to read the file locally.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsExtracting(false);
      if (err instanceof PdfExtractionError) {
        setInternalError(err.message);
      } else {
        setInternalError(err.message || 'Failed to extract text from the PDF file.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const activeError = externalError || internalError;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
          Resume (PDF) <span className="text-rose-500">*</span>
        </label>
        <span className="text-xs text-slate-400">PDF up to 20MB</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {!resume ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isExtracting && fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
            isExtracting
              ? 'border-indigo-400 bg-indigo-50/40 cursor-wait'
              : activeError
              ? 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/50 cursor-pointer'
              : isDragging
              ? 'border-indigo-500 bg-indigo-50/50 cursor-pointer'
              : 'border-slate-200 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          {isExtracting ? (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-indigo-200">
                <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-indigo-950">
                Reading and verifying PDF resume...
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Validating extractable text and length
              </p>
            </>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 group-hover:scale-105 transition-transform">
                <UploadCloud className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-slate-800">
                <span className="text-indigo-600 font-semibold hover:underline">Click to upload your resume</span> or drag and drop
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PDF required • Resume will be stored locally with your session
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">{resume.fileName}</p>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatFileSize(resume.fileSize)} • Stored locally
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className="h-3 w-3 text-slate-500" />
                <span>Replace</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-xs h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                <span>Remove</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
};
