"use client";

import { FinData } from "@/app/lib/types/api";
import ExpenseTile from "../ExpenseTile";

interface CategoryExpenseListProps {
  category: string;
  subcategory?: string;
  transactions: FinData[];
  onFinClick: (fin: FinData) => void;
  onClear: () => void;
}

export default function CategoryExpenseList({
  category,
  subcategory,
  transactions,
  onFinClick,
  onClear,
}: CategoryExpenseListProps) {
  const totalCents = transactions.reduce(
    (sum, fin) => sum + fin.amountCadCents,
    0
  );

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-t-lg border border-zinc-200 dark:border-zinc-700">
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {subcategory ? (
              <>
                {category} <span className="text-zinc-400 dark:text-zinc-600">›</span> {subcategory}
              </>
            ) : (
              category
            )}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} • $
            {(totalCents / 100).toFixed(2)}
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
          aria-label="Clear selection"
        >
          <svg
            className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Transaction List */}
      <div className="border border-t-0 border-zinc-200 dark:border-zinc-700 rounded-b-lg overflow-hidden">
        {transactions.map((fin) => (
          <ExpenseTile key={fin.finId} fin={fin} onClick={onFinClick} />
        ))}
      </div>
    </div>
  );
}
