"use client";

import { useEffect, useState } from "react";
import ExpenseTile from "./ExpenseTile";
import FinEditor from "./FinEditor";
import TabSwitcher from "./TabSwitcher";
import HistoryView from "./HistoryView";
import ChartsView from "./ChartsView";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectAuthStatus,
  logoutAsync,
} from "@/app/lib/redux/features/auth/authSlice";
import {
  fetchFinsAsync,
  selectFilteredFins,
  selectIsLoading,
  selectFilters,
  setFilters,
} from "@/app/lib/redux/features/fin/finSlice";
import { FinData } from "@/app/lib/types/api";

export default function Dashboard() {
  const authStatus = useAppSelector(selectAuthStatus);
  const fins = useAppSelector(selectFilteredFins);
  const isLoadingFins = useAppSelector(selectIsLoading);
  const filters = useAppSelector(selectFilters);
  const dispatch = useAppDispatch();

  // Tab state
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<"expense" | "income">("expense");
  const [editingFin, setEditingFin] = useState<FinData | undefined>(undefined);

  // Charts bottom sheet state
  const [isChartsOpen, setIsChartsOpen] = useState(false);

  const isLoading = authStatus === "loading";

  // Fetch fins on mount - show all records up to today
  useEffect(() => {
    dispatch(fetchFinsAsync());
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleOpenEditor = (type: "expense" | "income") => {
    setEditorType(type);
    setEditingFin(undefined);
    setIsEditorOpen(true);
  };

  const handleEditFin = (fin: FinData) => {
    setEditorType(fin.type as "expense" | "income");
    setEditingFin(fin);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingFin(undefined);
  };

  const handleEditorSuccess = async () => {
    // Refresh the list - show all records up to today
    await dispatch(fetchFinsAsync());
  };

  const handleFilterChange = (type: "all" | "expense" | "income") => {
    dispatch(setFilters({ type }));
  };

  // Calculate stats - only for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Filter fins to only show records up to current month
  const finsUpToNow = fins.filter((fin) => {
    const finDate = new Date(fin.date);
    return finDate <= endOfMonth;
  });

  const thisMonthExpenses = finsUpToNow
    .filter((fin) => {
      const finDate = new Date(fin.date);
      return fin.type === "expense" && finDate >= startOfMonth && finDate <= endOfMonth;
    })
    .reduce((sum, fin) => sum + fin.amountCadCents, 0);

  const thisMonthIncome = finsUpToNow
    .filter((fin) => {
      const finDate = new Date(fin.date);
      return fin.type === "income" && finDate >= startOfMonth && finDate <= endOfMonth;
    })
    .reduce((sum, fin) => sum + fin.amountCadCents, 0);

  const balance = thisMonthIncome - thisMonthExpenses;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* Hero Section with Background Image */}
      <div
        className="relative h-[370px] bg-cover bg-center"
        style={{
          backgroundImage: `url('/images/fin-l.jpg')`,
          backgroundPosition: "center 30%",
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
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>

        {/* Stats - simple text, left-aligned, no background */}
        <div className="absolute bottom-[168px] left-4 space-y-1 z-10">
          {/* Balance This Month */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-white/80">本月结余</span>
            <span
              className={`text-sm font-semibold ${
                balance >= 0 ? "text-green-300" : "text-red-300"
              }`}
            >
              {(balance / 100).toFixed(2)}
            </span>
          </div>

          {/* Expenses This Month */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-white/80">本月支出</span>
            <span className="text-sm font-semibold text-red-300">
              {(thisMonthExpenses / 100).toFixed(2)}
            </span>
          </div>

          {/* Income This Month */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-white/80">本月收入</span>
            <span className="text-sm font-semibold text-green-300">
              {(thisMonthIncome / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Dual Buttons - Middle Section */}
      <div className="flex justify-center gap-3 -mt-8 z-20 px-4">
        <button
          onClick={() => handleOpenEditor("expense")}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-12 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold text-base tracking-wider flex-1 max-w-[180px]"
        >
          支出
        </button>
        <button
          onClick={() => handleOpenEditor("income")}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-12 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold text-base tracking-wider flex-1 max-w-[180px]"
        >
          收入
        </button>
      </div>

      {/* Tab Switcher + Charts Button */}
      <div className="px-4 mt-3 flex gap-2">
        <div className="flex-1">
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <button
          onClick={() => setIsChartsOpen(true)}
          className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
          aria-label="Open charts"
        >
          <svg
            className="w-4 h-4 text-zinc-700 dark:text-zinc-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            图表
          </span>
        </button>
      </div>

      {/* Content Area - Current Month or History */}
      <div className="flex-1 overflow-visible mt-2">
        <div className="bg-white dark:bg-zinc-900 shadow-lg h-full flex flex-col">
          {activeTab === "current" ? (
            <>
              {/* Filter Bar for Current Month */}
              {/* <div className="flex justify-center gap-2 px-4 pt-4">
                {(["all", "expense", "income"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleFilterChange(type)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filters.type === type
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {type === "all" ? "All" : type === "expense" ? "Expenses" : "Income"}
                  </button>
                ))}
              </div> */}

              {/* Current Month List */}
              <div className="overflow-y-auto flex-1 mt-2">
                {isLoadingFins ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : finsUpToNow.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                    <svg
                      className="w-16 h-16 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="text-sm">No transactions yet</p>
                    <p className="text-xs mt-1">
                      Click the buttons above to add your first transaction
                    </p>
                  </div>
                ) : (
                  finsUpToNow.slice(0, 50).map((fin) => (
                    <ExpenseTile key={fin.finId} fin={fin} onClick={handleEditFin} />
                  ))
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden px-3 py-3">
              <HistoryView onFinClick={handleEditFin} />
            </div>
          )}
        </div>
      </div>

      {/* Charts Bottom Sheet */}
      <ChartsView
        isOpen={isChartsOpen}
        onClose={() => setIsChartsOpen(false)}
        onFinClick={handleEditFin}
      />

      {/* Fin Editor */}
      <FinEditor
        isOpen={isEditorOpen}
        type={editorType}
        existingFin={editingFin}
        onClose={handleCloseEditor}
        onSuccess={handleEditorSuccess}
      />
    </div>
  );
}
