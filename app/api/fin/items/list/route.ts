import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/drizzle";
import { fin, finItems } from "@/app/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  FinItemWithParent,
  ListFinItemsResponse,
} from "@/app/lib/types/api";
import {
  withAuth,
  badRequestResponse,
  serverErrorResponse,
} from "@/app/lib/middleware/auth";

function isValidDateFormat(dateString: string): boolean {
  if (!dateString.match(/[Z]|[+-]\d{2}:\d{2}$/)) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const personIdParam = searchParams.get("personId");

    let limit = 500;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        return badRequestResponse(
          'Query parameter "limit" must be between 1 and 1000'
        );
      }
      limit = parsedLimit;
    }

    let offset = 0;
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return badRequestResponse('Query parameter "offset" must be >= 0');
      }
      offset = parsedOffset;
    }

    let dateFrom: string | undefined = undefined;
    if (dateFromParam) {
      if (!isValidDateFormat(dateFromParam)) {
        return badRequestResponse(
          'Query parameter "dateFrom" must be ISO 8601 with UTC timezone'
        );
      }
      dateFrom = dateFromParam;
    }

    let dateTo: string | undefined = undefined;
    if (dateToParam) {
      if (!isValidDateFormat(dateToParam)) {
        return badRequestResponse(
          'Query parameter "dateTo" must be ISO 8601 with UTC timezone'
        );
      }
      dateTo = dateToParam;
    }

    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      return badRequestResponse(
        'Query parameter "dateFrom" must be <= "dateTo"'
      );
    }

    let personId: number | undefined = undefined;
    if (personIdParam) {
      const parsedPersonId = parseInt(personIdParam, 10);
      if (isNaN(parsedPersonId)) {
        return badRequestResponse('Query parameter "personId" must be a valid number');
      }
      personId = parsedPersonId;
    }

    const finConditions = [eq(fin.userId, user.userId)];
    if (dateFrom) {
      finConditions.push(gte(fin.date, dateFrom));
    }
    if (dateTo) {
      finConditions.push(lte(fin.date, dateTo));
    }

    const results = await db
      .select({
        itemId: finItems.itemId,
        finId: finItems.finId,
        lineNo: finItems.lineNo,
        name: finItems.name,
        qty: finItems.qty,
        unit: finItems.unit,
        unitPriceCents: finItems.unitPriceCents,
        originalAmountCents: finItems.originalAmountCents,
        personId: finItems.personId,
        category: finItems.category,
        subcategory: finItems.subcategory,
        notes: finItems.notes,

        parentFinId: fin.finId,
        parentDate: fin.date,
        parentMerchant: fin.merchant,
        parentCity: fin.city,
        parentType: fin.type,
        parentCategory: fin.category,
        parentSubcategory: fin.subcategory,
      })
      .from(finItems)
      .innerJoin(fin, eq(finItems.finId, fin.finId))
      .where(
        personId
          ? and(...finConditions, eq(finItems.personId, personId))
          : and(...finConditions)
      )
      .orderBy(desc(fin.date), finItems.lineNo)
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(finItems)
      .innerJoin(fin, eq(finItems.finId, fin.finId))
      .where(
        personId
          ? and(...finConditions, eq(finItems.personId, personId))
          : and(...finConditions)
      );

    const total = countResult?.count || 0;

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
      } as ListFinItemsResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("List fin items error:", error);
    return serverErrorResponse("Internal server error");
  }
});
