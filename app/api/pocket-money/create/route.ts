import { NextResponse } from "next/server";
import { createPocketMoney } from "@/app/lib/db/pocketMoney";
import type { CreatePocketMoneyRequest } from "@/app/lib/types/api";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

// Robin's person_id is hardcoded to 1
const ROBIN_PERSON_ID = 1;

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

export const POST = withAuth(async (request, user) => {
  try {
    const body: CreatePocketMoneyRequest = await request.json();

    // Validate required fields
    if (!body.transaction_type) {
      return badRequestResponse('Field "transaction_type" is required');
    }
    if (
      body.amount_cents === undefined ||
      body.amount_cents === null
    ) {
      return badRequestResponse('Field "amount_cents" is required');
    }
    if (!body.reason || body.reason.trim().length === 0) {
      return badRequestResponse('Field "reason" is required and cannot be empty');
    }

    // Validate transaction type (only bonus, deduction, or expense allowed for manual creation)
    if (!["bonus", "deduction", "expense"].includes(body.transaction_type)) {
      return badRequestResponse(
        'Field "transaction_type" must be "bonus", "deduction", or "expense". Automatic transaction types (weekly_allowance, initial) cannot be created manually.'
      );
    }

    // Validate amount based on transaction type
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

    // Validate transaction_date format if provided
    if (body.transaction_date && !isValidDateFormat(body.transaction_date)) {
      return badRequestResponse(
        'Field "transaction_date" must be ISO 8601 with UTC timezone (e.g., "2025-12-29T15:30:00Z")'
      );
    }

    // Create the pocket money transaction
    const createdBy = user.username || `user_${user.userId}`;
    const transaction = await createPocketMoney(
      body,
      ROBIN_PERSON_ID,
      createdBy
    );

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create pocket money error:", error);
    return serverErrorResponse("Internal server error");
  }
});
