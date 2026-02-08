import { NextResponse } from "next/server";
import {
  getAllPocketMoney,
  calculateBalance,
} from "@/app/lib/db/pocketMoney";
import type { PocketMoneyListResponse } from "@/app/lib/types/api";
import {
  withAuth,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

// Robin's person_id is hardcoded to 1
const ROBIN_PERSON_ID = 1;

export const GET = withAuth(async (request, user) => {
  try {
    // Fetch all pocket money transactions for Robin
    const transactions = await getAllPocketMoney(ROBIN_PERSON_ID);

    // Calculate current balance
    const balance = await calculateBalance(ROBIN_PERSON_ID);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        balance,
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
