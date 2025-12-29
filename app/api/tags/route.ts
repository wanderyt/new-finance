import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { tags } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth, serverErrorResponse } from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    // Fetch all tags for the user
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, user.userId));

    return NextResponse.json({
      success: true,
      tags: userTags,
    });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return serverErrorResponse("Failed to fetch tags");
  }
});
