"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import Tag from "../ui-kit/Tag";
import Input from "../ui-kit/Input";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

const TagInput = ({
  tags,
  onTagsChange,
  label = "Tags",
  placeholder = "Type and press Enter to add tags...",
  className = "",
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch existing tags from the API for autocomplete
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.tags?.map((t: { name: string }) => t.name) || []);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };

    fetchTags();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags[tags.length - 1]);
    }
  };

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase();
    if (!tags.includes(normalizedTag)) {
      onTagsChange([...tags, normalizedTag]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(suggestion.toLowerCase())
  );

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Tags display */}
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Tag key={tag} onRemove={() => removeTag(tag)}>
              {tag}
            </Tag>
          ))}
        </div>

        {/* Input field */}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(inputValue.length > 0)}
          onBlur={() => {
            // Delay to allow clicking on suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={placeholder}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.slice(0, 10).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
        Press Enter to add a tag
      </p>
    </div>
  );
};

export default TagInput;
