import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin } from "@/app/lib/db/schema";
import { eq, and, gte, lte, desc, or, isNull, sql } from "drizzle-orm";
import { withAuth, serverErrorResponse } from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const type = searchParams.get("type") as "expense" | "income" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query conditions
    const conditions = [eq(fin.userId, user.userId)];

    if (type) {
      conditions.push(eq(fin.type, type));
    }

    // For date filtering, check both 'date' and 'scheduledOn'
    // For scheduled transactions, use scheduledOn; for non-scheduled, use date
    if (startDate) {
      conditions.push(
        or(
          // Non-scheduled transactions: check date
          and(
            or(isNull(fin.isScheduled), eq(fin.isScheduled, false))!,
            gte(fin.date, startDate)
          ),
          // Scheduled transactions: check scheduledOn
          and(
            eq(fin.isScheduled, true),
            gte(fin.scheduledOn!, startDate)
          )
        )!
      );
    }

    if (endDate) {
      conditions.push(
        or(
          // Non-scheduled transactions: check date
          and(
            or(isNull(fin.isScheduled), eq(fin.isScheduled, false))!,
            lte(fin.date, endDate)
          ),
          // Scheduled transactions: check scheduledOn
          and(
            eq(fin.isScheduled, true),
            lte(fin.scheduledOn!, endDate)
          )
        )!
      );
    }

    // Fetch fins with filters
    // Order by scheduledOn for scheduled transactions, date for non-scheduled
    const userFins = await db
      .select()
      .from(fin)
      .where(and(...conditions))
      .orderBy(
        desc(
          sql`CASE WHEN ${fin.isScheduled} = 1 THEN ${fin.scheduledOn} ELSE ${fin.date} END`
        )
      );

    return NextResponse.json({
      success: true,
      data: userFins,
    });
  } catch (error) {
    console.error("Failed to fetch fins:", error);
    return serverErrorResponse("Failed to fetch transactions");
  }
});
