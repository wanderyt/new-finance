import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { finItems, fin } from "@/app/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

interface ItemDetail {
  itemId: number;
  name: string;
  qty: number;
  unitPriceCents: number | null;
  originalAmountCents: number;
  pricePerUnit: number; // Calculated in dollars
  totalPrice: number; // In dollars
}

interface PurchaseHistoryRecord {
  finId: string;
  date: string;
  merchant: string;
  category: string;
  subcategory: string;
  type: string;
  originalCurrency: string;
  amountCadCents: number;
  comment: string | null;
  item: ItemDetail;
}

interface PurchaseHistoryResponse {
  itemName: string;
  records: PurchaseHistoryRecord[];
  hasMore: boolean;
  total: number;
}

const DEFAULT_LIMIT = 20;

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get("itemName");
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT));

    if (!itemName) {
      return badRequestResponse("itemName query parameter is required");
    }

    if (offset < 0 || limit < 1 || limit > 100) {
      return badRequestResponse("Invalid offset or limit parameters");
    }

    // First, get total count
    const allRecords = await db
      .select({
        itemId: finItems.itemId,
      })
      .from(finItems)
      .innerJoin(fin, eq(finItems.finId, fin.finId))
      .where(and(eq(finItems.name, itemName), eq(fin.userId, user.userId)));

    const total = allRecords.length;

    // Then get paginated data with full fin records
    const records = await db
      .select({
        // Fin record fields
        finId: fin.finId,
        date: fin.date,
        merchant: fin.merchant,
        category: fin.category,
        subcategory: fin.subcategory,
        type: fin.type,
        originalCurrency: fin.originalCurrency,
        amountCadCents: fin.amountCadCents,
        comment: fin.comment,

        // Item fields
        itemId: finItems.itemId,
        itemName: finItems.name,
        qty: finItems.qty,
        unitPriceCents: finItems.unitPriceCents,
        itemOriginalAmountCents: finItems.originalAmountCents,
      })
      .from(finItems)
      .innerJoin(fin, eq(finItems.finId, fin.finId))
      .where(and(eq(finItems.name, itemName), eq(fin.userId, user.userId)))
      .orderBy(desc(fin.date))
      .limit(limit)
      .offset(offset);

    // Transform data: calculate price per unit and structure response
    const purchaseHistory: PurchaseHistoryRecord[] = records.map((record) => {
      // Calculate price per unit (use unitPrice if available, otherwise divide total by quantity)
      let pricePerUnit: number;
      if (record.unitPriceCents) {
        pricePerUnit = record.unitPriceCents;
      } else {
        const qty = record.qty || 1;
        pricePerUnit = Math.round(record.itemOriginalAmountCents / qty);
      }

      return {
        finId: record.finId,
        date: record.date,
        merchant: record.merchant,
        category: record.category,
        subcategory: record.subcategory,
        type: record.type,
        originalCurrency: record.originalCurrency,
        amountCadCents: record.amountCadCents,
        comment: record.comment,
        item: {
          itemId: record.itemId,
          name: record.itemName,
          qty: record.qty || 1,
          unitPriceCents: record.unitPriceCents,
          originalAmountCents: record.itemOriginalAmountCents,
          pricePerUnit: pricePerUnit / 100, // Convert cents to dollars
          totalPrice: record.itemOriginalAmountCents / 100, // Convert cents to dollars
        },
      };
    });

    const hasMore = offset + records.length < total;

    return NextResponse.json({
      itemName,
      records: purchaseHistory,
      hasMore,
      total,
    });
  } catch (error) {
    console.error("Failed to fetch purchase history:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    return serverErrorResponse(
      `Failed to fetch purchase history: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
