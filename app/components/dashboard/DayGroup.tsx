import { DayGroup as DayGroupType } from "@/app/lib/types/api";
import { FinData } from "@/app/lib/types/api";
import ExpenseTile from "./ExpenseTile";

interface DayGroupProps {
  dayGroup: DayGroupType;
  onFinClick?: (fin: FinData) => void;
  renderTile?: (fin: FinData) => React.ReactNode;
}

export default function DayGroup({ dayGroup, onFinClick, renderTile }: DayGroupProps) {
  const { date, fins, totalCents } = dayGroup;

  const dayNumber = date.getUTCDate();
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date);

  const formattedTotal = (totalCents / 100).toFixed(2);

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {dayNumber}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {weekday}
          </span>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          ¥ {formattedTotal}
        </span>
      </div>

      <div className="space-y-1 px-2 py-1">
        {renderTile
          ? fins.map((fin) => renderTile(fin))
          : fins.map((fin) => (
              <ExpenseTile key={fin.finId} fin={fin} onClick={onFinClick!} />
            ))}
      </div>
    </div>
  );
}
