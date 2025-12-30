import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin, finItems, scheduleRules } from "@/app/lib/db/schema";
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
    if (body.isScheduled && !body.frequency) {
      return badRequestResponse(
        'Field "frequency" is required when isScheduled is true'
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

    // Convert currency amounts and create FX snapshot
    const currencyAmounts = await convertCurrency(
      body.originalCurrency,
      body.originalAmountCents
    );

    // Create schedule rule if scheduled
    let scheduleRuleId: number | null = null;
    if (body.isScheduled && body.frequency) {
      // Map frequency to interval and unit
      const frequencyMap = {
        daily: { interval: 1, unit: "day" as const },
        weekly: { interval: 1, unit: "week" as const },
        biweekly: { interval: 2, unit: "week" as const },
        monthly: { interval: 1, unit: "month" as const },
        annually: { interval: 1, unit: "year" as const },
      };

      const { interval, unit } = frequencyMap[body.frequency];

      // Create schedule rule
      const [rule] = await db
        .insert(scheduleRules)
        .values({
          userId: user.userId,
          name: `${body.frequency} - ${body.merchant || "Untitled"}`,
          isActive: true,
          interval,
          unit,
          anchorDate: body.date,
        })
        .returning();

      scheduleRuleId = rule.scheduleRuleId;
    }

    // Insert into database
    await db.insert(fin).values({
      finId,
      userId: user.userId,
      type: body.type || "expense",
      date: body.date,
      scheduledOn: body.scheduledOn || null,
      scheduleRuleId: scheduleRuleId,
      merchant: body.merchant || null,
      comment: body.comment || null,
      place: body.place || null,
      city: body.city || null,
      category: body.category || null,
      subcategory: body.subcategory || null,
      details: body.details || null,
      originalCurrency: body.originalCurrency,
      originalAmountCents: body.originalAmountCents,
      fxId: currencyAmounts.fxId, // Link to FX snapshot
      amountCadCents: currencyAmounts.amountCadCents,
      amountUsdCents: currencyAmounts.amountUsdCents,
      amountCnyCents: currencyAmounts.amountCnyCents,
      amountBaseCadCents: currencyAmounts.amountBaseCadCents,
      isScheduled: body.isScheduled || false,
    });

    // Insert line items if provided
    if (body.lineItems && body.lineItems.length > 0) {
      await db.insert(finItems).values(
        body.lineItems.map((item, index) => ({
          finId,
          lineNo: index + 1,
          name: item.name,
          qty: item.qty || null,
          unit: item.unit || null,
          unitPriceCents: item.unitPriceCents || null,
          originalAmountCents: item.originalAmountCents,
          personId: item.personId || null,
          category: item.category || null,
          subcategory: item.subcategory || null,
          notes: item.notes || null,
        }))
      );
    }

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
