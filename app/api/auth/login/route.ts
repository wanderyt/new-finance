import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSessionToken } from "@/app/lib/auth/session";
import {
  LoginRequest,
  LoginResponse,
  ErrorResponse,
} from "@/app/lib/types/api";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Username and password are required",
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Find user in database using Drizzle (type-safe)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials",
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Verify password (plain text comparison for testing only)
    const isValidPassword = password === user.password;
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials",
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Generate session token
    const userData = {
      id: user.userId.toString(),
      username: user.username,
      email: `${user.username}@demo.local`, // Placeholder email for testing
    };
    const token = createSessionToken(userData);

    // Create response with user data
    const response = NextResponse.json(
      {
        success: true,
        user: userData,
      } as LoginResponse,
      { status: 200 }
    );

    // Set cookie on response
    response.cookies.set("fin_plat", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 604800, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
