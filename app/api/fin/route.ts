import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/app/lib/db";
import { fin } from "@/app/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { authOptions } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const type = searchParams.get("type") as "expense" | "income" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query conditions
    const conditions = [eq(fin.userId, userId)];

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
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
