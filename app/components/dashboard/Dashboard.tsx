"use client";

import { useEffect, useState } from "react";
import ExpenseTile from "./ExpenseTile";
import FinEditor from "./FinEditor";
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

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<"expense" | "income">("expense");
  const [editingFin, setEditingFin] = useState<FinData | undefined>(undefined);

  const isLoading = authStatus === "loading";

  // Fetch fins on mount
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
    // Refresh the list
    await dispatch(fetchFinsAsync());
  };

  const handleFilterChange = (type: "all" | "expense" | "income") => {
    dispatch(setFilters({ type }));
  };

  // Calculate stats
  const thisMonthExpenses = fins
    .filter((fin) => fin.type === "expense")
    .reduce((sum, fin) => sum + fin.amountCadCents, 0);

  const thisMonthIncome = fins
    .filter((fin) => fin.type === "income")
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

        {/* Stats - positioned higher, side by side */}
        <div className="absolute bottom-[168px] left-4 right-4 flex gap-3 z-10">
          <div className="bg-black/30 rounded-lg px-4 py-2.5 shadow-lg flex-1">
            <div className="text-xs text-white/90 font-medium">
              Balance This Month
            </div>
            <div
              className={`text-2xl font-bold ${
                balance >= 0 ? "text-green-300" : "text-red-300"
              }`}
            >
              ${(Math.abs(balance) / 100).toFixed(2)}
            </div>
          </div>
          <div className="bg-black/30 rounded-lg px-4 py-2.5 shadow-lg flex-1">
            <div className="text-xs text-white/90 font-medium">
              Expenses This Month
            </div>
            <div className="text-xl font-bold text-red-300">
              -${(thisMonthExpenses / 100).toFixed(2)}
            </div>
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

      {/* Filter Bar */}
      <div className="flex justify-center gap-2 mt-4 px-4">
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
      </div>

      {/* Expense List - Lower Section */}
      <div className="flex-1 overflow-visible mt-4">
        <div className="bg-white dark:bg-zinc-900 shadow-lg h-full flex flex-col">
          <div className="overflow-y-auto flex-1">
            {isLoadingFins ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : fins.length === 0 ? (
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
              fins.map((fin) => (
                <ExpenseTile key={fin.finId} fin={fin} onClick={handleEditFin} />
              ))
            )}
          </div>
        </div>
      </div>

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
