"use client";

import { useAppDispatch, useAppSelector } from "@/app/lib/redux/hooks";
import {
  fetchPriceTrend,
  selectPriceTrend,
  fetchPurchaseHistory,
} from "@/app/lib/redux/features/fin/finSlice";
import { FinData } from "@/app/lib/types/api";
import { ItemSearchInput } from "./ItemSearchInput";
import { ItemPriceTrendChart } from "./ItemPriceTrendChart";
import { PurchaseHistoryList } from "./PurchaseHistoryList";

interface ItemPriceTrendViewProps {
  onFinClick?: (fin: FinData) => void;
}

export function ItemPriceTrendView({ onFinClick }: ItemPriceTrendViewProps) {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(selectPriceTrend);

  const handleItemSelect = (itemName: string) => {
    dispatch(fetchPriceTrend(itemName));
    dispatch(fetchPurchaseHistory(itemName));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">价格趋势分析</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          查看同一商品在不同商家的价格变化趋势
        </p>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <ItemSearchInput
          onItemSelect={handleItemSelect}
          placeholder="搜索商品名称..."
        />
      </div>

      {/* Chart Area */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-zinc-300 border-t-zinc-600 rounded-full" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="flex items-center justify-center h-64 text-zinc-500 dark:text-zinc-400">
            请搜索并选择商品以查看价格趋势
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="mb-3">
              <h3 className="text-xs font-medium">{data.itemName}</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {data.merchants.length} 个商家 · {data.data.length} 周数据
              </p>
            </div>
            <ItemPriceTrendChart
              itemName={data.itemName}
              data={data.data}
              merchants={data.merchants}
            />
          </>
        )}
      </div>

      {/* Purchase History List */}
      <PurchaseHistoryList onFinClick={onFinClick} />
    </div>
  );
}
