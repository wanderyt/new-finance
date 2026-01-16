"use client";

import { useState, useEffect, useCallback } from "react";
import BottomSheet from "../ui-kit/BottomSheet";
import Button from "../ui-kit/Button";
import Dropdown from "../ui-kit/Dropdown";
import { HistoricalDataItem, HistoricalDataResponse } from "@/app/lib/types/api";

interface HistoricalDataSheetProps {
  isOpen: boolean;
  merchant: string;
  onConfirm: (selections: HistoricalDataItem[]) => void;
  onCancel: () => void;
}

export default function HistoricalDataSheet({
  isOpen,
  merchant,
  onConfirm,
  onCancel,
}: HistoricalDataSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalDataResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Single selection state for each section
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDetail, setSelectedDetail] = useState("");

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/fin/history?merchant=${encodeURIComponent(merchant)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch historical data");
      }

      const data: HistoricalDataResponse = await response.json();

      if (data.success) {
        setHistoricalData(data.data);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error fetching historical data:", err);
      setError("无法加载历史数据");
    } finally {
      setIsLoading(false);
    }
  }, [merchant]);

  // Fetch historical data when modal opens
  useEffect(() => {
    if (isOpen && merchant) {
      fetchHistoricalData();
    } else {
      // Reset state when modal closes
      setHistoricalData(null);
      setSelectedCategory("");
      setSelectedLocation("");
      setSelectedDetail("");
      setError(null);
    }
  }, [isOpen, merchant, fetchHistoricalData]);

  // Handle confirm button click
  const handleConfirm = () => {
    const selections: HistoricalDataItem[] = [];

    // Parse selected values and convert to HistoricalDataItem format
    if (selectedCategory) {
      const [category, subcategory] = selectedCategory.split(":");
      selections.push({ type: "category", category, subcategory });
    }

    if (selectedLocation) {
      const [place, city] = selectedLocation.split(":");
      selections.push({ type: "location", place, city });
    }

    if (selectedDetail) {
      selections.push({ type: "detail", detail: selectedDetail });
    }

    onConfirm(selections);
  };

  // Check if there's any data to display
  const hasData =
    historicalData &&
    (historicalData.categories.length > 0 ||
      historicalData.locations.length > 0 ||
      historicalData.details.length > 0);

  // Check if any selection has been made
  const hasSelections = selectedCategory || selectedLocation || selectedDetail;

  // Prepare dropdown options
  const categoryOptions = historicalData?.categories.map((item) => ({
    value: `${item.category}:${item.subcategory}`,
    label: `${item.category} - ${item.subcategory}`,
  })) || [];

  const locationOptions = historicalData?.locations.map((item) => {
    const displayText = [item.place, item.city].filter(Boolean).join(" - ");
    return {
      value: `${item.place}:${item.city}`,
      label: displayText,
    };
  }) || [];

  const detailOptions = historicalData?.details.map((detail) => ({
    value: detail,
    label: detail,
  })) || [];

  return (
    <BottomSheet isOpen={isOpen} onClose={onCancel}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Choose Details
          </h2>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              加载中...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="w-12 h-12 text-red-500 mb-3"
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
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {error}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && !hasData && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              没有历史记录
            </p>
          </div>
        )}

        {/* Dropdown Sections */}
        {!isLoading && !error && hasData && (
          <div className="space-y-4">
            {/* Categories Dropdown */}
            {categoryOptions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  分类
                </label>
                <Dropdown
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={[
                    { value: "", label: "不选择" },
                    ...categoryOptions,
                  ]}
                  placeholder="选择分类"
                />
              </div>
            )}

            {/* Locations Dropdown */}
            {locationOptions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  地点
                </label>
                <Dropdown
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  options={[
                    { value: "", label: "不选择" },
                    ...locationOptions,
                  ]}
                  placeholder="选择地点"
                />
              </div>
            )}

            {/* Details Dropdown */}
            {detailOptions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  详细说明
                </label>
                <Dropdown
                  value={selectedDetail}
                  onChange={setSelectedDetail}
                  options={[
                    { value: "", label: "不选择" },
                    ...detailOptions,
                  ]}
                  placeholder="选择详细说明"
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isLoading && !error && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button
              type="button"
              onClick={onCancel}
              variant="secondary"
              className="flex-1"
            >
              取消
            </Button>
            {hasData && (
              <Button
                type="button"
                onClick={handleConfirm}
                variant="primary"
                className="flex-1"
                disabled={!hasSelections}
              >
                确定
              </Button>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
