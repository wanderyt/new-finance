"use client";

import { useState } from "react";
import { FinData } from "@/app/lib/types/api";

interface ExpenseTileProps {
  fin: FinData;
  onClick?: (fin: FinData) => void;
}

export default function ExpenseTile({ fin, onClick }: ExpenseTileProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isExpense = fin.type === "expense";
  const amountColor = isExpense
    ? "text-red-600 dark:text-red-400"
    : "text-green-600 dark:text-green-400";
  const sign = isExpense ? "-" : "+";
  const displayAmount = `${sign}$${(fin.originalAmountCents / 100).toFixed(2)}`;

  // Format exchange info
  const exchangeInfo = {
    cad: `$${(fin.amountCadCents / 100).toFixed(2)}`,
    usd: `$${(fin.amountUsdCents / 100).toFixed(2)}`,
    cny: `¥${(fin.amountCnyCents / 100).toFixed(2)}`,
  };

  // Type badge
  const typeBadge = isExpense ? (
    <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
      支出
    </span>
  ) : (
    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
      收入
    </span>
  );

  return (
    <div
      onClick={() => onClick?.(fin)}
      className="flex items-center justify-between py-2.5 px-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 cursor-pointer"
    >
      {/* Left Side */}
      <div className="flex-1 min-w-0">
        {/* Category > Subcategory */}
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">
          {fin.category || "Uncategorized"}
          {fin.subcategory && (
            <>
              <span className="text-zinc-400 dark:text-zinc-600 mx-1">›</span>
              <span className="text-blue-600 dark:text-blue-400">
                {fin.subcategory}
              </span>
            </>
          )}
        </div>

        {/* Merchant */}
        {fin.merchant && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-0.5">
            {fin.merchant}
          </div>
        )}

        {/* Place & Badges */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          {fin.place && <span>{fin.place}</span>}
          {typeBadge}
          {fin.isScheduled && (
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
              Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 ml-4">
        {/* Info Icon with Tooltip */}
        {fin.originalCurrency !== "CAD" && (
          <div className="relative">
            <button
              type="button"
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Exchange rate information"
            >
              <svg
                className="w-4 h-4 text-zinc-500 dark:text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
                <div>CAD: {exchangeInfo.cad}</div>
                <div>USD: {exchangeInfo.usd}</div>
                <div>CNY: {exchangeInfo.cny}</div>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        <div className="text-right">
          <div className={`text-sm font-semibold ${amountColor}`}>
            {displayAmount}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            {fin.originalCurrency}
          </div>
        </div>
      </div>
    </div>
  );
}
