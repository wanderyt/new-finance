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

interface SaveReceiptParams {
  file: File;
  userId: number;
  finId: string;
}

interface SaveReceiptResult {
  receiptId: number;
  filePath: string;
  sha256: string | null;
}

export async function saveReceipt(
  params: SaveReceiptParams
): Promise<SaveReceiptResult> {
  const { file, userId, finId } = params;

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Calculate SHA256 hash
  const hash = createHash("sha256").update(buffer).digest("hex");

  // Get file extension
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${hash}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  // Check if file already exists (deduplication)
  try {
    await fs.access(filePath);
    console.log(`Receipt file already exists: ${filePath}`);
  } catch {
    // File doesn't exist, write it
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(filePath, buffer);
    console.log(`Saved receipt file: ${filePath}`);
  }

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
