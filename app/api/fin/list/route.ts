import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin } from "@/app/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { ListFinResponse } from "@/app/lib/types/api";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

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

export const GET = withAuth(async (request, user) => {
  try {
    // Parse query parameters from URL
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const typeParam = searchParams.get("type");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");

    // Validate and parse limit (default: 20, max: 100)
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return badRequestResponse(
          'Query parameter "limit" must be between 1 and 100'
        );
      }
      limit = parsedLimit;
    }

    // Validate and parse offset (default: 0)
    let offset = 0;
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return badRequestResponse('Query parameter "offset" must be >= 0');
      }
      offset = parsedOffset;
    }

    // Validate type parameter (default: "all")
    let type: "expense" | "income" | "all" = "all";
    if (typeParam) {
      if (!["expense", "income", "all"].includes(typeParam)) {
        return badRequestResponse(
          'Query parameter "type" must be "expense", "income", or "all"'
        );
      }
      type = typeParam as "expense" | "income" | "all";
    }

    // Validate dateFrom parameter
    let dateFrom: string | undefined = undefined;
    if (dateFromParam) {
      if (!isValidDateFormat(dateFromParam)) {
        return badRequestResponse(
          'Query parameter "dateFrom" must be ISO 8601 with UTC timezone (e.g., "2025-12-29T15:30:00Z")'
        );
      }
      dateFrom = dateFromParam;
    }

    // Validate dateTo parameter (default: current date/time)
    let dateTo: string = new Date().toISOString();
    if (dateToParam) {
      if (!isValidDateFormat(dateToParam)) {
        return badRequestResponse(
          'Query parameter "dateTo" must be ISO 8601 with UTC timezone (e.g., "2025-12-29T23:59:59Z")'
        );
      }
      dateTo = dateToParam;
    }

    // Validate date range
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      return badRequestResponse(
        'Query parameter "dateFrom" must be <= "dateTo"'
      );
    }

    // Build query conditions
    const conditions = [eq(fin.userId, user.userId)];

    // Add type filter
    if (type !== "all") {
      conditions.push(eq(fin.type, type));
    }

    // Add date range filters
    if (dateFrom) {
      conditions.push(gte(fin.date, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(fin.date, dateTo));
    }

    // Fetch records with pagination
    const results = await db
      .select()
      .from(fin)
      .where(and(...conditions))
      .orderBy(desc(fin.date))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fin)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // Return success response with pagination
    return NextResponse.json(
      {
        success: true,
        data: results,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      } as ListFinResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("List fin error:", error);
    return serverErrorResponse("Internal server error");
  }
});
