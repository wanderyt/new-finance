"use client";

import { useState } from "react";
import Dialog from "../ui-kit/Dialog";
import Button from "../ui-kit/Button";
import { ReceiptData } from "@/app/lib/types/api";

interface ReceiptViewerProps {
  isOpen: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
  onReupload?: (receiptId: number, file: File) => void;
}

const ReceiptViewer = ({
  isOpen,
  receipt,
  onClose,
  onReupload,
}: ReceiptViewerProps) => {
  const [isReuploading, setIsReuploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !receipt || !onReupload) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    setIsReuploading(true);
    try {
      await onReupload(receipt.receiptId, file);
      onClose();
    } catch (error) {
      console.error("Failed to reupload receipt:", error);
      alert("上传失败，请重试");
    } finally {
      setIsReuploading(false);
    }
  };

  if (!receipt) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="查看小票"
      className="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Receipt Image */}
        <div className="relative bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
          <img
            src={`/api/receipts/${receipt.receiptId}`}
            alt="Receipt"
            className="w-full h-auto max-h-[70vh] object-contain"
            onError={(e) => {
              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor'%3E%3Cpath d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'/%3E%3C/svg%3E";
            }}
          />
        </div>

        {/* Receipt Info */}
        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span>
            上传时间: {new Date(receipt.uploadedAt).toLocaleString("zh-CN")}
          </span>
          {receipt.mimeType && (
            <span className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700">
              {receipt.mimeType.split("/")[1]?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            关闭
          </Button>

          {onReupload && (
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isReuploading}
                className="hidden"
              />
              <div className="w-full">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isReuploading}
                  className="w-full pointer-events-none"
                >
                  {isReuploading ? "上传中..." : "重新上传"}
                </Button>
              </div>
            </label>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default ReceiptViewer;
