import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin } from "@/app/lib/db/schema";
import { eq, and, isNotNull, desc, sql } from "drizzle-orm";
import { HistoricalDataResponse } from "@/app/lib/types/api";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

/**
 * GET /api/fin/history?merchant={merchantName}
 *
 * Fetch historical data grouped by field type for a specific merchant.
 * Returns up to 10 unique values per field type (categories, locations, details).
 *
 * Query Parameters:
 * - merchant (required): The merchant name to query historical data for
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     merchant: "Air Canada",
 *     categories: [{ category: "旅游", subcategory: "交通" }],
 *     locations: [{ place: "选座位", city: "上海" }],
 *     details: ["YYZ to PVG flight"]
 *   }
 * }
 */
export const GET = withAuth(async (request, user) => {
  try {
    // Parse query parameters from URL
    const { searchParams } = new URL(request.url);
    const merchant = searchParams.get("merchant");

    // Validate merchant parameter
    if (!merchant || !merchant.trim()) {
      return badRequestResponse(
        'Query parameter "merchant" is required and cannot be empty'
      );
    }

    // Validate merchant length (prevent extremely long strings)
    if (merchant.length > 200) {
      return badRequestResponse(
        'Query parameter "merchant" must be less than 200 characters'
      );
    }

    // Execute three parallel queries for performance
    const [categoriesResult, locationsResult, detailsResult] = await Promise.all([
      // Query 1: Fetch distinct category + subcategory pairs
      db
        .select({
          category: fin.category,
          subcategory: fin.subcategory,
        })
        .from(fin)
        .where(
          and(
            eq(fin.userId, user.userId),
            eq(fin.merchant, merchant),
            isNotNull(fin.category),
            isNotNull(fin.subcategory)
          )
        )
        .groupBy(fin.category, fin.subcategory)
        .orderBy(desc(sql`max(${fin.date})`))
        .limit(10),

      // Query 2: Fetch distinct place + city pairs
      db
        .select({
          place: fin.place,
          city: fin.city,
        })
        .from(fin)
        .where(
          and(
            eq(fin.userId, user.userId),
            eq(fin.merchant, merchant)
          )
        )
        .groupBy(fin.place, fin.city)
        .orderBy(desc(sql`max(${fin.date})`))
        .limit(10),

      // Query 3: Fetch distinct details
      db
        .select({
          details: fin.details,
        })
        .from(fin)
        .where(
          and(
            eq(fin.userId, user.userId),
            eq(fin.merchant, merchant),
            isNotNull(fin.details)
          )
        )
        .groupBy(fin.details)
        .orderBy(desc(sql`max(${fin.date})`))
        .limit(10),
    ]);

    // Process categories: filter out null values and empty strings
    const categories = categoriesResult
      .filter(
        (item) =>
          item.category &&
          item.subcategory &&
          item.category.trim() !== "" &&
          item.subcategory.trim() !== ""
      )
      .map((item) => ({
        category: item.category as string,
        subcategory: item.subcategory as string,
      }));

    // Process locations: filter out entries where both place and city are null/empty
    const locations = locationsResult
      .filter(
        (item) =>
          (item.place && item.place.trim() !== "") ||
          (item.city && item.city.trim() !== "")
      )
      .map((item) => ({
        place: item.place || "",
        city: item.city || "",
      }));

    // Process details: filter out null values and empty strings
    const details = detailsResult
      .filter((item) => item.details && item.details.trim() !== "")
      .map((item) => item.details as string);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          merchant,
          categories,
          locations,
          details,
        },
      } as HistoricalDataResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch historical data error:", error);
    return serverErrorResponse(
      "An error occurred while fetching historical data"
    );
  }
});
