"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  fetchAllHistoryAsync,
  selectHistoryGroupedByMonth,
  selectHistoryIsLoading,
  selectHistoryError,
  selectHistoryFilterCount,
  selectHistoryFilters,
  toggleMonthExpanded,
} from "@/app/lib/redux/features/fin/finSlice";
import { FinData } from "@/app/lib/types/api";
import MonthGroup from "./MonthGroup";
import Loading from "../ui-kit/Loading";
import FilterBottomSheet from "./FilterBottomSheet";

interface HistoryViewProps {
  onFinClick: (fin: FinData) => void;
}

export default function HistoryView({ onFinClick }: HistoryViewProps) {
  const dispatch = useAppDispatch();
  const monthGroups = useAppSelector(selectHistoryGroupedByMonth);
  const isLoading = useAppSelector(selectHistoryIsLoading);
  const error = useAppSelector(selectHistoryError);
  const filterCount = useAppSelector(selectHistoryFilterCount);
  const filters = useAppSelector(selectHistoryFilters);
  const expandedMonths = useAppSelector((state) => state.fin.history.expandedMonths);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchAllHistoryAsync(filters));
  }, [dispatch, filters]);

  const handleMonthToggle = (monthKey: string) => {
    dispatch(toggleMonthExpanded(monthKey));
  };

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <svg
            className="w-16 h-16 text-zinc-400 dark:text-zinc-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
          <button
            onClick={() => dispatch(fetchAllHistoryAsync(filters))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
        <FilterBottomSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
      </>
    );
  }

  if (isLoading && monthGroups.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <Loading />
        </div>
        <FilterBottomSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
      </>
    );
  }

  if (monthGroups.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <svg
            className="w-16 h-16 text-zinc-400 dark:text-zinc-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-zinc-600 dark:text-zinc-400">
            {filterCount > 0
              ? "没有符合筛选条件的记录，请调整筛选条件"
              : "暂无交易记录"}
          </p>
          {filterCount > 0 && (
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              调整筛选
            </button>
          )}
        </div>
        <FilterBottomSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          历史记录
        </h2>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="relative px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-sm">筛选</span>
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {monthGroups.map((monthGroup) => (
          <MonthGroup
            key={monthGroup.monthKey}
            monthGroup={monthGroup}
            isExpanded={expandedMonths.includes(monthGroup.monthKey)}
            onToggle={() => handleMonthToggle(monthGroup.monthKey)}
            onFinClick={onFinClick}
          />
        ))}

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loading />
          </div>
        )}

        {!isLoading && monthGroups.length > 0 && (
          <div className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-sm">
            共 {monthGroups.reduce((sum, group) => sum + group.days.reduce((daySum, day) => daySum + day.fins.length, 0), 0)} 条记录
          </div>
        )}
      </div>

      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </div>
  );
}
