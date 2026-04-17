import { NextResponse } from "next/server";
import {
  getAllPocketMoney,
  calculateBalance,
  calculateRedPocketBalance,
} from "@/app/lib/db/pocketMoney";
import type { PocketMoneyListResponse } from "@/app/lib/types/api";
import {
  withAuth,
  serverErrorResponse,
  badRequestResponse,
} from "@/app/lib/middleware/auth";

export const GET = withAuth(async (request, user) => {
  try {
    // Get personId from query parameters
    const { searchParams } = new URL(request.url);
    const personIdParam = searchParams.get("personId");

    if (!personIdParam) {
      return badRequestResponse("personId parameter is required");
    }

    const personId = parseInt(personIdParam, 10);
    if (isNaN(personId)) {
      return badRequestResponse("personId must be a valid number");
    }

    // Fetch all pocket money transactions for the specified person
    const transactions = await getAllPocketMoney(personId);

    // Calculate current balance (excluding red_pocket) and red_pocket balance separately
    const balance = await calculateBalance(personId);
    const redPocketBalance = await calculateRedPocketBalance(personId);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        balance,
        red_pocket_balance: redPocketBalance,
        transactions,
        total: transactions.length,
      } as PocketMoneyListResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("List pocket money error:", error);
    return serverErrorResponse("Internal server error");
  }
});
