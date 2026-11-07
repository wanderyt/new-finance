"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppSelector } from "../../../lib/redux/hooks";
import { selectChartsViewMode, selectChartsSelectedMonth, selectChartsSelectedYear } from "../../../lib/redux/features/fin/finSlice";
import { NECESSITY_LABELS, NECESSITY_DESCRIPTIONS, NECESSITY_LEVELS, type NecessityLevel, type NecessityReport, type NecessityAllocation } from "../../../lib/types/necessity";
import type { FinData } from "../../../lib/types/api";
import Button from "../../ui-kit/Button";

interface ReportResponse extends NecessityReport {
  details: { record: FinData; allocations: NecessityAllocation[]; matchedCadCents: number }[];
  pagination: { offset: number; limit: number; total: number; hasMore: boolean };
}

const COLORS = ["#2563eb", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#64748b"];
const money = (cents: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CAD" }).format(cents / 100);

export default function NecessityAnalysisView({ onFinClick }: { onFinClick?: (record: FinData) => void }) {
  const period = useAppSelector(selectChartsViewMode);
  const month = useAppSelector(selectChartsSelectedMonth);
  const year = useAppSelector(selectChartsSelectedYear);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = String(new Date().getUTCFullYear());
  const value = period === "month" ? (month && month <= currentMonth ? month : currentMonth)
    : (year && year <= currentYear ? year : currentYear);
  return <NecessityPeriodView key={`${period}:${value}`} period={period} value={value} onFinClick={onFinClick} />;
}

function NecessityPeriodView({ period, value, onFinClick }: {
  period: "month" | "year"; value: string; onFinClick?: (record: FinData) => void;
}) {
  const records = useAppSelector((state) => state.fin.fins);
  const [selection, setSelection] = useState<{ level?: NecessityLevel; category?: string; subcategory?: string; review?: boolean }>({});
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const params = new URLSearchParams({ period, value });
  if (selection.level) params.set("level", selection.level);
  if (selection.category !== undefined) params.set("category", selection.category);
  if (selection.subcategory !== undefined) params.set("subcategory", selection.subcategory);
  const details = selection.subcategory !== undefined || selection.review;
  if (details) params.set("details", "1");
  if (selection.review) params.set("review", "estimated");
  params.set("offset", String(offset));
  const query = params.toString();
  const [result, setResult] = useState<{ query: string; data?: ReportResponse; error?: string }>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => { if (!controller.signal.aborted) setPending(true); });
    fetch(`/api/fin/necessity?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || "无法加载支出优先级。");
        if (!controller.signal.aborted) setResult({ query, data: body.data });
      })
      .catch((error: Error) => { if (!controller.signal.aborted) setResult({ query, error: error.message }); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [query, records, retry]);

  const navigate = (next: typeof selection) => { setOffset(0); setSelection(next); };
  if (!result || result.query !== query || pending) return <p role="status" className="py-8 text-center text-xs text-zinc-500">正在加载支出优先级…</p>;
  if (result.error || !result.data) return <div role="alert" className="space-y-2 py-4 text-xs">
    <p>{result.error}</p><Button size="sm" onClick={() => setRetry((count) => count + 1)}>重试</Button>
  </div>;
  const report = result.data;
  const grouped = new Map<string, number>();
  if (!selection.level) NECESSITY_LEVELS.forEach((level) => grouped.set(level, report.totals[level]));
  else report.buckets.filter((bucket) => bucket.necessityLevel === selection.level &&
    (selection.category === undefined || bucket.category === selection.category)).forEach((bucket) => {
    const key = selection.category === undefined ? bucket.category : bucket.subcategory;
    grouped.set(key, (grouped.get(key) ?? 0) + bucket.amountCadCents);
  });
  const chart = [...grouped].map(([key, amount], index) => ({ key, value: amount,
    name: !selection.level ? NECESSITY_LABELS[key as NecessityLevel] : key,
    color: !selection.level ? COLORS[NECESSITY_LEVELS.indexOf(key as NecessityLevel)] : COLORS[index % COLORS.length] }));
  const chartTotal = chart.reduce((sum, item) => sum + item.value, 0);
  const choose = (key: string) => {
    if (!selection.level) navigate({ level: key as NecessityLevel });
    else if (selection.category === undefined) navigate({ level: selection.level, category: key });
    else navigate({ ...selection, subcategory: key });
  };

  return <div className="space-y-4 text-xs text-zinc-900 dark:text-zinc-100">
    <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{value} · 支出总额 · CAD · UTC</p>
      <p className="mt-1 text-xs font-semibold">{money(report.totalCadCents)}</p>
      <p className="mt-2 text-xs text-zinc-500">历史账单初始归为必需，可在账单中调整。</p>
    </div>
    <nav aria-label="支出优先级路径" className="flex flex-wrap gap-2 text-xs">
      <button type="button" onClick={() => navigate({})} className="text-blue-600 underline">全部优先级</button>
      {selection.level && <><span>/</span><button type="button" onClick={() => navigate({ level: selection.level })}
        className="text-blue-600 underline">{NECESSITY_LABELS[selection.level]}</button></>}
      {selection.category !== undefined && <><span>/</span><button type="button" className="text-blue-600 underline"
        onClick={() => navigate({ level: selection.level, category: selection.category })}>{selection.category}</button></>}
      {selection.subcategory !== undefined && <><span>/</span><span>{selection.subcategory}</span></>}
      {selection.review && <><span>/</span><span>待核对账单</span></>}
    </nav>
    {report.estimatedRecordCount > 0 && <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <p>{report.estimatedRecordCount} 笔账单的明细超过实付金额，{money(report.estimatedCadCents)} 使用比例估算。</p>
      <button type="button" onClick={() => navigate({ review: true })} className="mt-1 underline">查看需核对账单</button>
    </div>}
    {report.remainderCadCents > 0 && <p className="text-xs text-zinc-500">未分配余额 {money(report.remainderCadCents)} 按账单默认优先级统计。</p>}
    {!details && <>
      <div className="flex items-center justify-between text-xs"><span>{selection.level ? NECESSITY_LABELS[selection.level] : "支出优先级"}</span><strong className="font-semibold">{money(chartTotal)}</strong></div>
      {chartTotal > 0 ? <div role="img" aria-label="支出金额分布，下方按钮提供金额和导航。">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart><Pie data={chart.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}
            onClick={(entry) => choose(entry.key)} cursor="pointer" isAnimationActive={false}>
            {chart.filter((item) => item.value > 0).map((item) => <Cell key={item.key} fill={item.color} />)}
          </Pie><Tooltip contentStyle={{ fontSize: "12px" }} labelStyle={{ fontWeight: 600 }} formatter={(amount) => money(Number(amount))} /></PieChart>
        </ResponsiveContainer>
      </div> : <p className="py-8 text-center text-xs text-zinc-500">所选时段无支出数据。</p>}
      <div className="space-y-2">{chart.map((item) => <button key={item.key} type="button" onClick={() => choose(item.key)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 text-left text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
        <span>{money(item.value)} · {chartTotal ? (item.value / chartTotal * 100).toFixed(1) : "0.0"}%</span>
      </button>)}</div>
      {selection.level && <p className="text-xs text-zinc-500">{NECESSITY_DESCRIPTIONS[selection.level]}</p>}
    </>}
    {details && <div className="space-y-3">
      <p className="text-xs">{report.pagination.total} 笔匹配账单</p>
      {report.details.map((detail) => <button key={detail.record.finId} type="button" onClick={() => onFinClick?.(detail.record)}
        disabled={!onFinClick} className="w-full rounded-lg border border-zinc-200 p-3 text-left text-xs dark:border-zinc-700">
        <span className="flex justify-between gap-2"><strong className="font-semibold">{detail.record.merchant || "未填写商户"}</strong><span>{money(detail.matchedCadCents)}</span></span>
        <span className="mt-1 block text-xs text-zinc-500">{detail.record.date.slice(0, 10)} · 整笔账单 {money(detail.record.amountCadCents)}</span>
        {detail.allocations.map((allocation, index) => <span key={index} className="mt-1 block text-xs">
          {allocation.name} · {NECESSITY_LABELS[allocation.necessityLevel]} · {money(allocation.amountCadCents)}{allocation.estimated ? "（估算）" : ""}
        </span>)}
      </button>)}
      <div className="flex justify-between"><Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>上一页</Button>
        <Button size="sm" variant="secondary" disabled={!report.pagination.hasMore} onClick={() => setOffset(offset + 20)}>下一页</Button></div>
    </div>}
  </div>;
}
