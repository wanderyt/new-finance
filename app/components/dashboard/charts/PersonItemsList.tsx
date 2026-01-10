"use client";

import { FinItemWithParent } from "@/app/lib/types/api";

interface PersonItemsListProps {
  personName: string;
  items: FinItemWithParent[];
  onClear: () => void;
}

export default function PersonItemsList({
  personName,
  items,
  onClear,
}: PersonItemsListProps) {
  const totalCents = items.reduce(
    (sum, item) => sum + item.originalAmountCents,
    0
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-t-lg border border-zinc-200 dark:border-zinc-700">
        <div>
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {personName}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {items.length} 项支出 • $
            {(totalCents / 100).toFixed(2)}
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
          aria-label="清除选择"
        >
          <svg
            className="w-4 h-4 text-zinc-600 dark:text-zinc-400"
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

      <div className="border border-t-0 border-zinc-200 dark:border-zinc-700 rounded-b-lg overflow-hidden max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.itemId}
            className="flex items-center justify-between py-1.5 px-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">
                {item.name}
                {item.qty && item.unit && (
                  <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">
                    ({item.qty} {item.unit})
                  </span>
                )}
              </div>

              {item.parentMerchant && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-0.5">
                  <svg
                    className="w-3 h-3 inline mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  {item.parentMerchant}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
                {item.parentCity && (
                  <span>
                    <svg
                      className="w-3 h-3 inline mr-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {item.parentCity}
                  </span>
                )}
                {(item.category || item.parentCategory) && (
                  <span>
                    {item.category || item.parentCategory}
                    {(item.subcategory || item.parentSubcategory) && (
                      <>
                        {" › "}
                        {item.subcategory || item.parentSubcategory}
                      </>
                    )}
                  </span>
                )}
                <span>{formatDate(item.parentDate)}</span>
              </div>
            </div>

            <div className="flex flex-col items-end ml-3">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                -${(item.originalAmountCents / 100).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
