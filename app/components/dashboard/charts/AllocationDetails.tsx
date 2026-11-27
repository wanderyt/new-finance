"use client";

import { NECESSITY_LABELS } from "../../../lib/types/necessity";
import type { FinData } from "../../../lib/types/api";
import Button from "../../ui-kit/Button";
import { formatCad, type SpendingReport } from "./useSpendingReport";

interface AllocationDetailsProps {
  report: SpendingReport;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onFinClick?: (record: FinData) => void;
}

// Lists matched records with the item allocations that fall in the selected slice.
export default function AllocationDetails({ report, offset, onOffsetChange, onFinClick }: AllocationDetailsProps) {
  const { limit } = report.pagination;
  return <div className="space-y-3 text-xs">
    <p>{report.pagination.total} 笔匹配账单</p>
    {report.details.map((detail) => <button key={detail.record.finId} type="button" onClick={() => onFinClick?.(detail.record)}
      disabled={!onFinClick} className="w-full rounded-lg border border-zinc-200 p-3 text-left text-xs dark:border-zinc-700">
      <span className="flex justify-between gap-2"><strong className="font-semibold">{detail.record.merchant || "未填写商户"}</strong><span>{formatCad(detail.matchedCadCents)}</span></span>
      <span className="mt-1 block text-xs text-zinc-500">{detail.record.date.slice(0, 10)} · 整笔账单 {formatCad(detail.record.amountCadCents)}</span>
      {detail.allocations.map((allocation, index) => <span key={index} className="mt-1 block text-xs">
        {allocation.name} · {NECESSITY_LABELS[allocation.necessityLevel]} · {formatCad(allocation.amountCadCents)}{allocation.estimated ? "（估算）" : ""}
      </span>)}
    </button>)}
    <div className="flex justify-between">
      <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => onOffsetChange(Math.max(0, offset - limit))}>上一页</Button>
      <Button size="sm" variant="secondary" disabled={!report.pagination.hasMore} onClick={() => onOffsetChange(offset + limit)}>下一页</Button>
    </div>
  </div>;
}
