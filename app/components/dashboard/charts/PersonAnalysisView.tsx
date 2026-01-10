"use client";

import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectPersons,
  selectChartsSelectedPersonId,
  selectPersonSpendingData,
  selectSelectedPersonItems,
  selectPersonCategoryData,
  selectPersonItemsLoading,
  selectChartsViewMode,
  selectChartsSelectedMonth,
  selectChartsSelectedYear,
  fetchPersonItemsForChartsAsync,
  setChartsSelectedPerson,
} from "@/app/lib/redux/features/fin/finSlice";
import PersonSelector from "./PersonSelector";
import PersonSpendingPieChart from "./PersonSpendingPieChart";
import PersonCategoryPieChart from "./PersonCategoryPieChart";
import PersonItemsList from "./PersonItemsList";

export default function PersonAnalysisView() {
  const dispatch = useAppDispatch();

  const persons = useAppSelector(selectPersons);
  const selectedPersonId = useAppSelector(selectChartsSelectedPersonId);
  const spendingData = useAppSelector(selectPersonSpendingData);
  const selectedPersonItems = useAppSelector(selectSelectedPersonItems);
  const personCategoryData = useAppSelector(selectPersonCategoryData);
  const loading = useAppSelector(selectPersonItemsLoading);
  const viewMode = useAppSelector(selectChartsViewMode);
  const selectedMonth = useAppSelector(selectChartsSelectedMonth);
  const selectedYear = useAppSelector(selectChartsSelectedYear);

  useEffect(() => {
    dispatch(
      fetchPersonItemsForChartsAsync({
        viewMode,
        selectedMonth,
        selectedYear,
      })
    );
  }, [dispatch, viewMode, selectedMonth, selectedYear]);

  const handlePersonChange = (personId?: number) => {
    dispatch(setChartsSelectedPerson(personId));
  };

  const handlePersonClick = (personId: number) => {
    dispatch(setChartsSelectedPerson(personId));
  };

  const handleClearSelection = () => {
    dispatch(setChartsSelectedPerson(undefined));
  };

  const selectedPerson = persons.find(p => p.personId === selectedPersonId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 mx-auto text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
            加载中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PersonSelector
        persons={persons}
        selectedPersonId={selectedPersonId}
        onPersonChange={handlePersonChange}
        loading={loading}
      />

      {!loading && persons.length > 0 && spendingData.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-50"
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
          <p className="text-xs">所选时段无个人支出数据</p>
        </div>
      )}

      {!selectedPersonId && spendingData.length > 0 && (
        <PersonSpendingPieChart
          data={spendingData}
          onPersonClick={handlePersonClick}
          height={220}
        />
      )}

      {selectedPersonId && selectedPersonItems.length > 0 && selectedPerson && (
        <div className="space-y-3">
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedPerson.name} - 分类分布
              </h3>
              <button
                onClick={handleClearSelection}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                aria-label="返回"
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
            </div>
            <PersonCategoryPieChart data={personCategoryData} height={180} />
          </div>

          <PersonItemsList
            personName={selectedPerson.name}
            items={selectedPersonItems}
            onClear={handleClearSelection}
          />
        </div>
      )}
    </div>
  );
}
