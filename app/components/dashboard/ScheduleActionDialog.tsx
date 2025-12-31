"use client";

interface ScheduleActionDialogProps {
  isOpen: boolean;
  action: "update" | "delete";
  onChoice: (scope: "single" | "all") => void;
  onCancel: () => void;
}

const ScheduleActionDialog = ({
  isOpen,
  action,
  onChoice,
  onCancel,
}: ScheduleActionDialogProps) => {
  if (!isOpen) return null;

  const title = action === "update" ? "Update Scheduled Transaction" : "Delete Scheduled Transaction";
  const singleLabel = action === "update" ? "This occurrence only" : "This occurrence only";
  const allLabel = action === "update" ? "This and all future occurrences" : "This and all future occurrences";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          {title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          This is a scheduled transaction. Would you like to {action} only this occurrence or all future occurrences?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onChoice("single")}
            className="w-full px-4 py-3 text-left rounded-lg border-2 border-zinc-300 dark:border-zinc-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          >
            <div className="font-medium text-zinc-900 dark:text-zinc-50">
              {singleLabel}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Only this specific transaction will be {action}d
            </div>
          </button>

          <button
            onClick={() => onChoice("all")}
            className="w-full px-4 py-3 text-left rounded-lg border-2 border-zinc-300 dark:border-zinc-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          >
            <div className="font-medium text-zinc-900 dark:text-zinc-50">
              {allLabel}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              This and all future scheduled transactions will be {action}d
            </div>
          </button>

          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-center rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-zinc-700 dark:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleActionDialog;
