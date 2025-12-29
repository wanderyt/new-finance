import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin } from "@/app/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
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

    if (startDate) {
      conditions.push(gte(fin.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(fin.date, endDate));
    }

    // Fetch fins with filters
    const userFins = await db
      .select()
      .from(fin)
      .where(and(...conditions))
      .orderBy(desc(fin.date));

    return NextResponse.json({
      success: true,
      data: userFins,
    });
  } catch (error) {
    console.error("Failed to fetch fins:", error);
    return serverErrorResponse("Failed to fetch transactions");
  }
});
