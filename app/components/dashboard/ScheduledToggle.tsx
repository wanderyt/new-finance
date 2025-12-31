"use client";

import { useState } from "react";
import Toggle from "../ui-kit/Toggle";
import Select from "../ui-kit/Select";

interface ScheduledToggleProps {
  isScheduled: boolean;
  frequency?: "daily" | "weekly" | "biweekly" | "monthly" | "annually";
  onScheduledChange: (isScheduled: boolean) => void;
  onFrequencyChange: (frequency: "daily" | "weekly" | "biweekly" | "monthly" | "annually") => void;
  className?: string;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];

const ScheduledToggle = ({
  isScheduled,
  frequency = "monthly",
  onScheduledChange,
  onFrequencyChange,
  className = "",
}: ScheduledToggleProps) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <Toggle
        id="scheduled-toggle"
        label="Scheduled Transaction"
        checked={isScheduled}
        onChange={(e) => onScheduledChange(e.target.checked)}
      />

      {isScheduled && (
        <div className="ml-14 animate-fade-in">
          <Select
            label="Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(e) => onFrequencyChange(e.target.value as typeof frequency)}
          />
        </div>
      )}
    </div>
  );
};

export default ScheduledToggle;
