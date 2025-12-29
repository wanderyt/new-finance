import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  CreateFinRequest,
  CreateFinResponse,
} from "@/app/lib/types/api";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";
import { convertCurrency } from "@/app/lib/utils/currency";
import { generateFinId } from "@/app/lib/utils/id";

/**
 * Validate date format - must be ISO 8601 with time in UTC timezone
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
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
    // Parse request body
    const body: CreateFinRequest = await request.json();

    // Validate required fields
    if (!body.date) {
      return badRequestResponse('Field "date" is required');
    }
    if (!body.originalCurrency) {
      return badRequestResponse('Field "originalCurrency" is required');
    }
    if (
      body.originalAmountCents === undefined ||
      body.originalAmountCents === null
    ) {
      return badRequestResponse('Field "originalAmountCents" is required');
    }

    // Validate date format (ISO 8601 with UTC timezone)
    if (!isValidDateFormat(body.date)) {
      return badRequestResponse(
        'Field "date" must be ISO 8601 with UTC timezone (e.g., "2025-12-29T15:30:00Z")'
      );
    }

    // Validate currency enum
    if (!["CAD", "USD", "CNY"].includes(body.originalCurrency)) {
      return badRequestResponse(
        'Field "originalCurrency" must be CAD, USD, or CNY'
      );
    }

    // Validate amount (must be non-negative)
    if (body.originalAmountCents < 0) {
      return badRequestResponse('Field "originalAmountCents" must be >= 0');
    }

    // Validate type enum if provided
    if (body.type && !["expense", "income"].includes(body.type)) {
      return badRequestResponse('Field "type" must be "expense" or "income"');
    }

    // Validate scheduling fields
    if (body.isScheduled && !body.scheduleRuleId) {
      return badRequestResponse(
        'Field "scheduleRuleId" is required when isScheduled is true'
      );
    }

    // Validate scheduledOn format if provided
    if (body.scheduledOn && !isValidDateFormat(body.scheduledOn)) {
      return badRequestResponse(
        'Field "scheduledOn" must be ISO 8601 with UTC timezone (e.g., "2025-12-29T15:30:00Z")'
      );
    }

    // Generate unique ID
    const finId = generateFinId();

    // Convert currency amounts
    const currencyAmounts = convertCurrency(
      body.originalCurrency,
      body.originalAmountCents
    );

    // Insert into database
    await db.insert(fin).values({
      finId,
      userId: user.userId,
      type: body.type || "expense",
      date: body.date,
      scheduledOn: body.scheduledOn || null,
      scheduleRuleId: body.scheduleRuleId || null,
      merchant: body.merchant || null,
      comment: body.comment || null,
      place: body.place || null,
      city: body.city || null,
      category: body.category || null,
      subcategory: body.subcategory || null,
      details: body.details || null,
      originalCurrency: body.originalCurrency,
      originalAmountCents: body.originalAmountCents,
      fxId: null, // TODO: Link to fx_snapshots when FX API is integrated
      ...currencyAmounts,
      isScheduled: body.isScheduled || false,
    });

    // Fetch the created record for response
    const [created] = await db
      .select()
      .from(fin)
      .where(eq(fin.finId, finId))
      .limit(1);

    if (!created) {
      return serverErrorResponse("Failed to retrieve created record");
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          finId: created.finId,
          userId: created.userId,
          type: created.type,
          date: created.date,
          merchant: created.merchant,
          comment: created.comment,
          place: created.place,
          city: created.city,
          category: created.category,
          subcategory: created.subcategory,
          details: created.details,
          originalCurrency: created.originalCurrency,
          originalAmountCents: created.originalAmountCents,
          fxId: created.fxId,
          amountCadCents: created.amountCadCents,
          amountUsdCents: created.amountUsdCents,
          amountCnyCents: created.amountCnyCents,
          amountBaseCadCents: created.amountBaseCadCents,
          isScheduled: created.isScheduled,
          scheduleRuleId: created.scheduleRuleId,
          scheduledOn: created.scheduledOn,
        },
      } as CreateFinResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error("Create fin error:", error);
    return serverErrorResponse("Internal server error");
  }
});
