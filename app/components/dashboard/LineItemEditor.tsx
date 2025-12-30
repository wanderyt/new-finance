"use client";

import { useState, useEffect } from "react";
import Input from "../ui-kit/Input";
import Dropdown from "../ui-kit/Dropdown";

export interface LineItem {
  name: string;
  originalAmountCents: number;
  personId?: number;
  qty?: number;
  unit?: string;
  unitPriceCents?: number;
  category?: string;
  subcategory?: string;
  notes?: string;
}

interface LineItemEditorProps {
  item: LineItem;
  index: number;
  onChange: (index: number, item: LineItem) => void;
  onRemove: (index: number) => void;
  persons?: Array<{ personId: number; name: string }>;
  className?: string;
}

const LineItemEditor = ({
  item,
  index,
  onChange,
  onRemove,
  persons = [],
  className = "",
}: LineItemEditorProps) => {
  const [localItem, setLocalItem] = useState<LineItem>(item);

  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  const handleChange = (field: keyof LineItem, value: any) => {
    const updated = { ...localItem, [field]: value };
    setLocalItem(updated);
    onChange(index, updated);
  };

  const handleAmountChange = (value: string) => {
    // Convert dollars to cents
    const dollars = parseFloat(value) || 0;
    const cents = Math.round(dollars * 100);
    handleChange("originalAmountCents", cents);
  };

  const personOptions = [
    { value: "", label: "Unassigned" },
    ...persons.map((p) => ({
      value: p.personId.toString(),
      label: p.name,
    })),
  ];

  return (
    <div
      className={`border border-zinc-300 dark:border-zinc-600 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0 space-y-3">
          {/* Item name and amount */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Item Name"
              value={localItem.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Coffee"
              required
            />
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              value={(localItem.originalAmountCents / 100).toFixed(2)}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Quantity and unit */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity (optional)"
              type="number"
              step="0.01"
              value={localItem.qty || ""}
              onChange={(e) =>
                handleChange("qty", e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder="e.g., 2"
            />
            <Input
              label="Unit (optional)"
              value={localItem.unit || ""}
              onChange={(e) => handleChange("unit", e.target.value || undefined)}
              placeholder="e.g., lbs, kg"
            />
          </div>

          {/* Person assignment */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Assign to Person
            </label>
            <Dropdown
              options={personOptions}
              value={localItem.personId?.toString() || ""}
              onChange={(value) =>
                handleChange(
                  "personId",
                  value ? parseInt(value) : undefined
                )
              }
              placeholder="Unassigned"
            />
          </div>

          {/* Notes */}
          <Input
            label="Notes (optional)"
            value={localItem.notes || ""}
            onChange={(e) => handleChange("notes", e.target.value || undefined)}
            placeholder="Additional details..."
          />
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors mt-6"
          aria-label="Remove line item"
        >
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Line item summary */}
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Item #{index + 1}
        {localItem.qty && localItem.unit && (
          <span> • {localItem.qty} {localItem.unit}</span>
        )}
        {localItem.personId && persons.find((p) => p.personId === localItem.personId) && (
          <span> • Assigned to {persons.find((p) => p.personId === localItem.personId)?.name}</span>
        )}
      </div>
    </div>
  );
};

export default LineItemEditor;
