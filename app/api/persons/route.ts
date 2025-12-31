import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { persons } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth, serverErrorResponse } from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    // Fetch all active persons for the user
    const userPersons = await db
      .select({
        personId: persons.personId,
        name: persons.name,
        isDefault: persons.isDefault,
      })
      .from(persons)
      .where(eq(persons.userId, user.userId))
      .orderBy(persons.personId);

    // Convert isDefault from 0/1 to boolean
    const formattedPersons = userPersons.map((p) => ({
      ...p,
      isDefault: p.isDefault === 1,
    }));

    return NextResponse.json({
      success: true,
      persons: formattedPersons,
    });
  } catch (error) {
    console.error("Failed to fetch persons:", error);
    return serverErrorResponse("Failed to fetch persons");
  }
});
