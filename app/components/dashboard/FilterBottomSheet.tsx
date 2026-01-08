"use client";

import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectHistoryFilters,
  setHistoryFilters,
  applyHistoryFiltersAsync,
  resetHistoryFilters,
} from "@/app/lib/redux/features/fin/finSlice";
import { SearchFilters } from "@/app/lib/types/api";
import BottomSheet from "../ui-kit/BottomSheet";
import Input from "../ui-kit/Input";
import Button from "../ui-kit/Button";
import axios from "axios";

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterBottomSheet({
  isOpen,
  onClose,
}: FilterBottomSheetProps) {
  const dispatch = useAppDispatch();
  const currentFilters = useAppSelector(selectHistoryFilters);

  const [keyword, setKeyword] = useState(currentFilters.keyword || "");
  const [type, setType] = useState<"all" | "expense" | "income">(
    currentFilters.type
  );
  const [datePreset, setDatePreset] = useState(currentFilters.dateRange.preset);
  const [customStart, setCustomStart] = useState(
    currentFilters.dateRange.customStart || ""
  );
  const [customEnd, setCustomEnd] = useState(
    currentFilters.dateRange.customEnd || ""
  );
  const [minAmount, setMinAmount] = useState(
    currentFilters.amountRange?.min
      ? (currentFilters.amountRange.min / 100).toString()
      : ""
  );
  const [maxAmount, setMaxAmount] = useState(
    currentFilters.amountRange?.max
      ? (currentFilters.amountRange.max / 100).toString()
      : ""
  );
  const [categories, setCategories] = useState<string[]>(
    currentFilters.categories || []
  );
  const [availableCategories, setAvailableCategories] = useState<
    Array<{ category: string; subcategory: string }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get<{
        success: boolean;
        categories: Array<{ category: string; subcategory: string }>;
      }>("/api/categories", { withCredentials: true });

      if (response.data.success) {
        setAvailableCategories(response.data.categories);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleApply = () => {
    const filters: SearchFilters = {
      keyword: keyword.trim() || undefined,
      type,
      dateRange: {
        preset: datePreset,
        customStart: datePreset === "custom" ? customStart : undefined,
        customEnd: datePreset === "custom" ? customEnd : undefined,
      },
      categories: categories.length > 0 ? categories : undefined,
      amountRange:
        minAmount || maxAmount
          ? {
              min: minAmount ? parseFloat(minAmount) * 100 : undefined,
              max: maxAmount ? parseFloat(maxAmount) * 100 : undefined,
            }
          : undefined,
    };

    dispatch(setHistoryFilters(filters));
    dispatch(applyHistoryFiltersAsync(filters));
    onClose();
  };

  const handleReset = () => {
    setKeyword("");
    setType("all");
    setDatePreset("thisYear");
    setCustomStart("");
    setCustomEnd("");
    setMinAmount("");
    setMaxAmount("");
    setCategories([]);
    dispatch(resetHistoryFilters());
  };

  const toggleCategory = (cat: string, subcat: string) => {
    const value = `${cat}:${subcat}`;
    if (categories.includes(value)) {
      setCategories(categories.filter((c) => c !== value));
    } else {
      setCategories([...categories, value]);
    }
  };

  const uniqueCategories = Array.from(
    new Set(availableCategories.map((c) => c.category))
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Filter Transactions
        </h2>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Keyword
          </label>
          <Input
            type="text"
            placeholder="Search merchant, category, comment..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setType("all")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setType("expense")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "expense"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "income"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Date Range
          </label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDatePreset("thisMonth")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                datePreset === "thisMonth"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset("thisYear")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                datePreset === "thisYear"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setDatePreset("custom")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                datePreset === "custom"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              Custom
            </button>
          </div>

          {datePreset === "custom" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  label="Start Date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  label="End Date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Categories
          </label>
          <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2">
            {uniqueCategories.map((cat) => {
              const subcats = availableCategories.filter(
                (c) => c.category === cat
              );
              return (
                <div key={cat} className="space-y-1">
                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {cat}
                  </div>
                  {subcats.map((subcat) => {
                    const value = `${subcat.category}:${subcat.subcategory}`;
                    const isSelected = categories.includes(value);
                    return (
                      <label
                        key={value}
                        className="flex items-center gap-2 pl-4 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleCategory(subcat.category, subcat.subcategory)
                          }
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {subcat.subcategory}
                        </span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
            {uniqueCategories.length === 0 && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                No categories available
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Amount Range
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                step="0.01"
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button onClick={handleApply} fullWidth>
            Apply Filters
          </Button>
          <Button onClick={handleReset} variant="secondary" fullWidth>
            Reset
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
