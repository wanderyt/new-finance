import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { finItems, fin } from "@/app/lib/db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

interface AutocompleteItem {
  name: string;
  count: number; // Purchase frequency
  lastPurchased: string; // ISO date
}

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    // If query is empty, return top 10 most frequently purchased items
    // Otherwise, search for items matching the query
    const whereConditions = query && query.trim().length > 0
      ? and(like(finItems.name, `%${query}%`), eq(fin.userId, user.userId))
      : eq(fin.userId, user.userId);

    const results = await db
      .select({
        name: finItems.name,
        count: sql<number>`COUNT(*)`,
        lastPurchased: sql<string>`MAX(${fin.date})`,
      })
      .from(finItems)
      .innerJoin(fin, eq(finItems.finId, fin.finId))
      .where(whereConditions)
      .groupBy(finItems.name)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    return NextResponse.json({
      items: results,
    });
  } catch (error) {
    console.error("Failed to autocomplete items:", error);
    return serverErrorResponse("Failed to fetch autocomplete suggestions");
  }
});
