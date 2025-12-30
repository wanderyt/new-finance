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

  const personOptions = persons.map((p) => ({
    value: p.personId.toString(),
    label: p.name,
  }));

  return (
    <div
      className={`relative border border-zinc-300 dark:border-zinc-600 rounded-lg p-3 ${className}`}
    >
      {/* Remove button - absolute positioned outside top right */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute -top-2 -right-2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors bg-white dark:bg-zinc-900 shadow-sm"
        aria-label="Remove line item"
      >
        <svg
          className="w-4 h-4 text-red-500"
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

      <div className="space-y-2">
        {/* Item name and amount */}
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={localItem.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Item name"
            required
          />
          <Input
            type="number"
            step="0.01"
            value={(localItem.originalAmountCents / 100).toFixed(2)}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="Amount"
            required
          />
        </div>

        {/* Quantity, unit, and person */}
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={localItem.qty || ""}
            onChange={(e) =>
              handleChange("qty", e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="Quantity"
          />
          <Input
            value={localItem.unit || ""}
            onChange={(e) => handleChange("unit", e.target.value || undefined)}
            placeholder="Unit"
          />
          <Dropdown
            options={personOptions}
            value={localItem.personId?.toString() || ""}
            onChange={(value) =>
              handleChange(
                "personId",
                value ? parseInt(value) : undefined
              )
            }
            placeholder="Person"
          />
        </div>

        {/* Notes */}
        <Input
          value={localItem.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value || undefined)}
          placeholder="Notes"
        />
      </div>
    </div>
  );
};

export default LineItemEditor;
