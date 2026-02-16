"use client";

import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  fetchPocketMoneyAsync,
  selectPocketMoneyBalance,
  selectPocketMoneyGroupedByMonth,
  selectPocketMoneyLoading,
  selectPocketMoneyError,
  selectExpandedMonths,
  toggleMonthExpanded,
  createPocketMoneyAsync,
  updatePocketMoneyAsync,
  deletePocketMoneyAsync,
} from "@/app/lib/redux/features/pocketMoney/pocketMoneySlice";
import {
  fetchPersonsAsync,
  selectPersons,
} from "@/app/lib/redux/features/fin/finSlice";
import type { PocketMoneyData } from "@/app/lib/types/api";
import MonthGroup from "./MonthGroup";
import PocketMoneyTile from "./PocketMoneyTile";
import PocketMoneyEditorDialog from "./PocketMoneyEditorDialog";
import Loading from "../ui-kit/Loading";

export default function PocketMoneyView() {
  const dispatch = useAppDispatch();
  const balance = useAppSelector(selectPocketMoneyBalance);
  const monthGroups = useAppSelector(selectPocketMoneyGroupedByMonth);
  const isLoading = useAppSelector(selectPocketMoneyLoading);
  const error = useAppSelector(selectPocketMoneyError);
  const expandedMonths = useAppSelector(selectExpandedMonths);
  const persons = useAppSelector(selectPersons);

  // State for selected person (default to first person)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PocketMoneyData | null>(null);

  // Fetch persons on mount
  useEffect(() => {
    dispatch(fetchPersonsAsync());
  }, [dispatch]);

  // Set default person when persons are loaded (Robin or Luna only)
  useEffect(() => {
    if (persons.length > 0 && selectedPersonId === null) {
      // Find Robin or Luna as default
      const childPerson = persons.find((p) => ['Robin', 'Luna'].includes(p.name) && p.isActive);
      if (childPerson) {
        setSelectedPersonId(childPerson.personId);
      }
    }
  }, [persons, selectedPersonId]);

  // Fetch pocket money when person changes
  useEffect(() => {
    if (selectedPersonId !== null) {
      dispatch(fetchPocketMoneyAsync(selectedPersonId));
    }
  }, [dispatch, selectedPersonId]);

  const handleMonthToggle = (monthKey: string) => {
    dispatch(toggleMonthExpanded(monthKey));
  };

  const handleTransactionClick = (transaction: PocketMoneyData) => {
    setSelectedTransaction(transaction);
    setIsEditorOpen(true);
  };

  const handleAddClick = () => {
    setSelectedTransaction(null);
    setIsEditorOpen(true);
  };

  const handleSave = async (data: {
    transaction_type: "bonus" | "deduction" | "expense";
    amount_cents: number;
    reason: string;
    transaction_date?: string;
  }) => {
    if (!selectedPersonId) return;

    if (selectedTransaction) {
      // Update existing transaction
      await dispatch(
        updatePocketMoneyAsync({
          id: selectedTransaction.pocket_money_id,
          data: {
            ...data,
            person_id: selectedPersonId,
          },
        })
      ).unwrap();
    } else {
      // Create new transaction
      await dispatch(
        createPocketMoneyAsync({
          ...data,
          person_id: selectedPersonId,
        })
      ).unwrap();
    }
  };

  const handleDelete = async (id: number) => {
    await dispatch(deletePocketMoneyAsync(id)).unwrap();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <svg
          className="w-16 h-16 text-zinc-400 dark:text-zinc-600"
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
        <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
        <button
          onClick={() => selectedPersonId && dispatch(fetchPocketMoneyAsync(selectedPersonId))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (isLoading && monthGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading />
      </div>
    );
  }

  // Find the selected person's name
  const selectedPerson = persons.find((p) => p.personId === selectedPersonId);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Person Tabs */}
        {persons.length > 0 && (
          <div className="flex gap-2 mb-4">
            {persons
              .filter((person) => person.isActive && ['Robin', 'Luna'].includes(person.name))
              .map((person) => (
                <button
                  key={person.personId}
                  onClick={() => setSelectedPersonId(person.personId)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPersonId === person.personId
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {person.name}
                </button>
              ))}
          </div>
        )}

        {/* Balance Card */}
        <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {selectedPerson?.name}的当前余额
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${(balance / 100).toFixed(2)}
          </div>
        </div>

        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            交易记录
          </h2>
          <button
            onClick={handleAddClick}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            添加交易
          </button>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto">
          {monthGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <svg
                className="w-16 h-16 text-zinc-400 dark:text-zinc-600"
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
              <p className="text-zinc-600 dark:text-zinc-400">
                暂无交易记录
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {monthGroups.map((monthGroup) => (
                <MonthGroup
                  key={monthGroup.monthKey}
                  monthGroup={monthGroup}
                  isExpanded={expandedMonths.includes(monthGroup.monthKey)}
                  onToggle={() => handleMonthToggle(monthGroup.monthKey)}
                  renderTile={(fin) => (
                    <PocketMoneyTile
                      key={(fin as any).pocket_money_id}
                      transaction={fin as any}
                      onClick={handleTransactionClick}
                    />
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Dialog */}
      <PocketMoneyEditorDialog
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onSave={handleSave}
        onDelete={selectedTransaction ? handleDelete : undefined}
      />
    </>
  );
}
