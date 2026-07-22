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

// Single-user ledger: headless (non-browser) callers act as this user.
const SERVICE_USER_ID = 1;

/**
 * Look up a user row and shape it as AuthUser. Returns null if missing.
 */
async function loadUser(userId: number): Promise<AuthUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return { userId: user.userId, username: user.username };
}

/**
 * Authenticate a non-browser caller via a shared secret.
 *
 * The MCP server (finance-db) and other headless clients pass
 * `X-Api-Key: <FINANCE_MCP_KEY>` instead of a session cookie. A valid key
 * resolves to the single ledger owner (user_id = 1). Only active when
 * FINANCE_MCP_KEY is configured; keep the API bound to localhost/LAN.
 */
async function authenticateService(
  request: NextRequest
): Promise<AuthUser | null> {
  const expected = process.env.FINANCE_MCP_KEY;
  if (!expected) {
    return null;
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return null;
  }

  return loadUser(SERVICE_USER_ID);
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
    return loadUser(parseInt(payload.userId));
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
    // Prefer the shared-secret path for headless callers (MCP), then fall
    // back to the browser session cookie.
    const user = (await authenticateService(request)) ?? (await authenticateUser());
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
