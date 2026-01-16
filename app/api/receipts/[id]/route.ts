import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/app/lib/db/drizzle";
import { receipts } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    // Extract receipt ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const receiptId = parseInt(pathSegments[pathSegments.length - 1]);

    if (!receiptId || isNaN(receiptId)) {
      return badRequestResponse("Receipt ID is required");
    }

    // Fetch receipt by ID and verify ownership
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.receiptId, receiptId), eq(receipts.userId, user.userId)))
      .limit(1);

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Receipt not found" },
        { status: 404 }
      );
    }

    // Resolve file path based on DATABASE_PATH
    const dbPath = process.env.DATABASE_PATH || "db/finance.db";
    const dbDir = path.dirname(dbPath);

    // Receipt filePath is stored as relative path (e.g., "db/uploads/receipts/abc123.jpg")
    // Convert to absolute path
    let absolutePath: string;
    if (path.isAbsolute(receipt.filePath)) {
      absolutePath = receipt.filePath;
    } else {
      // For relative paths, resolve from project root
      absolutePath = path.join(process.cwd(), receipt.filePath);
    }

    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      // Try alternative path using dbDir
      const fileName = path.basename(receipt.filePath);
      absolutePath = path.join(dbDir, "uploads/receipts", fileName);

      try {
        await fs.access(absolutePath);
      } catch {
        return NextResponse.json(
          { success: false, error: "Receipt file not found" },
          { status: 404 }
        );
      }
    }

    // Read file
    const fileBuffer = await fs.readFile(absolutePath);

    // Return image with appropriate content type
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": receipt.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve receipt:", error);
    return serverErrorResponse("Failed to serve receipt image");
  }
});
