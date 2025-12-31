import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin } from "@/app/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { withAuth, serverErrorResponse } from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    // Fetch all unique merchants, places, and cities for the user
    const userFins = await db
      .select({
        merchant: fin.merchant,
        place: fin.place,
        city: fin.city,
      })
      .from(fin)
      .where(eq(fin.userId, user.userId));

    // Extract unique values
    const merchants = Array.from(
      new Set(userFins.map((f) => f.merchant).filter((m): m is string => !!m))
    ).sort();

    const places = Array.from(
      new Set(userFins.map((f) => f.place).filter((p): p is string => !!p))
    ).sort();

    const cities = Array.from(
      new Set(userFins.map((f) => f.city).filter((c): c is string => !!c))
    ).sort();

    return NextResponse.json({
      success: true,
      data: {
        merchants,
        places,
        cities,
      },
    });
  } catch (error) {
    console.error("Failed to fetch autocomplete data:", error);
    return serverErrorResponse("Failed to fetch autocomplete data");
  }
});
