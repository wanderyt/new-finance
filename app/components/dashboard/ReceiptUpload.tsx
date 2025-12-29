"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ReceiptUploadProps {
  onFileSelect: (file: File) => void;
  onAnalyze?: (file: File) => Promise<void>;
  isAnalyzing?: boolean;
  label?: string;
  className?: string;
}

const ReceiptUpload = ({
  onFileSelect,
  onAnalyze,
  isAnalyzing = false,
  label = "Receipt",
  className = "",
}: ReceiptUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setFileName(file.name);
    onFileSelect(file);

    // Auto-analyze if handler provided
    if (onAnalyze) {
      onAnalyze(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-lg p-8
            transition-all cursor-pointer
            ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
            }
          `}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <svg
              className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              PNG, JPG, JPEG up to 10MB
            </p>
          </div>
        </div>
      ) : (
        <div className="relative border border-zinc-300 dark:border-zinc-600 rounded-lg p-4">
          {isAnalyzing && (
            <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center rounded-lg z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-2"></div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Analyzing receipt...
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <img
              src={preview}
              alt="Receipt preview"
              className="w-24 h-24 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                {fileName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Receipt uploaded successfully
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
              aria-label="Remove receipt"
            >
              <svg
                className="w-5 h-5 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptUpload;
