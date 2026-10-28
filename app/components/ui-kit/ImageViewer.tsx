"use client";

import { useEffect, useRef } from "react";
import Button from "./Button";

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={alt}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-xl bg-white p-4 text-zinc-900 shadow-xl backdrop:bg-black/70 dark:bg-zinc-800 dark:text-zinc-50"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{alt}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>关闭</Button>
      </div>
      {/* Authenticated URLs and local previews require the original image source. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="mx-auto max-h-[70dvh] w-full object-contain" />
    </dialog>
  );
}
