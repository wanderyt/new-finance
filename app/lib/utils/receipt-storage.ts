import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/app/lib/db/drizzle";
import { receipts } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";

// Derive upload directory from DATABASE_PATH
// If DATABASE_PATH is /app/db/finance.db -> use /app/db/uploads/receipts
// If DATABASE_PATH is ./db/finance.db or db/finance.db -> use db/uploads/receipts
function getUploadDir(): string {
  const dbPath = process.env.DATABASE_PATH || "db/finance.db";
  const dbDir = path.dirname(dbPath);
  return path.join(dbDir, "uploads/receipts");
}

const UPLOAD_DIR = getUploadDir();

interface ReceiptMetadata {
  merchant?: string | null;
  date?: string | null;      // ISO 8601 string
  amountCents?: number | null;
}

interface SaveReceiptParams {
  file: File;
  userId: number;
  finId: string;
  metadata?: ReceiptMetadata;
}

interface SaveReceiptResult {
  receiptId: number;
  filePath: string;
  sha256: string | null;
}

/**
 * Build a human-readable receipt filename from transaction metadata.
 * Format: {YYYYMMDD}_{sanitized_merchant}_{dollars}.{ext}
 * Falls back to {hash}.{ext} if metadata is insufficient.
 * Handles filesystem collisions by appending _{first6_of_hash}.
 */
export async function buildReceiptFileName(
  metadata: ReceiptMetadata | undefined,
  hash: string,
  ext: string,
  uploadDir: string
): Promise<string> {
  const fallback = `${hash}.${ext}`;

  if (!metadata) return fallback;

  const { merchant, date, amountCents } = metadata;

  // Require at least a date and amount for a descriptive name
  if (!date || amountCents == null) return fallback;

  // Format date as YYYYMMDD
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return fallback;
  const datePart = parsedDate.toISOString().slice(0, 10).replace(/-/g, "");

  // Sanitize merchant: lowercase, non-alphanumeric → _, collapse multiples, max 30 chars
  const rawMerchant = (merchant || "").trim();
  const merchantPart = rawMerchant.length > 0
    ? rawMerchant
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 30) || "unknown"
    : "unknown";

  // Format amount as dollars with 2 decimal places
  const dollars = (amountCents / 100).toFixed(2);

  const baseName = `${datePart}_${merchantPart}_${dollars}`;
  const candidate = `${baseName}.${ext}`;
  const candidatePath = path.join(uploadDir, candidate);

  // Check for collision: another file with the same descriptive name but different content
  try {
    await fs.access(candidatePath);
    // File exists — check if it's the same content via hash comparison
    const existing = await fs.readFile(candidatePath);
    const existingHash = createHash("sha256").update(existing).digest("hex");
    if (existingHash === hash) {
      // Same content — safe to reuse the descriptive name
      return candidate;
    }
    // Different content — append short hash to avoid collision
    return `${baseName}_${hash.slice(0, 6)}.${ext}`;
  } catch {
    // File doesn't exist — no collision, use descriptive name
    return candidate;
  }
}

export async function saveReceipt(
  params: SaveReceiptParams
): Promise<SaveReceiptResult> {
  const { file, userId, finId, metadata } = params;

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Calculate SHA256 hash
  const hash = createHash("sha256").update(buffer).digest("hex");

  // Dedup: check if this exact file content already exists in the DB
  const [existingByHash] = await db
    .select()
    .from(receipts)
    .where(eq(receipts.sha256, hash))
    .limit(1);

  if (existingByHash) {
    // Same file content already stored — insert a new receipt record pointing to the same file
    console.log(`Receipt file already exists (dedup): ${existingByHash.filePath}`);
    const [receipt] = await db
      .insert(receipts)
      .values({
        userId,
        finId,
        filePath: existingByHash.filePath,
        mimeType: file.type,
        sha256: hash,
        uploadedAt: new Date().toISOString(),
      })
      .returning();
    return { receiptId: receipt.receiptId, filePath: receipt.filePath, sha256: receipt.sha256 };
  }

  // New file — determine filename
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = await buildReceiptFileName(metadata, hash, ext, UPLOAD_DIR);
  const filePath = path.join(UPLOAD_DIR, fileName);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(filePath, buffer);
  console.log(`Saved receipt file: ${filePath}`);

  // Insert receipt record into database
  // Store relative path for portability between dev/prod
  const [receipt] = await db
    .insert(receipts)
    .values({
      userId,
      finId,
      filePath: `db/uploads/receipts/${fileName}`,
      mimeType: file.type,
      sha256: hash,
      uploadedAt: new Date().toISOString(),
    })
    .returning();

  return {
    receiptId: receipt.receiptId,
    filePath: receipt.filePath,
    sha256: receipt.sha256,
  };
}

export async function getReceiptsByFinId(finId: string) {
  return db.select().from(receipts).where(eq(receipts.finId, finId));
}

export async function deleteReceipt(receiptId: number) {
  const [receipt] = await db
    .select()
    .from(receipts)
    .where(eq(receipts.receiptId, receiptId))
    .limit(1);

  if (receipt) {
    // Delete from database
    await db.delete(receipts).where(eq(receipts.receiptId, receiptId));

    // Note: Not deleting the file to support deduplication
    // Multiple receipt records may reference the same file
  }
}
