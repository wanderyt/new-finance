import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin, finItems, finTags, receipts } from "@/app/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
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

    // Handle scheduled transactions based on scope
    if (targetFin.isScheduled && targetFin.scheduleRuleId) {
      if (scope === "single") {
        // Delete only this specific occurrence
        await db.delete(fin).where(eq(fin.finId, finId));
      } else {
        // Default to "all" - delete this and all future occurrences
        // Use 00:00:00 of the target transaction's date as cutoff
        const targetDate = new Date(targetFin.date);
        targetDate.setHours(0, 0, 0, 0);
        const cutoffDate = targetDate.toISOString();

        // Delete all fin records with the same schedule rule that are on or after the cutoff date
        await db.delete(fin).where(
          and(
            eq(fin.scheduleRuleId, targetFin.scheduleRuleId),
            eq(fin.userId, user.userId),
            gte(fin.date, cutoffDate)
          )
        );
      }
    } else {
      // Delete single fin (cascade will handle finItems and finTags)
      await db.delete(fin).where(eq(fin.finId, finId));
    }

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete fin:", error);
    return serverErrorResponse("Failed to delete transaction");
  }
});
