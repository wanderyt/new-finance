import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { finItems, fin } from "@/app/lib/db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import {
  withAuth,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    // Return up to 10 matching names, ordered by their latest transaction date.
    const whereConditions = and(
      eq(fin.userId, user.userId),
      sql`julianday(${fin.date}) <= julianday('now')`,
      query && query.trim().length > 0 ? like(finItems.name, `%${query}%`) : undefined,
    );

    const results = await db
      .select({
        name: finItems.name,
        count: sql<number>`COUNT(*)`,
        lastPurchased: sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', MAX(julianday(${fin.date})))`,
      })
      .from(finItems)
      .innerJoin(fin, eq(finItems.finId, fin.finId))
      .where(whereConditions)
      .groupBy(finItems.name)
      .orderBy(sql`MAX(julianday(${fin.date})) DESC`, sql`MAX(${finItems.itemId}) DESC`, finItems.name)
      .limit(10);

    return NextResponse.json({
      items: results,
    });
  } catch (error) {
    console.error("Failed to autocomplete items:", error);
    return serverErrorResponse("Failed to fetch autocomplete suggestions");
  }
});
