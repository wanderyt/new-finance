import { NextResponse } from "next/server";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../../../lib/db/drizzle";
import { fin, finItems } from "../../../lib/db/schema";
import { withAuth, badRequestResponse, serverErrorResponse } from "../../../lib/middleware/auth";
import { allocateNecessity, emptyNecessityReport, necessityPeriod } from "../../../lib/utils/necessity-allocation";
import { isNecessityLevel } from "../../../lib/utils/necessity";
import type { NecessityAllocation, NecessityBucket } from "../../../lib/types/necessity";
import type { FinData } from "../../../lib/types/api";

export const GET = withAuth(async (request, user) => {
  const params = new URL(request.url).searchParams;
  let range: ReturnType<typeof necessityPeriod>;
  try { range = necessityPeriod(params.get("period"), params.get("value")); }
  catch (error) { return badRequestResponse((error as Error).message); }
  const level = params.get("level");
  if (level !== null && !isNecessityLevel(level)) return badRequestResponse("The spending priority is invalid.");
  const offset = Number(params.get("offset") || 0);
  const limit = Number(params.get("limit") || 20);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return badRequestResponse("Select a valid detail offset and a limit from 1 to 100.");
  }
  const category = params.get("category");
  const subcategory = params.get("subcategory");
  const detailsRequested = params.get("details") === "1";
  const matches = (allocation: NecessityAllocation) =>
    (!level || allocation.necessityLevel === level) && (category === null || allocation.category === category) &&
    (subcategory === null || allocation.subcategory === subcategory);
  try {
    const data = db.transaction((transaction) => {
      const report = emptyNecessityReport();
      const buckets = new Map<string, NecessityBucket>();
      const details: { record: FinData; allocations: NecessityAllocation[]; matchedCadCents: number }[] = [];
      let matchedRecordCount = 0;
      let cursor: string | undefined;
      while (true) {
        const records = transaction.select().from(fin).where(and(eq(fin.userId, user.userId), eq(fin.type, "expense"),
          sql`julianday(${fin.date}) >= julianday(${range.start})`,
          sql`julianday(${fin.date}) < julianday(${range.end})`, sql`julianday(${fin.date}) <= julianday(${range.now})`,
          cursor ? gt(fin.finId, cursor) : undefined)).orderBy(fin.finId).limit(200).all();
        if (!records.length) break;
        const ids = records.map((record) => record.finId);
        const items = transaction.select().from(finItems).where(inArray(finItems.finId, ids)).all();
        const byRecord = new Map<string, typeof items>();
        for (const item of items) {
          const group = byRecord.get(item.finId) ?? [];
          group.push(item);
          byRecord.set(item.finId, group);
        }
        for (const record of records) {
          const allocations = allocateNecessity(record, byRecord.get(record.finId) ?? []);
          report.totalCadCents += record.amountCadCents;
          if (allocations.some((allocation) => allocation.estimated)) {
            report.estimatedCadCents += record.amountCadCents;
            report.estimatedRecordCount++;
          }
          for (const allocation of allocations) {
            report.totals[allocation.necessityLevel] += allocation.amountCadCents;
            if (allocation.remainder) report.remainderCadCents += allocation.amountCadCents;
            const key = JSON.stringify([allocation.necessityLevel, allocation.category, allocation.subcategory]);
            const bucket = buckets.get(key) ?? { necessityLevel: allocation.necessityLevel, category: allocation.category,
              subcategory: allocation.subcategory, amountCadCents: 0 };
            bucket.amountCadCents += allocation.amountCadCents;
            buckets.set(key, bucket);
          }
          if (detailsRequested) {
            const selected = allocations.filter(matches);
            if (selected.length && (params.get("review") !== "estimated" || allocations.some((allocation) => allocation.estimated))) {
              if (matchedRecordCount >= offset && details.length < limit) details.push({ record, allocations: selected,
                matchedCadCents: selected.reduce((sum, allocation) => sum + allocation.amountCadCents, 0) });
              matchedRecordCount++;
            }
          }
        }
        cursor = records[records.length - 1].finId;
      }
      report.buckets = [...buckets.values()].sort((a, b) => b.amountCadCents - a.amountCadCents);
      return { ...report, details, pagination: { total: matchedRecordCount, offset, limit,
        hasMore: offset + details.length < matchedRecordCount } };
    });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load the spending priority report:", error);
    return serverErrorResponse("Failed to load the spending priority report.");
  }
});
