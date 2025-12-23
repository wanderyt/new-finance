import { NextRequest, NextResponse } from "next/server";
import {
  findUserByUsername,
  toUserData,
  validatePassword,
} from "@/app/lib/auth/mockUsers";
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

    // Find user
    const user = findUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials",
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = validatePassword(password, user.password);
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
    const userData = toUserData(user);
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
