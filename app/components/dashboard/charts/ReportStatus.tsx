"use client";

import Button from "../../ui-kit/Button";

interface ReportStatusProps {
  report: { loading: boolean; error?: string; retry: () => void };
  loadingText: string;
  padded?: boolean;
}

// Shows the loading or error state of a spending report request.
export default function ReportStatus({ report, loadingText, padded = false }: ReportStatusProps) {
  if (report.loading) {
    return <p role="status" className={`text-xs text-zinc-500 ${padded ? "py-8 text-center" : ""}`}>{loadingText}</p>;
  }
  return <div role="alert" className={`space-y-2 text-xs ${padded ? "py-4" : ""}`}>
    <p>{report.error}</p><Button size="sm" onClick={report.retry}>重试</Button>
  </div>;
}
