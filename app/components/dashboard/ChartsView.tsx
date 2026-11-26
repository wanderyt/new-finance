"use client";

import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectMonthComparisonData,
  selectChartsComparisonMonth1,
  selectChartsComparisonMonth2,
  selectAvailableMonthsForComparison,
  setChartsComparisonMonths,
  fetchPersonsAsync,
} from "@/app/lib/redux/features/fin/finSlice";
import { FinData } from "@/app/lib/types/api";
import BottomSheet from "../ui-kit/BottomSheet";
import MonthYearFilter from "./charts/MonthYearFilter";
import NecessityAnalysisView from "./charts/NecessityAnalysisView";
import CategoryAnalysisView from "./charts/CategoryAnalysisView";
import MonthComparisonLineChart from "./charts/MonthComparisonLineChart";
import PersonAnalysisView from "./charts/PersonAnalysisView";
import { ItemPriceTrendView } from "./charts/ItemPriceTrendView";

interface ChartsViewProps {
  isOpen: boolean;
  onClose: () => void;
  onFinClick?: (fin: FinData) => void;
}

export default function ChartsView({ isOpen, onClose, onFinClick }: ChartsViewProps) {
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState<"necessity" | "category" | "comparison" | "person" | "price-trend">("category");

  // Selectors
  const comparisonData = useAppSelector(selectMonthComparisonData);
  const month1 = useAppSelector(selectChartsComparisonMonth1);
  const month2 = useAppSelector(selectChartsComparisonMonth2);
  const availableMonths = useAppSelector(selectAvailableMonthsForComparison);

  // Handlers
  const handleMonth1Change = (month: string) => {
    dispatch(setChartsComparisonMonths({ month1: month }));
  };

  const handleMonth2Change = (month: string) => {
    dispatch(setChartsComparisonMonths({ month2: month }));
  };

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchPersonsAsync());
    }
  }, [dispatch, isOpen]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-2">
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

        {/* View Mode Tabs */}
        <div className="flex flex-nowrap gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" onClick={() => setViewMode("necessity")}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium ${viewMode === "necessity" ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"}`}>
            支出优先级
          </button>
          <button
            onClick={() => setViewMode("category")}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "category"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            分类视图
          </button>
          <button
            onClick={() => setViewMode("comparison")}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "comparison"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            月度对比
          </button>
          <button
            onClick={() => setViewMode("person")}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "person"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            个人分析
          </button>
          <button
            onClick={() => setViewMode("price-trend")}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "price-trend"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            价格趋势
          </button>
        </div>

        {/* Date Filter - Only show for category, comparison, and person views */}
        {viewMode !== "price-trend" && <MonthYearFilter excludeFuture={viewMode === "necessity" || viewMode === "category"} />}

        {isOpen && viewMode === "necessity" && <NecessityAnalysisView onFinClick={onFinClick} />}

        {isOpen && viewMode === "category" && <CategoryAnalysisView onFinClick={onFinClick} />}

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

        {/* Person Analysis View */}
        {viewMode === "person" && <PersonAnalysisView />}

        {/* Price Trend View */}
        {viewMode === "price-trend" && <ItemPriceTrendView onFinClick={onFinClick} />}
      </div>
    </BottomSheet>
  );
}
