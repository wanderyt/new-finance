"use client";

import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectHistoryFilters,
  setHistoryFilters,
  fetchAllHistoryAsync,
  resetHistoryFilters,
} from "@/app/lib/redux/features/fin/finSlice";
import { SearchFilters } from "@/app/lib/types/api";
import BottomSheet from "../ui-kit/BottomSheet";
import Input from "../ui-kit/Input";
import Button from "../ui-kit/Button";
import Dropdown from "../ui-kit/Dropdown";
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
    currentFilters.type,
  );
  const [datePreset, setDatePreset] = useState(currentFilters.dateRange.preset);
  const [customStart, setCustomStart] = useState(
    currentFilters.dateRange.customStart || "",
  );
  const [customEnd, setCustomEnd] = useState(
    currentFilters.dateRange.customEnd || "",
  );
  const [minAmount, setMinAmount] = useState(
    currentFilters.amountRange?.min
      ? (currentFilters.amountRange.min / 100).toString()
      : "",
  );
  const [maxAmount, setMaxAmount] = useState(
    currentFilters.amountRange?.max
      ? (currentFilters.amountRange.max / 100).toString()
      : "",
  );
  const [categories, setCategories] = useState<string[]>(
    currentFilters.categories || [],
  );
  const [availableCategories, setAvailableCategories] = useState<
    Array<{ category: string; subcategory: string }>
  >([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Reset local state to match current filters when opening
      setKeyword(currentFilters.keyword || "");
      setType(currentFilters.type);
      setDatePreset(currentFilters.dateRange.preset);
      setCustomStart(currentFilters.dateRange.customStart || "");
      setCustomEnd(currentFilters.dateRange.customEnd || "");
      setMinAmount(
        currentFilters.amountRange?.min
          ? (currentFilters.amountRange.min / 100).toString()
          : "",
      );
      setMaxAmount(
        currentFilters.amountRange?.max
          ? (currentFilters.amountRange.max / 100).toString()
          : "",
      );
      setCategories(currentFilters.categories || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    dispatch(fetchAllHistoryAsync(filters));
    onClose();
  };

  const handleReset = () => {
    setKeyword("");
    setType("all");
    setDatePreset("all");
    setCustomStart("");
    setCustomEnd("");
    setMinAmount("");
    setMaxAmount("");
    setCategories([]);
    dispatch(resetHistoryFilters());
  };

  const toggleCategoryExpanded = (cat: string) => {
    if (expandedCategories.includes(cat)) {
      setExpandedCategories(expandedCategories.filter((c) => c !== cat));
    } else {
      setExpandedCategories([...expandedCategories, cat]);
    }
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
    new Set(availableCategories.map((c) => c.category)),
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            关键词
          </label>
          <Input
            type="text"
            placeholder="搜索商户、分类、备注..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            类型
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setType("all")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setType("expense")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === "expense"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              支出
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === "income"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              收入
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            日期范围
          </label>
          <div className="mb-2">
            <Dropdown
              value={datePreset}
              onChange={(value) => setDatePreset(value as "all" | "thisMonth" | "thisYear" | "lastYear" | "custom")}
              options={[
                { value: "all", label: "全部时间" },
                { value: "thisMonth", label: "本月" },
                { value: "thisYear", label: "今年" },
                { value: "lastYear", label: "去年" },
                { value: "custom", label: "自定义" },
              ]}
              placeholder="选择日期范围"
            />
          </div>

          {datePreset === "custom" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  label="开始日期"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  label="结束日期"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            分类
          </label>
          <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
            {uniqueCategories.map((cat) => {
              const subcats = availableCategories.filter(
                (c) => c.category === cat,
              );
              const isExpanded = expandedCategories.includes(cat);
              return (
                <div
                  key={cat}
                  className="border-b border-zinc-200 dark:border-zinc-700 last:border-0"
                >
                  <button
                    onClick={() => toggleCategoryExpanded(cat)}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                      {cat}
                    </span>
                    <svg
                      className={`w-3 h-3 text-zinc-500 dark:text-zinc-400 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-900 space-y-0.5">
                      {subcats.map((subcat) => {
                        const value = `${subcat.category}:${subcat.subcategory}`;
                        const isSelected = categories.includes(value);
                        return (
                          <label
                            key={value}
                            className="flex items-center gap-1.5 pl-1 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleCategory(
                                  subcat.category,
                                  subcat.subcategory,
                                )
                              }
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-zinc-700 dark:text-zinc-300">
                              {subcat.subcategory}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {uniqueCategories.length === 0 && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-3">
                暂无分类
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            金额范围
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="最小值"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                step="0.01"
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="最大值"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button onClick={handleApply} fullWidth>
            应用筛选
          </Button>
          <Button onClick={handleReset} variant="secondary" fullWidth>
            重置
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
