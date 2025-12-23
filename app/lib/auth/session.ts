import { SessionPayload, UserData } from "../types/api";
import { cookies } from "next/headers";

const COOKIE_NAME = "fin_plat";
const COOKIE_MAX_AGE = 604800; // 7 days in seconds
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Get cookie configuration based on environment
export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION, // HTTPS only in production
    sameSite: (IS_PRODUCTION ? "strict" : "lax") as "strict" | "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

// Create session token from user data (simple Base64 encoding for mock)
export function createSessionToken(user: UserData): string {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    createdAt: Date.now(),
  };

  // Simple Base64 encoding for mock (in production, use JWT)
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// Verify and decode session token
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    // Simple Base64 decoding for mock (in production, verify JWT signature)
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));

    // Check if session is expired (7 days)
    const now = Date.now();
    const sessionAge = now - payload.createdAt;
    const maxAge = COOKIE_MAX_AGE * 1000; // Convert to milliseconds

    if (sessionAge > maxAge) {
      return null; // Session expired
    }

    return payload as SessionPayload;
  } catch (error) {
    // Invalid token format
    return null;
  }
}

// Set authentication cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, getCookieOptions());
}

// Get authentication cookie
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// Clear authentication cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
}
