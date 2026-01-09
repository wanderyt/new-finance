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
import Button from "../../ui-kit/Button";
import Select from "../../ui-kit/Select";

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

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setChartsSelectedMonth(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setChartsSelectedYear(e.target.value));
  };

  // Format month for display (e.g., "2026-01" → "January 2026")
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "month" ? "primary" : "secondary"}
          size="sm"
          onClick={() => handleViewModeChange("month")}
          className="flex-1"
        >
          Month
        </Button>
        <Button
          variant={viewMode === "year" ? "primary" : "secondary"}
          size="sm"
          onClick={() => handleViewModeChange("year")}
          className="flex-1"
        >
          Year
        </Button>
      </div>

      {/* Month/Year Selector */}
      {viewMode === "month" ? (
        <Select
          label="Select Month"
          value={selectedMonth || ""}
          onChange={handleMonthChange}
          options={availableMonths.map((month) => ({
            value: month,
            label: formatMonth(month),
          }))}
        />
      ) : (
        <Select
          label="Select Year"
          value={selectedYear || ""}
          onChange={handleYearChange}
          options={availableYears.map((year) => ({
            value: year,
            label: year,
          }))}
        />
      )}
    </div>
  );
}
