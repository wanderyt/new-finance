import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin, finItems, finTags, receipts, finPhotos } from "@/app/lib/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { getFinPhotos, removeProductPhotoFiles, cleanupOrphanProductPhotos } from "../../../lib/utils/fin-photo-storage";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    // Extract finId from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const finId = pathSegments[pathSegments.length - 1];

    if (!finId) {
      return badRequestResponse("Transaction ID is required");
    }

    // Fetch fin by ID
    const userFins = await db
      .select()
      .from(fin)
      .where(and(eq(fin.finId, finId), eq(fin.userId, user.userId)))
      .limit(1);

    if (userFins.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Optionally fetch line items
    const items = await db
      .select()
      .from(finItems)
      .where(eq(finItems.finId, finId));

    // Optionally fetch tags
    const tags = await db
      .select()
      .from(finTags)
      .where(eq(finTags.finId, finId));

    // Fetch receipts
    const finReceipts = await db
      .select()
      .from(receipts)
      .where(eq(receipts.finId, finId));

    return NextResponse.json({
      success: true,
      data: {
        ...userFins[0],
        items,
        tags,
        receipts: finReceipts,
        photos: getFinPhotos(finId),
      },
    });
  } catch (error) {
    console.error("Failed to fetch fin:", error);
    return serverErrorResponse("Failed to fetch transaction");
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    // Extract finId from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const finId = pathSegments[pathSegments.length - 1];

    if (!finId) {
      return badRequestResponse("Transaction ID is required");
    }

    // Get scope parameter from query string
    const scope = url.searchParams.get("scope") as "single" | "all" | null;
    if (scope !== null && scope !== "single" && scope !== "all") {
      return badRequestResponse("The delete scope is invalid");
    }

    // Verify ownership and get fin record
    const [targetFin] = await db
      .select()
      .from(fin)
      .where(and(eq(fin.finId, finId), eq(fin.userId, user.userId)))
      .limit(1);

    if (!targetFin) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const condition = targetFin.isScheduled && targetFin.scheduleRuleId && targetFin.scheduledOn && scope !== "single"
      ? and(eq(fin.scheduleRuleId, targetFin.scheduleRuleId), eq(fin.userId, user.userId), gte(fin.scheduledOn, targetFin.scheduledOn))
      : and(eq(fin.finId, finId), eq(fin.userId, user.userId));
    const storageKeys = db.transaction((transaction) => {
      const recordIds = transaction.select({ finId: fin.finId }).from(fin).where(condition);
      const photos = transaction.select({ key: finPhotos.storageKey }).from(finPhotos)
        .where(inArray(finPhotos.finId, recordIds)).all();
      transaction.delete(fin).where(condition).run();
      return photos.map((photo) => photo.key);
    });
    await removeProductPhotoFiles(storageKeys);
    await cleanupOrphanProductPhotos();

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete fin:", error);
    return serverErrorResponse("Failed to delete transaction");
  }
});
