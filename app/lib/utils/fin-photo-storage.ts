import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/drizzle";
import { fin, finPhotos, type Fin } from "../db/schema";
import { MAX_PRODUCT_PHOTOS, MAX_PRODUCT_PHOTO_BYTES, PRODUCT_PHOTO_TYPES } from "./photo-limits";
import { buildTransactionFileBase, type TransactionFileMetadata } from "./transaction-file-name";

export class PhotoRequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type FinTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MAX_REQUEST_BYTES = 40 * 1024 * 1024;
const STORAGE_KEY = /^(?:\d{8}_[a-z0-9_]{1,30}_\d+\.\d{2}_)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function getProductPhotoPath(storageKey: string): string {
  if (!STORAGE_KEY.test(storageKey)) throw new Error("Invalid photo storage key");
  const databasePath = process.env.DATABASE_PATH || "db/finance.db";
  return path.join(path.dirname(databasePath), "uploads/product-photos", storageKey);
}

// Limit the body while reading. Content-Length alone does not limit chunked requests.
export async function parseFinPhotoRequest<T>(request: Request): Promise<{
  body: T;
  files: File[];
  removedPhotoIds: number[];
  receiptFile: File | null;
}> {
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoRequestError("Request body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new PhotoRequestError("The upload exceeds the 40 MB request limit", 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    const payload = new Response(Buffer.concat(chunks), { headers: request.headers });
    let body: unknown;
    let files: File[] = [];
    let receiptFile: File | null = null;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await payload.formData();
      const data = form.get("data");
      if (typeof data !== "string") throw new PhotoRequestError("Transaction data is required");
      body = JSON.parse(data);
      const entries = form.getAll("photos");
      if (entries.some((entry) => typeof entry === "string")) {
        throw new PhotoRequestError("Product photos must be files");
      }
      files = entries as File[];
      const receipt = form.get("receipt");
      if (typeof receipt === "string") throw new PhotoRequestError("The receipt must be a file");
      receiptFile = receipt;
    } else {
      body = await payload.json();
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new PhotoRequestError("Transaction data must be an object");
    }
    const removals = (body as { removedPhotoIds?: unknown }).removedPhotoIds ?? [];
    if (!Array.isArray(removals) || removals.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new PhotoRequestError("Photo IDs must be positive integers");
    }
    if (removals.length > MAX_PRODUCT_PHOTOS) throw new PhotoRequestError("Too many photo IDs");
    validatePhotoFiles(files);
    return { body: body as T, files, receiptFile, removedPhotoIds: [...new Set(removals as number[])] };
  } catch (error) {
    if (error instanceof PhotoRequestError) throw error;
    throw new PhotoRequestError("The transaction upload is invalid");
  }
}

export function validatePhotoFiles(files: File[]) {
  if (files.length > MAX_PRODUCT_PHOTOS) throw new PhotoRequestError("A record can contain up to six product photos");
  for (const file of files) {
    if (!PRODUCT_PHOTO_TYPES.includes(file.type)) {
      throw new PhotoRequestError("Product photos must use JPEG, PNG, or WebP");
    }
    if (file.size === 0 || file.size > MAX_PRODUCT_PHOTO_BYTES) {
      throw new PhotoRequestError("Each product photo must contain data and be 5 MB or smaller");
    }
  }
}

function imageExtension(buffer: Buffer, mimeType: string): string {
  const jpeg = buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.length >= 33 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && buffer.toString("ascii", 12, 16) === "IHDR";
  const webp = buffer.length >= 20 && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP" && buffer.readUInt32LE(4) === buffer.length - 8
    && ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16));
  if (mimeType === "image/jpeg" && jpeg) return "jpg";
  if (mimeType === "image/png" && png) return "png";
  if (mimeType === "image/webp" && webp) return "webp";
  throw new PhotoRequestError("The photo contents do not match the selected image format");
}

export function getFinPhotos(finId: string, connection: FinTransaction | typeof db = db) {
  return connection.select({
    photoId: finPhotos.photoId,
    originalName: finPhotos.originalName,
    mimeType: finPhotos.mimeType,
    sizeBytes: finPhotos.sizeBytes,
    sortOrder: finPhotos.sortOrder,
    uploadedAt: finPhotos.uploadedAt,
  }).from(finPhotos).where(eq(finPhotos.finId, finId))
    .orderBy(asc(finPhotos.sortOrder), asc(finPhotos.photoId)).all();
}

export async function removeProductPhotoFiles(storageKeys: string[]) {
  await Promise.all(storageKeys.map(async (key) => {
    try {
      await fs.unlink(getProductPhotoPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to delete a product photo file. Cleanup will retry.", error);
      }
    }
  }));
}

// Keep recent unreferenced files because another request can still be saving them.
export async function cleanupOrphanProductPhotos() {
  try {
    const directory = path.dirname(getProductPhotoPath(`${randomUUID()}.jpg`));
    const keys = await fs.readdir(directory);
    const referenced = new Set(db.select({ key: finPhotos.storageKey }).from(finPhotos).all().map((photo) => photo.key));
    for (const key of keys) {
      if (!STORAGE_KEY.test(key) || referenced.has(key)) continue;
      const stat = await fs.stat(getProductPhotoPath(key));
      if (Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000) await removeProductPhotoFiles([key]);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to retry product photo cleanup", error);
    }
  }
}

export async function saveFinWithPhotos({ finId, userId, files, removedPhotoIds, metadata, write }: {
  finId: string;
  userId: number;
  files: File[];
  removedPhotoIds: number[];
  metadata?: TransactionFileMetadata;
  write: (transaction: FinTransaction) => Fin;
}) {
  validatePhotoFiles(files);
  const staged: Array<{ storageKey: string; file: File }> = [];
  let result;
  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const extension = imageExtension(buffer, file.type);
      const baseName = buildTransactionFileBase(metadata);
      const storageKey = `${baseName ? `${baseName}_` : ""}${randomUUID()}.${extension}`;
      const filePath = getProductPhotoPath(storageKey);
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        staged.push({ storageKey, file });
        await fs.writeFile(filePath, buffer, { flag: "wx" });
      } catch (error) {
        console.error("Failed to stage a product photo", error);
        throw new PhotoRequestError("Failed to store the product photos. Please try again.", 500);
      }
    }
    result = db.transaction((transaction) => {
      const current = transaction.select().from(finPhotos).where(eq(finPhotos.finId, finId)).all();
      if (removedPhotoIds.some((id) => !current.some((photo) => photo.photoId === id))) {
        throw new PhotoRequestError("A selected photo does not belong to this record");
      }
      if (current.length - removedPhotoIds.length + staged.length > MAX_PRODUCT_PHOTOS) {
        throw new PhotoRequestError("A record can contain up to six product photos");
      }
      const record = write(transaction);
      if (record.userId !== userId || record.finId !== finId) throw new Error("Photo ownership does not match the record");
      const removed = current.filter((photo) => removedPhotoIds.includes(photo.photoId));
      for (const photo of removed) {
        transaction.delete(finPhotos).where(and(eq(finPhotos.photoId, photo.photoId), eq(finPhotos.finId, finId))).run();
      }
      const firstOrder = Math.max(-1, ...current.map((photo) => photo.sortOrder)) + 1;
      if (staged.length) {
        transaction.insert(finPhotos).values(staged.map(({ storageKey, file }, index) => ({
          finId, storageKey, originalName: file.name.slice(0, 255), mimeType: file.type,
          sizeBytes: file.size, sortOrder: firstOrder + index, uploadedAt: new Date().toISOString(),
        }))).run();
      }
      return { record, photos: getFinPhotos(finId, transaction), removedKeys: removed.map((photo) => photo.storageKey) };
    });
  } catch (error) {
    await removeProductPhotoFiles(staged.map((photo) => photo.storageKey));
    throw error;
  }
  await removeProductPhotoFiles(result.removedKeys);
  await cleanupOrphanProductPhotos();
  return { ...result.record, photos: result.photos };
}

export function getOwnedPhoto(photoId: number, userId: number) {
  return db.select({ storageKey: finPhotos.storageKey, mimeType: finPhotos.mimeType })
    .from(finPhotos).innerJoin(fin, eq(finPhotos.finId, fin.finId))
    .where(and(eq(finPhotos.photoId, photoId), eq(fin.userId, userId))).get();
}
