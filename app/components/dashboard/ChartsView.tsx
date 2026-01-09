"use client";

import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectCategoryChartData,
  selectCategoryExpenseList,
  selectChartsDrilldownCategory,
  selectMonthComparisonData,
  selectChartsComparisonMonth1,
  selectChartsComparisonMonth2,
  selectAvailableMonths,
  selectChartsFilteredFins,
  setChartsDrilldownCategory,
  setChartsCategoryForList,
  clearChartsCategorySelection,
  clearChartsDrilldown,
  setChartsComparisonMonths,
} from "@/app/lib/redux/features/fin/finSlice";
import { FinData } from "@/app/lib/types/api";
import BottomSheet from "../ui-kit/BottomSheet";
import MonthYearFilter from "./charts/MonthYearFilter";
import CategoryBarChart from "./charts/CategoryBarChart";
import CategoryPieChart from "./charts/CategoryPieChart";
import CategoryBreadcrumb from "./charts/CategoryBreadcrumb";
import CategoryExpenseList from "./charts/CategoryExpenseList";
import MonthComparisonLineChart from "./charts/MonthComparisonLineChart";

interface ChartsViewProps {
  isOpen: boolean;
  onClose: () => void;
  onFinClick?: (fin: FinData) => void;
}

export default function ChartsView({ isOpen, onClose, onFinClick }: ChartsViewProps) {
  const dispatch = useAppDispatch();
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Selectors
  const categoryChartData = useAppSelector(selectCategoryChartData);
  const drilldownCategory = useAppSelector(selectChartsDrilldownCategory);
  const categoryExpenseList = useAppSelector(selectCategoryExpenseList);
  const comparisonData = useAppSelector(selectMonthComparisonData);
  const month1 = useAppSelector(selectChartsComparisonMonth1);
  const month2 = useAppSelector(selectChartsComparisonMonth2);
  const availableMonths = useAppSelector(selectAvailableMonths);
  const filteredFins = useAppSelector(selectChartsFilteredFins);

  // Handlers
  const handleCategoryClick = (category: string, subcategory?: string) => {
    if (drilldownCategory) {
      // Already drilled down, clicking a subcategory → show expense list
      dispatch(setChartsCategoryForList({ category, subcategory }));
    } else {
      // Top-level, clicking a category → drill down
      dispatch(setChartsDrilldownCategory(category));
    }
  };

  const handleBreadcrumbBack = () => {
    dispatch(clearChartsDrilldown());
    dispatch(clearChartsCategorySelection());
  };

  const handleClearExpenseList = () => {
    dispatch(clearChartsCategorySelection());
  };

  const handleMonth1Change = (month: string) => {
    dispatch(setChartsComparisonMonths({ month1: month }));
  };

  const handleMonth2Change = (month: string) => {
    dispatch(setChartsComparisonMonths({ month2: month }));
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            图表分析
          </h1>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
            aria-label="Close"
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

        {/* Date Filter */}
        <MonthYearFilter />

        {/* Category Breakdown Section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              分类支出
            </h2>
            {/* Chart Type Toggle */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-700 p-0.5 rounded">
              <button
                onClick={() => setChartType("bar")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  chartType === "bar"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                柱状图
              </button>
              <button
                onClick={() => setChartType("pie")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  chartType === "pie"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                饼图
              </button>
            </div>
          </div>

          {/* Breadcrumb (if drilled down) */}
          <CategoryBreadcrumb
            drilldownCategory={drilldownCategory}
            onBack={handleBreadcrumbBack}
          />

          {/* Chart */}
          {filteredFins.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
              <p className="text-xs">No expense data for selected period</p>
            </div>
          ) : chartType === "bar" ? (
            <CategoryBarChart
              data={categoryChartData}
              drilldownCategory={drilldownCategory}
              onCategoryClick={handleCategoryClick}
              height={300}
            />
          ) : (
            <CategoryPieChart
              data={categoryChartData}
              drilldownCategory={drilldownCategory}
              onCategoryClick={handleCategoryClick}
              height={300}
            />
          )}

          {/* Expense List (when category selected) */}
          {categoryExpenseList.length > 0 && onFinClick && (
            <CategoryExpenseList
              category={categoryExpenseList[0]?.category || "Uncategorized"}
              subcategory={categoryExpenseList[0]?.subcategory || undefined}
              transactions={categoryExpenseList}
              onFinClick={onFinClick}
              onClear={handleClearExpenseList}
            />
          )}
        </section>

        {/* Month Comparison Section */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            月度对比
          </h2>

          {availableMonths.length < 2 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
              <p className="text-xs">Need at least 2 months of data for comparison</p>
            </div>
          ) : (
            <MonthComparisonLineChart
              month1={month1}
              month2={month2}
              data={comparisonData}
              availableMonths={availableMonths}
              onMonth1Change={handleMonth1Change}
              onMonth2Change={handleMonth2Change}
              height={300}
            />
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
