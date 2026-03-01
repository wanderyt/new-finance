import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { db } from "@/app/lib/db/drizzle";
import { receipts, fin } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";
import { buildReceiptFileName } from "@/app/lib/utils/receipt-storage";

// Derive upload directory from DATABASE_PATH
function getUploadDir(): string {
  const dbPath = process.env.DATABASE_PATH || "db/finance.db";
  const dbDir = path.dirname(dbPath);
  return path.join(dbDir, "uploads/receipts");
}

export const PUT = withAuth(async (request, user) => {
  try {
    // Extract receipt ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const receiptId = parseInt(pathSegments[pathSegments.length - 2]); // -2 because of /replace

    if (!receiptId || isNaN(receiptId)) {
      return badRequestResponse("Receipt ID is required");
    }

    // Fetch receipt by ID and verify ownership
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.receiptId, receiptId), eq(receipts.userId, user.userId)))
      .limit(1);

    if (!existingReceipt) {
      return NextResponse.json(
        { success: false, error: "Receipt not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("receipt") as File | null;

    if (!file) {
      return badRequestResponse("Receipt file is required");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return badRequestResponse("File must be an image");
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate SHA256 hash
    const hash = createHash("sha256").update(buffer).digest("hex");

    const uploadDir = getUploadDir();

    // Dedup: check if this exact file content already exists in the DB
    const [existingByHash] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.sha256, hash))
      .limit(1);

    let newFilePath: string;

    if (existingByHash) {
      // Same content already stored — reuse existing file path
      console.log(`Receipt file already exists (dedup): ${existingByHash.filePath}`);
      newFilePath = existingByHash.filePath;
    } else {
      // Look up associated fin record to get metadata for descriptive naming
      let metadata: { merchant?: string | null; date?: string | null; amountCents?: number | null } | undefined;
      if (existingReceipt.finId) {
        const [finRecord] = await db
          .select({ merchant: fin.merchant, date: fin.date, amountCents: fin.originalAmountCents })
          .from(fin)
          .where(eq(fin.finId, existingReceipt.finId))
          .limit(1);
        if (finRecord) {
          metadata = {
            merchant: finRecord.merchant,
            date: finRecord.date,
            amountCents: finRecord.amountCents,
          };
        }
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = await buildReceiptFileName(metadata, hash, ext, uploadDir);
      const filePath = path.join(uploadDir, fileName);

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(filePath, buffer);
      console.log(`Saved replacement receipt file: ${filePath}`);

      newFilePath = `db/uploads/receipts/${fileName}`;
    }

    // Delete old file if it's different from the new one and not referenced by other receipts
    const oldFileName = path.basename(existingReceipt.filePath);
    const newFileName = path.basename(newFilePath);

    if (oldFileName !== newFileName && existingReceipt.sha256) {
      try {
        const otherReceipts = await db
          .select()
          .from(receipts)
          .where(eq(receipts.filePath, existingReceipt.filePath))
          .limit(2);

        if (otherReceipts.length === 1 && otherReceipts[0].receiptId === receiptId) {
          const oldFilePath = path.join(uploadDir, oldFileName);
          await fs.unlink(oldFilePath);
          console.log(`Deleted old receipt file: ${oldFilePath}`);
        }
      } catch (error) {
        console.error("Failed to delete old receipt file:", error);
        // Continue anyway - not critical
      }
    }

    // Update receipt record in database
    const [updatedReceipt] = await db
      .update(receipts)
      .set({
        filePath: newFilePath,
        mimeType: file.type,
        sha256: hash,
        uploadedAt: new Date().toISOString(),
      })
      .where(eq(receipts.receiptId, receiptId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedReceipt,
    });
  } catch (error) {
    console.error("Failed to replace receipt:", error);
    return serverErrorResponse("Failed to replace receipt");
  }
});
