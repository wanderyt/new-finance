"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/lib/redux/hooks";
import {
  loadMorePurchaseHistory,
  selectPurchaseHistoryRecords,
  selectPurchaseHistoryLoading,
  selectPurchaseHistoryHasMore,
  selectPurchaseHistoryTotal,
} from "@/app/lib/redux/features/fin/finSlice";

export function PurchaseHistoryList() {
  const dispatch = useAppDispatch();
  const records = useAppSelector(selectPurchaseHistoryRecords) || [];
  const loading = useAppSelector(selectPurchaseHistoryLoading);
  const hasMore = useAppSelector(selectPurchaseHistoryHasMore);
  const total = useAppSelector(selectPurchaseHistoryTotal);

  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(loadMorePurchaseHistory());
    }
  }, [dispatch, loading, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore]);

  if (!records || (records.length === 0 && !loading)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">购买记录</h3>
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          共 {total} 条记录
        </span>
      </div>

      {/* Records List */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {records.map((record) => {
            const date = new Date(record.date);
            const weekday = new Intl.DateTimeFormat("zh-CN", {
              weekday: "short",
            }).format(date);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const timeString = `${weekday} @ ${month}月${day}日`;

            return (
              <div
                key={`${record.finId}-${record.item.itemId}`}
                className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left Side - Transaction Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Item Name - Highlighted */}
                    <div className="flex items-center gap-1.5">
                      <div className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {record.item.name}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">
                        × {record.item.qty}
                      </span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        ${record.item.pricePerUnit.toFixed(2)} / 件
                      </span>
                    </div>

                    {/* Category > Subcategory */}
                    <div className="text-xs text-zinc-900 dark:text-zinc-100">
                      {record.category}
                      {record.subcategory && (
                        <>
                          <span className="text-zinc-400 dark:text-zinc-600 mx-1">›</span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {record.subcategory}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Merchant & Date */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">{record.merchant}</span>
                      <span className="text-zinc-400 dark:text-zinc-600">•</span>
                      <span>{timeString}</span>
                    </div>

                    {/* Comment if exists */}
                    {record.comment && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                        "{record.comment}"
                      </div>
                    )}
                  </div>

                  {/* Right Side - Amount */}
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      ${record.item.totalPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      项目价格
                    </div>
                    <div className="mt-0.5 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded">
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        总计: ${(record.amountCadCents / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="animate-spin h-5 w-5 border-3 border-zinc-300 border-t-zinc-600 rounded-full" />
          </div>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && !loading && <div ref={observerTarget} className="h-4" />}

        {/* End message */}
        {!hasMore && records.length > 0 && (
          <div className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700">
            已显示全部记录
          </div>
        )}
      </div>
    </div>
  );
}
