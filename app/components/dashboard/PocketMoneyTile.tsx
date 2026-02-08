"use client";

import { useState, useEffect } from "react";
import { PocketMoneyData } from "@/app/lib/types/api";

interface PocketMoneyTileProps {
  transaction: PocketMoneyData;
  onClick?: (transaction: PocketMoneyData) => void;
}

export default function PocketMoneyTile({
  transaction,
  onClick,
}: PocketMoneyTileProps) {
  const [timeString, setTimeString] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  const isManual =
    transaction.transaction_type === "bonus" ||
    transaction.transaction_type === "deduction" ||
    transaction.transaction_type === "expense";
  const isPositive = transaction.amount_cents > 0;
  const amountColor = isPositive
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
  const sign = isPositive ? "+" : "";
  const displayAmount = `${sign}CAD $${Math.abs(transaction.amount_cents / 100).toFixed(2)}`;

  // Type badge configuration
  const typeConfig = {
    weekly_allowance: {
      icon: "💵",
      label: "每周零花钱",
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    },
    bonus: {
      icon: "🎁",
      label: "奖励",
      color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    },
    deduction: {
      icon: "⚠️",
      label: "惩罚",
      color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
    expense: {
      icon: "💸",
      label: "花销",
      color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    },
    initial: {
      icon: "⭐",
      label: "初始余额",
      color:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    },
  };

  const config = typeConfig[transaction.transaction_type];

  // Format date on client side only to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);

    // Ensure consistent ISO format
    let isoDate = transaction.transaction_date;
    if (!isoDate.includes("T")) {
      isoDate = isoDate.replace(" ", "T");
    }
    if (!isoDate.endsWith("Z") && !isoDate.includes("+") && !isoDate.includes("-")) {
      isoDate = isoDate + "Z";
    }

    const date = new Date(isoDate);
    const weekday = new Intl.DateTimeFormat("zh-CN", {
      weekday: "short",
      timeZone: "UTC",
    }).format(date);
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    setTimeString(`${weekday} @ ${month}月${day}日`);
  }, [transaction.transaction_date]);

  return (
    <div
      onClick={() => isManual && onClick?.(transaction)}
      className={`flex items-center justify-between py-0.5 px-3 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
        isManual
          ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
          : "cursor-default"
      }`}
    >
      {/* Left Side */}
      <div className="flex-1 min-w-0">
        {/* Reason with inline badge */}
        <div className="flex items-center gap-1.5">
          <span className={`px-1 py-0.5 ${config.color} rounded text-xs font-medium shrink-0`}>
            {config.icon} {config.label}
          </span>
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {transaction.reason}
          </span>
        </div>

        {/* Time & Created By */}
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
          <span>{mounted ? timeString : "加载中..."}</span>
          {transaction.created_by !== "system" && (
            <>
              <span className="text-zinc-400 dark:text-zinc-600">•</span>
              <span>由 {transaction.created_by}</span>
            </>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 ml-3">
        {/* Delete Button for Manual Transactions */}
        {isManual && (
          <button
            type="button"
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              // Delete will be handled by parent component via a different method
            }}
            aria-label="Delete transaction"
          >
            <svg
              className="w-3.5 h-3.5 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}

        {/* Amount */}
        <div className="text-right">
          <div className={`text-xs font-semibold ${amountColor}`}>
            {displayAmount}
          </div>
        </div>
      </div>
    </div>
  );
}
