import { NextResponse } from "next/server";
import { getAuthCookie, verifySessionToken } from "@/app/lib/auth/session";
import { findUserById, toUserData } from "@/app/lib/auth/mockUsers";
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

    // Get user from database
    const user = findUserById(payload.userId);

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
    return NextResponse.json(
      {
        success: true,
        user: toUserData(user),
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
