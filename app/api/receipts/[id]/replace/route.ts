import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { db } from "@/app/lib/db/drizzle";
import { receipts } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

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

    // Get file extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${hash}.${ext}`;
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, fileName);

    // Check if file already exists (deduplication)
    try {
      await fs.access(filePath);
      console.log(`Receipt file already exists: ${filePath}`);
    } catch {
      // File doesn't exist, write it
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(filePath, buffer);
      console.log(`Saved receipt file: ${filePath}`);
    }

    // Delete old file if different from new one
    const oldFileName = path.basename(existingReceipt.filePath);
    const oldFilePath = path.join(uploadDir, oldFileName);

    if (oldFileName !== fileName && existingReceipt.sha256) {
      try {
        // Check if old file is used by other receipts before deleting
        const otherReceipts = await db
          .select()
          .from(receipts)
          .where(eq(receipts.filePath, existingReceipt.filePath))
          .limit(2); // Get up to 2 to check if more than one exists

        // Only delete if this is the only receipt using this file
        if (otherReceipts.length === 1 && otherReceipts[0].receiptId === receiptId) {
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
        filePath: `db/uploads/receipts/${fileName}`,
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
