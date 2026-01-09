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
  const [chartType, setChartType] = useState<"bar" | "pie">("pie");
  const [viewMode, setViewMode] = useState<"category" | "comparison">("category");

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
      <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            图表分析
          </h1>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
            aria-label="关闭"
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

        {/* Date Filter */}
        <MonthYearFilter />

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("category")}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "category"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            分类视图
          </button>
          <button
            onClick={() => setViewMode("comparison")}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "comparison"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            月度对比
          </button>
        </div>

        {/* Category View */}
        {viewMode === "category" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                图表类型
              </label>
              {/* Chart Type Toggle */}
              <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-700 p-0.5 rounded">
                <button
                  onClick={() => setChartType("pie")}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    chartType === "pie"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  饼图
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    chartType === "bar"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  柱状图
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
              <div className="text-center py-6 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <p className="text-xs">所选时段无支出数据</p>
              </div>
            ) : chartType === "pie" ? (
              <CategoryPieChart
                data={categoryChartData}
                drilldownCategory={drilldownCategory}
                onCategoryClick={handleCategoryClick}
                height={220}
              />
            ) : (
              <CategoryBarChart
                data={categoryChartData}
                drilldownCategory={drilldownCategory}
                onCategoryClick={handleCategoryClick}
                height={220}
              />
            )}

            {/* Expense List (when category selected) */}
            {categoryExpenseList.length > 0 && onFinClick && (
              <CategoryExpenseList
                category={categoryExpenseList[0]?.category || "未分类"}
                subcategory={categoryExpenseList[0]?.subcategory || undefined}
                transactions={categoryExpenseList}
                onFinClick={onFinClick}
                onClear={handleClearExpenseList}
              />
            )}
          </div>
        )}

        {/* Comparison View */}
        {viewMode === "comparison" && (
          <div>
            {availableMonths.length < 2 ? (
              <div className="text-center py-6 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <p className="text-xs">至少需要2个月的数据才能对比</p>
              </div>
            ) : (
              <MonthComparisonLineChart
                month1={month1}
                month2={month2}
                data={comparisonData}
                availableMonths={availableMonths}
                onMonth1Change={handleMonth1Change}
                onMonth2Change={handleMonth2Change}
                height={280}
              />
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
