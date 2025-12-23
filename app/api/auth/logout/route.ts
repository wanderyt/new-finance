import { NextResponse } from "next/server";
import { LogoutResponse, ErrorResponse } from "@/app/lib/types/api";

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      } as LogoutResponse,
      { status: 200 }
    );

    // Clear authentication cookie on response
    response.cookies.set("fin_plat", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
