"use client";

import { useState } from "react";
import type { FinData } from "../../../lib/types/api";
import AllocationDetails from "./AllocationDetails";
import CategoryBarChart from "./CategoryBarChart";
import CategoryBreadcrumb from "./CategoryBreadcrumb";
import CategoryPieChart from "./CategoryPieChart";
import ReportStatus from "./ReportStatus";
import { formatCad, useReportPeriod, useSpendingReport } from "./useSpendingReport";

export default function CategoryAnalysisView({ onFinClick }: { onFinClick?: (record: FinData) => void }) {
  const { period, value } = useReportPeriod();
  return <CategoryPeriodView key={`${period}:${value}`} period={period} value={value} onFinClick={onFinClick} />;
}

function CategoryPeriodView({ period, value, onFinClick }: {
  period: "month" | "year"; value: string; onFinClick?: (record: FinData) => void;
}) {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [selection, setSelection] = useState<{ category?: string; subcategory?: string }>({});
  const [offset, setOffset] = useState(0);
  const summary = useSpendingReport(new URLSearchParams({ period, value }).toString());
  const details = useSpendingReport(selection.subcategory === undefined ? null : new URLSearchParams({
    period, value, category: selection.category!, subcategory: selection.subcategory, details: "1", offset: String(offset),
  }).toString());

  if (summary.loading || !summary.data) return <ReportStatus report={summary} loadingText="正在加载分类统计…" padded />;

  const report = summary.data;
  const chartData = report.categories
    .filter((total) => selection.category === undefined ? total.subcategory === null
      : total.category === selection.category && total.subcategory !== null)
    .slice(0, 15)
    .map((total) => ({ category: total.category, subcategory: total.subcategory ?? undefined,
      totalCents: total.amountCadCents, count: total.recordCount }));
  const handleCategoryClick = (category: string, subcategory?: string) => {
    setOffset(0);
    setSelection(selection.category === undefined ? { category } : { category, subcategory });
  };
  const selectedTotal = report.categories.find((total) => total.category === selection.category &&
    total.subcategory === selection.subcategory)?.amountCadCents ?? 0;
  const ChartComponent = chartType === "pie" ? CategoryPieChart : CategoryBarChart;

  return <div className="space-y-2">
    <div className="flex items-center justify-between">
      <p className="text-xs text-zinc-500">按明细分类统计，税额按计税商品分摊</p>
      <div className="flex gap-0.5 rounded bg-zinc-100 p-0.5 dark:bg-zinc-700">
        {(["pie", "bar"] as const).map((type) => <button key={type} type="button" onClick={() => setChartType(type)}
          className={`rounded px-2 py-0.5 text-xs transition-colors ${chartType === type
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}>
          {type === "pie" ? "饼图" : "柱状图"}
        </button>)}
      </div>
    </div>

    <CategoryBreadcrumb drilldownCategory={selection.category} onBack={() => { setOffset(0); setSelection({}); }} />

    {report.totalCadCents === 0 ? (
      <div className="rounded-lg bg-zinc-50 py-6 text-center text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        <p className="text-xs">所选时段无支出数据</p>
      </div>
    ) : (
      <ChartComponent data={chartData} drilldownCategory={selection.category} onCategoryClick={handleCategoryClick} height={220} />
    )}

    {selection.subcategory !== undefined && <div className="mt-3 space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          {selection.category} <span className="text-zinc-400 dark:text-zinc-600">›</span> {selection.subcategory}
          <span className="ml-2 font-normal text-zinc-500">{formatCad(selectedTotal)}</span>
        </p>
        <button type="button" onClick={() => setSelection({ category: selection.category })} aria-label="清除选择"
          className="rounded p-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700">✕</button>
      </div>
      {details.loading || !details.data ? <ReportStatus report={details} loadingText="正在加载明细…" />
        : <AllocationDetails report={details.data} offset={offset} onOffsetChange={setOffset} onFinClick={onFinClick} />}
    </div>}
  </div>;
}
