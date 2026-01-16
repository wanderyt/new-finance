"use client";

import { PersonData } from "@/app/lib/types/api";
import Dropdown from "../../ui-kit/Dropdown";

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
  const handleChange = (value: string) => {
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
      <Dropdown
        value={selectedPersonId?.toString() || ""}
        onChange={handleChange}
        options={[
          { value: "", label: "所有人员" },
          ...persons.map((person) => ({
            value: person.personId.toString(),
            label: person.name,
          })),
        ]}
        placeholder="所有人员"
        disabled={loading || persons.length === 0}
      />
      {persons.length === 0 && !loading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          请先在设置中添加人员
        </p>
      )}
    </div>
  );
}
