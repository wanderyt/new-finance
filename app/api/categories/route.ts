import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { categories } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth, serverErrorResponse } from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    // Fetch all categories for the user
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, user.userId));

    return NextResponse.json({
      success: true,
      categories: userCategories,
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return serverErrorResponse("Failed to fetch categories");
  }
});
