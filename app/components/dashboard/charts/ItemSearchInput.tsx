"use client";

import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/lib/redux/hooks";
import {
  fetchItemAutocomplete,
  selectItemAutocomplete,
} from "@/app/lib/redux/features/fin/finSlice";
import Input from "@/app/components/ui-kit/Input";

interface ItemSearchInputProps {
  onItemSelect: (itemName: string) => void;
  placeholder?: string;
}

export function ItemSearchInput({
  onItemSelect,
  placeholder = "搜索商品...",
}: ItemSearchInputProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(selectItemAutocomplete);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length >= 1) {
      const timer = setTimeout(() => {
        dispatch(fetchItemAutocomplete(query));
        setShowDropdown(true);
      }, 300); // Debounce 300ms
      return () => clearTimeout(timer);
    } else {
      setShowDropdown(false);
    }
  }, [query, dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-populate on focus - show all frequent items
  const handleFocus = () => {
    if (query.trim().length === 0) {
      dispatch(fetchItemAutocomplete(""));
      setShowDropdown(true);
    }
  };

  const handleSelect = (itemName: string) => {
    setQuery(itemName);
    setShowDropdown(false);
    onItemSelect(itemName);
  };

  return (
    <div className="relative" ref={inputRef}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full"
      />

      {showDropdown && items.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.name}
              onClick={() => handleSelect(item.name)}
              className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex justify-between items-center"
            >
              <span className="text-xs font-medium">{item.name}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.count}次购买
              </span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full" />
        </div>
      )}
    </div>
  );
}
