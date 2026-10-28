"use client";

import { useEffect, useRef, useState } from "react";
import Button from "../ui-kit/Button";
import ImageViewer from "../ui-kit/ImageViewer";
import type { FinPhotoData } from "../../lib/types/api";
import { MAX_PRODUCT_PHOTOS, MAX_PRODUCT_PHOTO_BYTES, PRODUCT_PHOTO_TYPES } from "../../lib/utils/photo-limits";

interface ProductPhotosProps {
  photos: FinPhotoData[];
  files: File[];
  removedPhotoIds: number[];
  onFilesChange: (files: File[]) => void;
  onRemovePhoto: (photoId: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadError?: boolean;
  onRetry: () => void;
}

export default function ProductPhotos({ photos, files, removedPhotoIds, onFilesChange, onRemovePhoto,
  disabled, isLoading, loadError, onRetry }: ProductPhotosProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<Array<{ src: string; alt: string }>>([]);
  const [selected, setSelected] = useState<{ src: string; alt: string } | null>(null);
  const visible = photos.filter((photo) => !removedPhotoIds.includes(photo.photoId));
  const count = visible.length + files.length;

  useEffect(() => {
    const next = files.map((file) => ({ src: URL.createObjectURL(file), alt: file.name || "商品照片" }));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser resources with selected files.
    setPreviews(next);
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.src));
  }, [files]);

  const selectFiles = (selectedFiles: File[]) => {
    setError("");
    if (count + selectedFiles.length > MAX_PRODUCT_PHOTOS) {
      setError("每条记录最多添加 6 张商品照片。");
      return;
    }
    if (selectedFiles.some((file) => !PRODUCT_PHOTO_TYPES.includes(file.type))) {
      setError("请选择 JPEG、PNG 或 WebP 照片。HEIC 照片需要先转换格式。");
      return;
    }
    if (selectedFiles.some((file) => file.size === 0 || file.size > MAX_PRODUCT_PHOTO_BYTES)) {
      setError("每张照片不能为空，且不能超过 5 MB。");
      return;
    }
    onFilesChange([...files, ...selectedFiles]);
  };

  return (
    <section aria-label="商品照片" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          商品照片（可选）{count > 0 && ` · ${count}/${MAX_PRODUCT_PHOTOS}`}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}
          disabled={disabled || isLoading || loadError || count >= MAX_PRODUCT_PHOTOS}>
          添加商品照片
        </Button>
      </div>
      <input ref={input} type="file" multiple accept={PRODUCT_PHOTO_TYPES.join(",")}
        aria-label="选择商品照片" className="hidden" disabled={disabled || isLoading || loadError}
        onChange={(event) => {
          selectFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }} />
      {isLoading && <p role="status" className="text-xs text-zinc-500">正在加载商品照片...</p>}
      {loadError && <div role="alert" className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
        商品照片加载失败。
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>重试</Button>
      </div>}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {count > 0 && <div className="grid max-w-2xl grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          ...visible.map((photo) => ({ key: `saved-${photo.photoId}`, src: `/api/fin-photos/${photo.photoId}`,
            alt: photo.originalName || "商品照片", pending: false, remove: () => onRemovePhoto(photo.photoId) })),
          ...previews.map((preview, index) => ({ ...preview, key: preview.src, pending: true,
            remove: () => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index)) })),
        ].map((photo) => <div key={photo.key} className="relative">
          <button type="button" onClick={() => setSelected(photo)} aria-label={`查看 ${photo.alt}`}
            className="block aspect-square w-full overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-600 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full object-cover" />
          </button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}
            aria-label={`移除 ${photo.alt}`} onClick={() => { setError(""); photo.remove(); }}
            className="group absolute right-0 top-0 flex h-11 w-11 items-center justify-center !rounded-full !bg-transparent !p-2.5 focus-visible:ring-2 focus-visible:ring-blue-500">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-colors group-hover:bg-black/80">
              <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </span>
          </Button>
          {photo.pending && <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[10px] text-white">待保存</span>}
        </div>)}
      </div>}
      {count > 0 && <p className="text-[10px] text-zinc-500 dark:text-zinc-400">照片的添加和移除会在保存记录后生效。</p>}
      {selected && <ImageViewer src={selected.src} alt={selected.alt} onClose={() => setSelected(null)} />}
    </section>
  );
}
