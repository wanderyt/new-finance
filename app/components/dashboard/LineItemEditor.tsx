"use client";

import { useState, useEffect, useRef } from "react";
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
    (item.originalAmountCents / 100).toFixed(2),
  );
  const [qtyInput, setQtyInput] = useState<string>(
    item.qty !== undefined ? item.qty.toString() : "",
  );
  const [unitPriceInput, setUnitPriceInput] = useState<string>(
    item.unitPriceCents ? (item.unitPriceCents / 100).toFixed(2) : "",
  );

  // Sync with external changes only (not our own updates)
  // Use a ref to track if we just updated
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    // Skip if this was triggered by our own handleChange
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    setLocalItem(item);
    setAmountInput((item.originalAmountCents / 100).toFixed(2));
    setQtyInput(
      item.qty !== undefined && item.qty !== null ? String(item.qty) : "",
    );
    setUnitPriceInput(
      item.unitPriceCents ? (item.unitPriceCents / 100).toFixed(2) : "",
    );
  }, [item]);

  const handleChange = (field: keyof LineItem, value: any) => {
    const updated = { ...localItem, [field]: value };
    setLocalItem(updated);
    isInternalUpdate.current = true;
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

    // Auto-calculate unit price if quantity exists
    if (localItem.qty && localItem.qty > 0) {
      calculateUnitPrice(cents, localItem.qty);
    }
  };

  const calculateUnitPrice = (totalCents: number, qty: number) => {
    if (qty > 0) {
      const unitPrice = totalCents / qty;
      setUnitPriceInput((unitPrice / 100).toFixed(2));
      handleChange("unitPriceCents", Math.round(unitPrice));
    }
  };

  const handleQtyChange = (value: string) => {
    setQtyInput(value);
  };

  const handleQtyBlur = () => {
    const parsedQty = parseFloat(qtyInput);
    const qty = !isNaN(parsedQty) && parsedQty !== 0 ? parsedQty : undefined;
    handleChange("qty", qty);
    // Auto-calculate unit price when qty changes
    if (qty && qty > 0) {
      calculateUnitPrice(localItem.originalAmountCents, qty);
    }
  };

  const handleUnitPriceChange = (value: string) => {
    setUnitPriceInput(value);
  };

  const handleUnitPriceBlur = () => {
    const dollars = parseFloat(unitPriceInput) || 0;
    const cents = Math.round(dollars * 100);
    setUnitPriceInput(dollars.toFixed(2));
    handleChange("unitPriceCents", cents || undefined);
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

        {/* Quantity, unit price, and unit */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <input
              type="text"
              inputMode="decimal"
              value={qtyInput}
              onChange={(e) => handleQtyChange(e.target.value)}
              onBlur={handleQtyBlur}
              placeholder="数量"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
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
              value={unitPriceInput}
              onChange={(e) => handleUnitPriceChange(e.target.value)}
              onBlur={handleUnitPriceBlur}
              placeholder="单价"
              className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <Input
            value={localItem.unit || ""}
            onChange={(e) => handleChange("unit", e.target.value || undefined)}
            placeholder="单位"
          />
        </div>

        {/* Person */}
        <div>
          <Dropdown
            options={personOptions}
            value={localItem.personId?.toString() || ""}
            onChange={(value) =>
              handleChange("personId", value ? parseInt(value) : undefined)
            }
            placeholder="人员"
          />
        </div>

        {/* Notes - show original name if available */}
        <div className="space-y-1">
          <Input
            value={localItem.notes || ""}
            onChange={(e) => handleChange("notes", e.target.value || undefined)}
            placeholder="备注"
          />
          {localItem.notes && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              原始名称: {localItem.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LineItemEditor;
