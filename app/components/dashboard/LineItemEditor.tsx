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
  const [amountInput, setAmountInput] = useState<string>(
    (item.originalAmountCents / 100).toFixed(2)
  );

  useEffect(() => {
    setLocalItem(item);
    setAmountInput((item.originalAmountCents / 100).toFixed(2));
  }, [item]);

  const handleChange = (field: keyof LineItem, value: any) => {
    const updated = { ...localItem, [field]: value };
    setLocalItem(updated);
    onChange(index, updated);
  };

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
  };

  const handleAmountBlur = () => {
    // Format to 2 decimal places and update cents on blur
    const dollars = parseFloat(amountInput) || 0;
    const cents = Math.round(dollars * 100);
    setAmountInput(dollars.toFixed(2));
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
            placeholder="项目名称"
            required
          />
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <input
              type="number"
              step="0.01"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={handleAmountBlur}
              placeholder="0.00"
              required
              className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
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
            placeholder="数量"
          />
          <Input
            value={localItem.unit || ""}
            onChange={(e) => handleChange("unit", e.target.value || undefined)}
            placeholder="单位"
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
            placeholder="人员"
          />
        </div>

        {/* Notes */}
        <Input
          value={localItem.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value || undefined)}
          placeholder="备注"
        />
      </div>
    </div>
  );
};

export default LineItemEditor;
