import { NextResponse } from "next/server";
import { getAuthCookie, verifySessionToken } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db/drizzle";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { VerifyResponse, ErrorResponse } from "@/app/lib/types/api";

export async function GET() {
  try {
    // Get token from cookie
    const token = await getAuthCookie();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "No authentication token found",
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifySessionToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired session",
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Get user from database using Drizzle (type-safe)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, parseInt(payload.userId)))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Return user data
    const userData = {
      id: user.userId.toString(),
      username: user.username,
      email: `${user.username}@demo.local`, // Placeholder email for testing
    };

    return NextResponse.json(
      {
        success: true,
        user: userData,
      } as VerifyResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
