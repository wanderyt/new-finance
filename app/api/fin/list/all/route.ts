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

/**
 * GET /api/fin/list/all
 *
 * This endpoint returns ALL records matching the filters without pagination.
 *
 * WARNING: This endpoint is designed for performance testing purposes.
 * It can return large datasets and may have performance implications.
 * For production use, prefer /api/fin/list with pagination.
 *
 * Query Parameters:
 * - type: "expense" | "income" | "all" (default: "all")
 * - dateFrom: ISO 8601 date string with UTC timezone (optional)
 * - dateTo: ISO 8601 date string with UTC timezone (default: current date/time)
 *
 * Response:
 * {
 *   success: true,
 *   data: FinData[],
 *   pagination: {
 *     total: number,
 *     limit: number,
 *     offset: 0,
 *     hasMore: false
 *   }
 * }
 */
export const GET = withAuth(async (request, user) => {
  try {
    // Parse query parameters from URL
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const typeParam = searchParams.get("type");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");

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

    // Fetch ALL records without limit
    const results = await db
      .select()
      .from(fin)
      .where(and(...conditions))
      .orderBy(desc(fin.date));

    const total = results.length;

    // Return success response with all records
    return NextResponse.json(
      {
        success: true,
        data: results,
        pagination: {
          total,
          limit: total,
          offset: 0,
          hasMore: false,
        },
      } as ListFinResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("List all fin error:", error);
    return serverErrorResponse("Internal server error");
  }
});
