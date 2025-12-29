import { NextRequest, NextResponse } from "next/server";
import { getAuthCookie, verifySessionToken } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db/drizzle";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { ErrorResponse } from "@/app/lib/types/api";

/**
 * Authenticated user data
 */
export interface AuthUser {
  userId: number;
  username: string;
}

/**
 * Authenticate user from cookie and return user data
 * Returns null if authentication fails
 */
async function authenticateUser(): Promise<AuthUser | null> {
  try {
    // Get token from cookie
    const token = await getAuthCookie();
    if (!token) {
      return null;
    }

    // Verify token
    const payload = verifySessionToken(token);
    if (!payload) {
      return null;
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, parseInt(payload.userId)))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      userId: user.userId,
      username: user.username,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Higher-order function that wraps route handlers with authentication
 * Automatically returns 401 response if authentication fails
 *
 * @example
 * export const POST = withAuth(async (request, user) => {
 *   // user.userId and user.username available here
 *   // No manual auth checks needed
 * });
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await authenticateUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        } as ErrorResponse,
        { status: 401 }
      );
    }
    return handler(request, user);
  };
}

/**
 * Return 400 Bad Request response
 */
export function badRequestResponse(message: string) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    } as ErrorResponse,
    { status: 400 }
  );
}

/**
 * Return 500 Internal Server Error response
 */
export function serverErrorResponse(message: string = "Internal server error") {
  return NextResponse.json(
    {
      success: false,
      error: message,
    } as ErrorResponse,
    { status: 500 }
  );
}
