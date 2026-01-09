interface TabSwitcherProps {
  activeTab: "current" | "history";
  onTabChange: (tab: "current" | "history") => void;
}

export default function TabSwitcher({
  activeTab,
  onTabChange,
}: TabSwitcherProps) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => onTabChange("current")}
        className={`
          flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all
          ${
            activeTab === "current"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }
        `}
      >
        当月账单
      </button>
      <button
        onClick={() => onTabChange("history")}
        className={`
          flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all
          ${
            activeTab === "history"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }
        `}
      >
        历史记录
      </button>
    </div>
  );
}
