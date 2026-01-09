"use client";

interface CategoryBreadcrumbProps {
  drilldownCategory?: string;
  onBack: () => void;
}

export default function CategoryBreadcrumb({
  drilldownCategory,
  onBack,
}: CategoryBreadcrumbProps) {
  if (!drilldownCategory) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 mb-2">
      <button
        onClick={onBack}
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        所有分类
      </button>
      <span className="text-zinc-400 dark:text-zinc-600">›</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {drilldownCategory}
      </span>
    </div>
  );
}
