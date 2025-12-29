import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/app/lib/db";
import { categories } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Fetch all categories for the user
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));

    return NextResponse.json({
      success: true,
      categories: userCategories,
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
