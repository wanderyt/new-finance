"use client";

import { MonthGroup as MonthGroupType } from "@/app/lib/types/api";
import { FinData } from "@/app/lib/types/api";
import DayGroup from "./DayGroup";

interface MonthGroupProps {
  monthGroup: MonthGroupType;
  isExpanded: boolean;
  onToggle: () => void;
  onFinClick: (fin: FinData) => void;
}

export default function MonthGroup({
  monthGroup,
  isExpanded,
  onToggle,
  onFinClick,
}: MonthGroupProps) {
  const { monthKey, days, totalCents } = monthGroup;

  const [year, month] = monthKey.split("-");
  const monthLabel = `${month} ${year}`;

  const formattedTotal = (totalCents / 100).toFixed(2);

  return (
    <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {monthLabel}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              支出:
            </span>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              {formattedTotal}
            </span>
          </div>
        </div>

        <svg
          className={`w-5 h-5 text-zinc-500 dark:text-zinc-400 transition-transform ${
            isExpanded ? "rotate-90" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="bg-zinc-50 dark:bg-zinc-900 p-2">
          {days.map((day) => (
            <DayGroup
              key={day.dayKey}
              dayGroup={day}
              onFinClick={onFinClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
