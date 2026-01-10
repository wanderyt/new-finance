"use client";

import { PersonData } from "@/app/lib/types/api";

interface PersonSelectorProps {
  persons: PersonData[];
  selectedPersonId?: number;
  onPersonChange: (personId: number | undefined) => void;
  loading?: boolean;
}

export default function PersonSelector({
  persons,
  selectedPersonId,
  onPersonChange,
  loading = false,
}: PersonSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      onPersonChange(undefined);
    } else {
      onPersonChange(parseInt(value));
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        选择人员
      </label>
      <select
        value={selectedPersonId?.toString() || ""}
        onChange={handleChange}
        disabled={loading || persons.length === 0}
        className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">所有人员</option>
        {persons.map((person) => (
          <option key={person.personId} value={person.personId}>
            {person.name}
          </option>
        ))}
      </select>
      {persons.length === 0 && !loading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          请先在设置中添加人员
        </p>
      )}
    </div>
  );
}
