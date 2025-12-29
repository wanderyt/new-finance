import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/app/lib/db";
import { tags } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Fetch all tags for the user
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId));

    return NextResponse.json({
      success: true,
      tags: userTags,
    });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
