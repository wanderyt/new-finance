"use client";

import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectChartsViewMode,
  selectChartsSelectedMonth,
  selectChartsSelectedYear,
  selectAvailableMonths,
  selectAvailableYears,
  setChartsViewMode,
  setChartsSelectedMonth,
  setChartsSelectedYear,
} from "@/app/lib/redux/features/fin/finSlice";
import Dropdown from "../../ui-kit/Dropdown";

export default function MonthYearFilter() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector(selectChartsViewMode);
  const selectedMonth = useAppSelector(selectChartsSelectedMonth);
  const selectedYear = useAppSelector(selectChartsSelectedYear);
  const availableMonths = useAppSelector(selectAvailableMonths);
  const availableYears = useAppSelector(selectAvailableYears);

  const handleViewModeChange = (mode: "month" | "year") => {
    dispatch(setChartsViewMode(mode));
  };

  const handleMonthChange = (value: string) => {
    dispatch(setChartsSelectedMonth(value));
  };

  const handleYearChange = (value: string) => {
    dispatch(setChartsSelectedYear(value));
  };

  // Format month for display (e.g., "2026-01" → "January 2026")
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        日期范围
      </label>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => handleViewModeChange("month")}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            viewMode === "month"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          按月
        </button>
        <button
          onClick={() => handleViewModeChange("year")}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            viewMode === "year"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          按年
        </button>
      </div>

      {/* Month/Year Selector */}
      {viewMode === "month" ? (
        <Dropdown
          value={selectedMonth || ""}
          onChange={handleMonthChange}
          options={availableMonths.map((month) => ({
            value: month,
            label: formatMonth(month),
          }))}
          placeholder="选择月份"
        />
      ) : (
        <Dropdown
          value={selectedYear || ""}
          onChange={handleYearChange}
          options={availableYears.map((year) => ({
            value: year,
            label: year,
          }))}
          placeholder="选择年份"
        />
      )}
    </div>
  );
}
