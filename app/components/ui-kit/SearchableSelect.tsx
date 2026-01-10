"use client";

import { useState, useRef, useEffect } from "react";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  icon,
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionSelectedRef = useRef(false); // Track if option was just selected

  // Sync input value with prop value when prop changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Accept current input value when clicking outside
        if (inputValue.trim()) {
          onChange(inputValue.trim());
        }
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, onChange]);

  // Filter options based on input
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Immediately update final value
    if (!isOpen) setIsOpen(true);
  };

  const handleOptionClick = (option: { value: string; label: string }) => {
    optionSelectedRef.current = true; // Mark that option was selected
    setInputValue(option.label); // Set input to selected option
    onChange(option.value); // Set final value to selected option
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow option click to register
    setTimeout(() => {
      // Only accept input value if an option wasn't just selected
      if (!optionSelectedRef.current && inputValue.trim()) {
        onChange(inputValue.trim());
      }
      optionSelectedRef.current = false; // Reset flag
      setIsOpen(false);
    }, 150);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${
            icon ? "pl-10" : "pl-3"
          } pr-9 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleOptionClick(option);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                option.value === value
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
