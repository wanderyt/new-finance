"use client";

import { useEffect } from "react";
import ExpenseTile from "./ExpenseTile";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectAuthStatus,
  logoutAsync
} from "@/app/lib/redux/features/auth/authSlice";
import {
  fetchFinListAsync,
  selectFinItems,
  selectFinListStatus,
  selectFinListError,
} from "@/app/lib/redux/features/fin/finSlice";
import { FinData } from "@/app/lib/types/api";

export default function Dashboard() {
  const authStatus = useAppSelector(selectAuthStatus);
  const finItems = useAppSelector(selectFinItems);
  const listStatus = useAppSelector(selectFinListStatus);
  const listError = useAppSelector(selectFinListError);
  const dispatch = useAppDispatch();

  const isLoading = authStatus === "loading" || listStatus === "loading";

  // Fetch fin list on component mount
  useEffect(() => {
    dispatch(fetchFinListAsync({
      limit: 20,
      type: "all",
      dateTo: new Date().toISOString(),
    }));
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      // Success - Redux state will update and trigger navigation
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if API fails, local state is cleared
    }
  };

  const handleAddExpense = () => {
    console.log("Add expense clicked - will open bottom sheet");
  };

  // Format amount with sign and symbol
  function formatAmount(type: string, amountCents: number, currency: string): string {
    const sign = type === "expense" ? "-" : "+";
    const amount = (amountCents / 100).toFixed(2);

    const currencySymbol = {
      CAD: "$",
      USD: "$",
      CNY: "¥"
    }[currency] || "";

    return `${sign}${currencySymbol}${amount}`;
  }

  // Format exchange info for tooltip
  function formatExchangeInfo(item: FinData) {
    return {
      usd: `$${(item.amountUsdCents / 100).toFixed(2)}`,
      cny: `¥${(item.amountCnyCents / 100).toFixed(2)}`,
    };
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* Hero Section with Background Image */}
      <div
        className="relative h-[370px] bg-cover bg-center"
        style={{
          backgroundImage: `url('/images/fin-l.jpg')`,
          backgroundPosition: 'center 30%'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Logout Icon - top left */}
        <button
          onClick={handleLogout}
          disabled={isLoading}
          aria-label="Logout"
          className="absolute top-4 left-4 p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50 z-20"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>

        {/* Stats - positioned higher, side by side */}
        <div className="absolute bottom-[168px] left-4 right-4 flex gap-3 z-10">
          <div className="bg-black/30 rounded-lg px-4 py-2.5 shadow-lg flex-1">
            <div className="text-xs text-white/90 font-medium">Total Balance This Month</div>
            <div className="text-2xl font-bold text-white">$12,450</div>
          </div>
          <div className="bg-black/30 rounded-lg px-4 py-2.5 shadow-lg flex-1">
            <div className="text-xs text-white/90 font-medium">Total Expense This Week</div>
            <div className="text-xl font-bold text-red-300">-$335.49</div>
          </div>
        </div>
      </div>

      {/* Add Button - Middle Section */}
      <div className="flex justify-center -mt-8 z-20">
        <button
          onClick={handleAddExpense}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-20 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold text-lg tracking-wider"
        >
          记一笔
        </button>
      </div>

      {/* Expense List - Lower Section */}
      <div className="flex-1 overflow-visible -mt-2.5">
        <div className="bg-white dark:bg-zinc-900 shadow-lg h-full flex flex-col">
          <div className="overflow-y-auto flex-1">
            {/* Loading state */}
            {listStatus === "loading" && (
              <div className="flex items-center justify-center py-8">
                <div className="text-zinc-500">Loading transactions...</div>
              </div>
            )}

            {/* Error state */}
            {listStatus === "failed" && listError && (
              <div className="flex items-center justify-center py-8">
                <div className="text-red-500">Error: {listError}</div>
              </div>
            )}

            {/* Empty state */}
            {listStatus === "succeeded" && finItems.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-zinc-500">No transactions found</div>
              </div>
            )}

            {/* Success state with data */}
            {listStatus === "succeeded" && finItems.length > 0 && (
              finItems.map((item) => (
                <ExpenseTile
                  key={item.finId}
                  category={item.category || "Uncategorized"}
                  subcategory={item.subcategory || undefined}
                  merchant={item.merchant || "Unknown"}
                  place={item.place || item.city || "Unknown"}
                  isScheduled={item.isScheduled}
                  amount={formatAmount(item.type, item.originalAmountCents, item.originalCurrency)}
                  currency={item.originalCurrency}
                  exchangeInfo={formatExchangeInfo(item)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
