import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin, finItems } from "@/app/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { UpdateFinRequest, UpdateFinResponse, ErrorResponse } from "@/app/lib/types/api";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";
import { convertCurrency } from "@/app/lib/utils/currency";

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

export const PATCH = withAuth(async (request, user) => {
  try {
    // Parse request body
    const body: UpdateFinRequest & { scope?: "single" | "all" } = await request.json();

    // finId is required
    if (!body.finId) {
      return badRequestResponse('Field "finId" is required');
    }

    // Extract scope parameter
    const scope = body.scope;

    // Fetch existing record with ownership check
    const [existing] = await db
      .select()
      .from(fin)
      .where(and(eq(fin.finId, body.finId), eq(fin.userId, user.userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found or access denied",
        } as ErrorResponse,
        { status: 404 }
      );
    }

    // Validate updated fields
    if (body.type && !["expense", "income"].includes(body.type)) {
      return badRequestResponse('Field "type" must be "expense" or "income"');
    }

    if (
      body.originalCurrency &&
      !["CAD", "USD", "CNY"].includes(body.originalCurrency)
    ) {
      return badRequestResponse(
        'Field "originalCurrency" must be CAD, USD, or CNY'
      );
    }

    if (body.originalAmountCents !== undefined && body.originalAmountCents < 0) {
      return badRequestResponse('Field "originalAmountCents" must be >= 0');
    }

    // Validate date format if being updated
    if (body.date && !isValidDateFormat(body.date)) {
      return badRequestResponse(
        'Field "date" must be ISO 8601 with UTC timezone (e.g., "2025-12-29T15:30:00Z")'
      );
    }

    // Build updates object
    const updates: any = {};

    // Basic fields
    if (body.type !== undefined) updates.type = body.type;
    if (body.date !== undefined) updates.date = body.date;
    if (body.merchant !== undefined) updates.merchant = body.merchant;
    if (body.comment !== undefined) updates.comment = body.comment;
    if (body.place !== undefined) updates.place = body.place;
    if (body.city !== undefined) updates.city = body.city;
    if (body.category !== undefined) updates.category = body.category;
    if (body.subcategory !== undefined) updates.subcategory = body.subcategory;
    if (body.details !== undefined) updates.details = body.details;

    // Currency fields - recalculate if changed
    const currencyChanged =
      body.originalCurrency !== undefined ||
      body.originalAmountCents !== undefined;

    if (currencyChanged) {
      const newCurrency = body.originalCurrency || existing.originalCurrency;
      const newAmount =
        body.originalAmountCents !== undefined
          ? body.originalAmountCents
          : existing.originalAmountCents;

      // Use existing FX snapshot for consistent historical rates
      const currencyAmounts = await convertCurrency(
        newCurrency as "CAD" | "USD" | "CNY",
        newAmount,
        existing.fxId // Reuse the original FX snapshot
      );

      updates.originalCurrency = newCurrency;
      updates.originalAmountCents = newAmount;
      updates.amountCadCents = currencyAmounts.amountCadCents;
      updates.amountUsdCents = currencyAmounts.amountUsdCents;
      updates.amountCnyCents = currencyAmounts.amountCnyCents;
      updates.amountBaseCadCents = currencyAmounts.amountBaseCadCents;
      // fxId remains unchanged - keeps historical rate consistency
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0 && body.lineItems === undefined) {
      return badRequestResponse("No fields to update");
    }

    // Handle scheduled transactions based on scope
    if (existing.isScheduled && existing.scheduleRuleId && scope === "all") {
      // Update this and all future occurrences
      // Use 00:00:00 of the target transaction's date as cutoff
      const targetDate = new Date(existing.date);
      targetDate.setHours(0, 0, 0, 0);
      const cutoffDate = targetDate.toISOString();

      // Update all fin records with the same schedule rule that are on or after the cutoff date
      if (Object.keys(updates).length > 0) {
        await db
          .update(fin)
          .set(updates)
          .where(
            and(
              eq(fin.scheduleRuleId, existing.scheduleRuleId),
              eq(fin.userId, user.userId),
              gte(fin.date, cutoffDate)
            )
          );
      }

      // Handle line items for all future occurrences
      if (body.lineItems !== undefined) {
        // Get all future fin IDs
        const futureRecords = await db
          .select({ finId: fin.finId })
          .from(fin)
          .where(
            and(
              eq(fin.scheduleRuleId, existing.scheduleRuleId),
              eq(fin.userId, user.userId),
              gte(fin.date, cutoffDate)
            )
          );

        // Update line items for each future record
        for (const record of futureRecords) {
          // Delete existing line items
          await db.delete(finItems).where(eq(finItems.finId, record.finId));

          // Insert new line items
          if (body.lineItems.length > 0) {
            await db.insert(finItems).values(
              body.lineItems.map((item, index) => ({
                finId: record.finId,
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
        }
      }
    } else {
      // Update only this single occurrence (default behavior)
      if (Object.keys(updates).length > 0) {
        await db
          .update(fin)
          .set(updates)
          .where(and(eq(fin.finId, body.finId), eq(fin.userId, user.userId)));
      }

      // Handle line items update if provided
      if (body.lineItems !== undefined) {
        // Delete existing line items
        await db.delete(finItems).where(eq(finItems.finId, body.finId));

        // Insert new line items
        if (body.lineItems.length > 0) {
          await db.insert(finItems).values(
            body.lineItems.map((item, index) => ({
              finId: body.finId,
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
      }
    }

    // Fetch updated record
    const [updated] = await db
      .select()
      .from(fin)
      .where(eq(fin.finId, body.finId))
      .limit(1);

    if (!updated) {
      return serverErrorResponse("Failed to retrieve updated record");
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          finId: updated.finId,
          userId: updated.userId,
          type: updated.type,
          date: updated.date,
          merchant: updated.merchant,
          comment: updated.comment,
          place: updated.place,
          city: updated.city,
          category: updated.category,
          subcategory: updated.subcategory,
          details: updated.details,
          originalCurrency: updated.originalCurrency,
          originalAmountCents: updated.originalAmountCents,
          fxId: updated.fxId,
          amountCadCents: updated.amountCadCents,
          amountUsdCents: updated.amountUsdCents,
          amountCnyCents: updated.amountCnyCents,
          amountBaseCadCents: updated.amountBaseCadCents,
          isScheduled: updated.isScheduled,
          scheduleRuleId: updated.scheduleRuleId,
          scheduledOn: updated.scheduledOn,
        },
      } as UpdateFinResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Update fin error:", error);
    return serverErrorResponse("Internal server error");
  }
});
