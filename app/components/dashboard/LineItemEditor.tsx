"use client";

import { useState, useEffect, useRef, useCallback, useId, type RefObject } from "react";
import { NECESSITY_LEVELS, NECESSITY_LABELS, type NecessityFields, type NecessityLevel } from "../../lib/types/necessity";
import Input from "../ui-kit/Input";
import Dropdown from "../ui-kit/Dropdown";
import SearchableSelect from "../ui-kit/SearchableSelect";
import Button from "../ui-kit/Button";

interface AutocompleteItem {
  name: string;
  count: number;
}

/**
 * Re-sync a text buffer from a prop value when it changes and the input isn't
 * focused, so external updates are reflected without clobbering mid-typing. The
 * setState is deferred so it never runs synchronously inside the effect.
 */
function useDeferredSync<T>(
  value: T,
  isFocused: RefObject<boolean>,
  setInput: (v: string) => void,
  format: (v: T) => string,
) {
  useEffect(() => {
    if (isFocused.current) return;
    const timer = window.setTimeout(() => setInput(format(value)), 0);
    return () => window.clearTimeout(timer);
    // Only re-sync when the underlying value changes; setter/format are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

export interface LineItem extends NecessityFields {
  name: string;
  originalAmountCents: number;
  personId?: number;
  qty?: number;
  unit?: string;
  unitPriceCents?: number;
  category?: string;
  subcategory?: string;
  notes?: string;
  brandName?: string;
}

interface LineItemEditorProps {
  item: LineItem;
  index: number;
  onChange: (index: number, item: LineItem) => void;
  onRemove: (index: number) => void;
  persons?: Array<{ personId: number; name: string }>;
  brandOptions?: Array<{ value: string; label: string }>;
  className?: string;
  defaultNecessityLevel?: NecessityLevel;
  showNecessity?: boolean;
}

const LineItemEditor = ({
  item,
  index,
  onChange,
  onRemove,
  persons = [],
  brandOptions = [],
  className = "",
  defaultNecessityLevel = "essential",
  showNecessity = true,
}: LineItemEditorProps) => {
  // The `item` prop is the single source of truth for structured fields. Only
  // the raw text buffers below are local, so in-progress typing isn't clobbered.
  const [amountInput, setAmountInput] = useState<string>(
    (item.originalAmountCents / 100).toFixed(2),
  );
  const [qtyInput, setQtyInput] = useState<string>(
    item.qty != null ? item.qty.toString() : "",
  );
  const [unitPriceInput, setUnitPriceInput] = useState<string>(
    item.unitPriceCents ? (item.unitPriceCents / 100).toFixed(2) : "",
  );
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showNecessityReason, setShowNecessityReason] = useState(false);
  const necessityReasonId = useId();
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isNameFocused = useRef(false);

  // Track focus per numeric field so external prop updates never overwrite the
  // buffer while the user is mid-typing.
  const amountFocused = useRef(false);
  const qtyFocused = useRef(false);
  const unitPriceFocused = useRef(false);

  // Keep each numeric buffer in sync with the prop (our own commits set the same
  // formatted value, so these only reflect genuine external changes).
  useDeferredSync(item.originalAmountCents, amountFocused, setAmountInput, (c) =>
    (c / 100).toFixed(2),
  );
  useDeferredSync(item.qty, qtyFocused, setQtyInput, (q) =>
    q != null ? String(q) : "",
  );
  useDeferredSync(item.unitPriceCents, unitPriceFocused, setUnitPriceInput, (c) =>
    c ? (c / 100).toFixed(2) : "",
  );

  // Debounced autocomplete fetch — only runs while the name input is focused
  useEffect(() => {
    const name = item.name;
    if (!isNameFocused.current || !name || name.trim().length === 0) {
      const timer = window.setTimeout(() => {
        setAutocompleteItems([]);
        setShowAutocomplete(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = setTimeout(async () => {
      if (!isNameFocused.current) return;
      try {
        const res = await fetch(`/api/fin/items/autocomplete?q=${encodeURIComponent(name)}`);
        if (res.ok) {
          const data = await res.json();
          if (!isNameFocused.current) return;
          setAutocompleteItems(data.items ?? []);
          setShowAutocomplete(true);
        }
      } catch {
        // silently ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [item.name]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nameContainerRef.current && !nameContainerRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = <K extends keyof LineItem>(
    field: K,
    value: LineItem[K],
  ) => {
    onChange(index, { ...item, [field]: value });
  };

  const handleNameSelect = useCallback((name: string) => {
    isNameFocused.current = false;
    setShowAutocomplete(false);
    nameInputRef.current?.blur();
    onChange(index, { ...item, name });
  }, [item, index, onChange]);

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
  };

  const handleAmountBlur = () => {
    amountFocused.current = false;
    // Format to 2 decimal places and commit cents on blur
    const dollars = parseFloat(amountInput) || 0;
    const cents = Math.round(dollars * 100);
    setAmountInput(dollars.toFixed(2));

    // Merge into a single update so the recalculated unit price doesn't clobber
    // the new amount (both are derived from the same `item` snapshot).
    const updated: LineItem = { ...item, originalAmountCents: cents };
    if (item.qty && item.qty > 0) {
      const unitPrice = Math.round(cents / item.qty);
      updated.unitPriceCents = unitPrice;
      setUnitPriceInput((unitPrice / 100).toFixed(2));
    }
    onChange(index, updated);
  };

  const handleQtyChange = (value: string) => {
    setQtyInput(value);
  };

  const handleQtyBlur = () => {
    qtyFocused.current = false;
    const parsedQty = parseFloat(qtyInput);
    const qty = !isNaN(parsedQty) && parsedQty !== 0 ? parsedQty : undefined;

    const updated: LineItem = { ...item, qty };
    // Auto-calculate unit price when qty changes
    if (qty && qty > 0) {
      const unitPrice = Math.round(item.originalAmountCents / qty);
      updated.unitPriceCents = unitPrice;
      setUnitPriceInput((unitPrice / 100).toFixed(2));
    }
    onChange(index, updated);
  };

  const handleUnitPriceChange = (value: string) => {
    setUnitPriceInput(value);
  };

  const handleUnitPriceBlur = () => {
    unitPriceFocused.current = false;
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
        {/* Item name, amount, and member. */}
        <div className="relative grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
          <div className="min-w-0" ref={nameContainerRef}>
            <Input
              ref={nameInputRef}
              value={item.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onFocus={() => {
                isNameFocused.current = true;
                if (item.name.trim().length > 0) {
                  fetch(`/api/fin/items/autocomplete?q=${encodeURIComponent(item.name)}`)
                    .then((r) => r.json())
                    .then((d) => {
                      if (!isNameFocused.current) return;
                      setAutocompleteItems(d.items ?? []);
                      setShowAutocomplete(true);
                    })
                    .catch(() => {});
                }
              }}
              onBlur={() => {
                isNameFocused.current = false;
                setShowAutocomplete(false);
              }}
              placeholder="项目名称"
              required
            />
            {showAutocomplete && autocompleteItems.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {autocompleteItems.map((ac) => (
                  <button
                    key={ac.name}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleNameSelect(ac.name); }}
                    className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex justify-between items-center"
                  >
                    <span className="min-w-0 text-xs font-medium break-words">{ac.name}</span>
                    <span className="text-xs text-zinc-400 ml-2 shrink-0">{ac.count}次</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
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
              onFocus={() => { amountFocused.current = true; }}
              onBlur={handleAmountBlur}
              placeholder="0.00"
              required
              aria-label="项目金额"
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <div role="group" aria-label="人员">
            <Dropdown
              options={personOptions}
              value={item.personId?.toString() || ""}
              onChange={(value) => handleChange("personId", value ? parseInt(value) : undefined)}
              placeholder="人员"
              className="min-w-0 [&_span]:truncate [&_svg]:shrink-0"
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
              onFocus={() => { qtyFocused.current = true; }}
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
              onFocus={() => { unitPriceFocused.current = true; }}
              onBlur={handleUnitPriceBlur}
              placeholder="单价"
              className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <Input
            value={item.unit || ""}
            onChange={(e) => handleChange("unit", e.target.value || undefined)}
            placeholder="单位"
          />
        </div>

        <div className="flex items-center gap-2">
          {showNecessity && <div className="w-28 shrink-0" role="group" aria-label="支出优先级">
            <Dropdown
              value={item.necessityLevel ?? defaultNecessityLevel}
              options={NECESSITY_LEVELS.map((value) => ({ value, label: NECESSITY_LABELS[value] }))}
              onChange={(value) => {
                const necessityLevel = value as NecessityLevel;
                if (necessityLevel === item.necessityLevel) return;
                onChange(index, { ...item, necessityLevel, necessityReason: null });
              }}
            />
          </div>}
          {showNecessity && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="relative inline-flex shrink-0 items-center justify-center"
              aria-label={showNecessityReason ? "收起优先级原因" : "展开优先级原因"}
              aria-expanded={showNecessityReason}
              aria-controls={necessityReasonId}
              title={item.necessityReason?.trim() ? "编辑优先级原因" : "添加优先级原因"}
              onClick={() => setShowNecessityReason((visible) => !visible)}
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 3v18M4 7h3m-3 5h3m-3 5h3m5-10h5m-5 5h5" />
              </svg>
              {item.necessityReason?.trim() && (
                <span aria-hidden="true" className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </Button>
          )}
          <SearchableSelect
            value={item.brandName || ""}
            onChange={(value) => handleChange("brandName", value.trim() || undefined)}
            options={brandOptions}
            placeholder="品牌"
            className="min-w-0 flex-1"
          />
        </div>

        {showNecessity && showNecessityReason && (
          <Input id={necessityReasonId} autoFocus aria-label="优先级原因" value={item.necessityReason ?? ""} maxLength={300}
            onChange={(event) => handleChange("necessityReason", event.target.value || null)} placeholder="原因（可选）" />
        )}

        {/* Notes - show original name if available */}
        <div className="space-y-1">
          <Input
            value={item.notes || ""}
            onChange={(e) => handleChange("notes", e.target.value || undefined)}
            placeholder="备注"
          />
          {item.notes && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              原始名称: {item.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LineItemEditor;
