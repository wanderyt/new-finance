import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin, finItems, finTags } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

    return NextResponse.json({
      success: true,
      data: {
        ...userFins[0],
        items,
        tags,
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

    // Verify ownership
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

    // Delete fin (cascade will handle finItems and finTags)
    await db.delete(fin).where(eq(fin.finId, finId));

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete fin:", error);
    return serverErrorResponse("Failed to delete transaction");
  }
});
