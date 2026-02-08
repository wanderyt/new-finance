import { NextResponse } from "next/server";
import {
  getPocketMoneyById,
  updatePocketMoney,
  deletePocketMoney,
} from "@/app/lib/db/pocketMoney";
import type { UpdatePocketMoneyRequest } from "@/app/lib/types/api";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

/**
 * Validate date format - must be ISO 8601 with time in UTC timezone
 */
function isValidDateFormat(dateString: string): boolean {
  // Check if timezone is present (Z or +/- offset)
  if (!dateString.match(/[Z]|[+-]\d{2}:\d{2}$/)) {
    return false;
  }

  // Check if parseable by Date constructor
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export const GET = withAuth(async (request, user) => {
  try {
    // Extract pocket_money_id from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const idStr = pathSegments[pathSegments.length - 1];

    const pocketMoneyId = parseInt(idStr, 10);
    if (isNaN(pocketMoneyId)) {
      return badRequestResponse("Invalid pocket money ID");
    }

    // Fetch pocket money transaction by ID
    const transaction = await getPocketMoneyById(pocketMoneyId);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Failed to fetch pocket money transaction:", error);
    return serverErrorResponse("Failed to fetch transaction");
  }
});

export const PUT = withAuth(async (request, user) => {
  try {
    // Extract pocket_money_id from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const idStr = pathSegments[pathSegments.length - 1];

    const pocketMoneyId = parseInt(idStr, 10);
    if (isNaN(pocketMoneyId)) {
      return badRequestResponse("Invalid pocket money ID");
    }

    const body: UpdatePocketMoneyRequest = await request.json();

    // Validate transaction_type if provided
    if (
      body.transaction_type &&
      !["bonus", "deduction", "expense"].includes(body.transaction_type)
    ) {
      return badRequestResponse(
        'Field "transaction_type" must be "bonus", "deduction", or "expense"'
      );
    }

    // Validate amount_cents if provided
    if (body.amount_cents !== undefined) {
      // If transaction_type is provided, validate amount based on type
      if (body.transaction_type === "bonus" && body.amount_cents <= 0) {
        return badRequestResponse(
          'Field "amount_cents" must be positive for bonus transactions'
        );
      }
      if ((body.transaction_type === "deduction" || body.transaction_type === "expense") && body.amount_cents >= 0) {
        return badRequestResponse(
          'Field "amount_cents" must be negative for deduction and expense transactions'
        );
      }
    }

    // Validate reason if provided
    if (body.reason !== undefined && body.reason.trim().length === 0) {
      return badRequestResponse('Field "reason" cannot be empty');
    }

    // Validate transaction_date format if provided
    if (body.transaction_date && !isValidDateFormat(body.transaction_date)) {
      return badRequestResponse(
        'Field "transaction_date" must be ISO 8601 with UTC timezone (e.g., "2025-12-29T15:30:00Z")'
      );
    }

    // Update the pocket money transaction
    const updatedTransaction = await updatePocketMoney(pocketMoneyId, body);

    if (!updatedTransaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Failed to update pocket money transaction:", error);

    // Check if error is about protected transactions
    if (
      error instanceof Error &&
      error.message.includes("Automatic transactions")
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    return serverErrorResponse("Failed to update transaction");
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    // Extract pocket_money_id from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const idStr = pathSegments[pathSegments.length - 1];

    const pocketMoneyId = parseInt(idStr, 10);
    if (isNaN(pocketMoneyId)) {
      return badRequestResponse("Invalid pocket money ID");
    }

    // Delete the pocket money transaction
    const success = await deletePocketMoney(pocketMoneyId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete pocket money transaction:", error);

    // Check if error is about protected transactions
    if (
      error instanceof Error &&
      error.message.includes("Automatic transactions")
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    return serverErrorResponse("Failed to delete transaction");
  }
});
