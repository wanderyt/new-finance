"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "../../../lib/redux/hooks";
import { selectChartsViewMode, selectChartsSelectedMonth, selectChartsSelectedYear } from "../../../lib/redux/features/fin/finSlice";
import type { NecessityAllocation, NecessityReport } from "../../../lib/types/necessity";
import type { FinData } from "../../../lib/types/api";

export interface ReportDetail {
  record: FinData;
  allocations: NecessityAllocation[];
  matchedCadCents: number;
}

export interface SpendingReport extends NecessityReport {
  details: ReportDetail[];
  pagination: { offset: number; limit: number; total: number; hasMore: boolean };
}

export const formatCad = (cents: number) =>
  new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CAD" }).format(cents / 100);

// Reports exclude future records, so a future selection falls back to the current month or year.
export function useReportPeriod() {
  const period = useAppSelector(selectChartsViewMode);
  const month = useAppSelector(selectChartsSelectedMonth);
  const year = useAppSelector(selectChartsSelectedYear);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = String(new Date().getUTCFullYear());
  const value = period === "month" ? (month && month <= currentMonth ? month : currentMonth)
    : (year && year <= currentYear ? year : currentYear);
  return { period, value };
}

// Loads GET /api/fin/necessity for a query string. Pass null to skip loading.
// Record changes trigger a reload. An older request never replaces a newer result.
export function useSpendingReport(query: string | null) {
  const records = useAppSelector((state) => state.fin.fins);
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<{ query: string; data?: SpendingReport; error?: string }>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (query === null) return;
    const controller = new AbortController();
    Promise.resolve().then(() => { if (!controller.signal.aborted) setPending(true); });
    fetch(`/api/fin/necessity?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || "无法加载支出报表。");
        if (!controller.signal.aborted) setResult({ query, data: body.data });
      })
      .catch((error: Error) => { if (!controller.signal.aborted) setResult({ query, error: error.message }); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [query, records, retryCount]);

  const loading = query !== null && (!result || result.query !== query || pending);
  const current = loading || query === null ? undefined : result;
  return { loading, data: current?.data, error: current?.error, retry: () => setRetryCount((count) => count + 1) };
}
