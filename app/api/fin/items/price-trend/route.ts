import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { finItems, fin } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";
import { getWeek, getYear } from "date-fns";

interface WeeklyPricePoint {
  merchant: string;
  week: string; // Format: "2026-W01"
  avgPrice: number; // In dollars
  count: number; // Number of purchases in this week
}

interface PriceTrendResponse {
  itemName: string;
  data: WeeklyPricePoint[];
  merchants: string[];
}

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get("itemName");

    if (!itemName) {
      return badRequestResponse("itemName query parameter is required");
    }

    // Query: Get all purchases of this item with merchant and date
    const purchases = await db
      .select({
        merchant: fin.merchant,
        date: fin.date,
        unitPriceCents: finItems.unitPriceCents,
        originalAmountCents: finItems.originalAmountCents,
        qty: finItems.qty,
      })
      .from(finItems)
      .innerJoin(fin, eq(finItems.finId, fin.finId))
      .where(and(eq(finItems.name, itemName), eq(fin.userId, user.userId)));

    if (purchases.length === 0) {
      return NextResponse.json({
        itemName,
        data: [],
        merchants: [],
      });
    }

    // Group by merchant + ISO week, calculate average price
    const weeklyData = new Map<
      string,
      {
        merchant: string;
        week: string;
        totalPrice: number;
        count: number;
      }
    >();

    for (const purchase of purchases) {
      if (!purchase.merchant || !purchase.date) continue;

      const date = new Date(purchase.date);
      const year = getYear(date);
      const week = getWeek(date);
      const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
      const mapKey = `${purchase.merchant}|${weekKey}`;

      // Calculate price per unit (use unitPrice if available, otherwise divide total by quantity)
      let pricePerUnit: number;
      if (purchase.unitPriceCents) {
        pricePerUnit = purchase.unitPriceCents;
      } else {
        const qty = purchase.qty || 1;
        pricePerUnit = Math.round(purchase.originalAmountCents / qty);
      }

      const existing = weeklyData.get(mapKey);
      if (existing) {
        existing.totalPrice += pricePerUnit;
        existing.count += 1;
      } else {
        weeklyData.set(mapKey, {
          merchant: purchase.merchant,
          week: weekKey,
          totalPrice: pricePerUnit,
          count: 1,
        });
      }
    }

    // Convert to response format (cents → dollars)
    const data: WeeklyPricePoint[] = Array.from(weeklyData.values()).map(
      (item) => ({
        merchant: item.merchant,
        week: item.week,
        avgPrice: item.totalPrice / item.count / 100, // Convert to dollars
        count: item.count,
      })
    );

    // Sort by week
    data.sort((a, b) => a.week.localeCompare(b.week));

    // Get unique merchants
    const merchants = Array.from(new Set(data.map((d) => d.merchant)));

    return NextResponse.json({
      itemName,
      data,
      merchants,
    });
  } catch (error) {
    console.error("Failed to fetch price trend:", error);
    return serverErrorResponse("Failed to fetch price trend data");
  }
});
