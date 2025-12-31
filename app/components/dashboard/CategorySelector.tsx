"use client";

import { useState, useEffect } from "react";
import Select from "../ui-kit/Select";

interface CategorySelectorProps {
  type: "expense" | "income";
  category?: string;
  subcategory?: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  className?: string;
}

interface CategoryData {
  category: string;
  subcategory: string;
  appliesTo: "expense" | "income" | "both";
}

const CategorySelector = ({
  type,
  category = "",
  subcategory = "",
  onCategoryChange,
  onSubcategoryChange,
  className = "",
}: CategorySelectorProps) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Filter categories by type
  const filteredCategories = categories.filter(
    (cat) => cat.appliesTo === type || cat.appliesTo === "both"
  );

  // Get unique category names
  const uniqueCategories = Array.from(
    new Set(filteredCategories.map((cat) => cat.category))
  ).sort();

  // Get subcategories for selected category
  const subcategories = filteredCategories
    .filter((cat) => cat.category === category)
    .map((cat) => cat.subcategory)
    .sort();

  // Build options for category select
  const categoryOptions = [
    { value: "", label: "Select category..." },
    ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
  ];

  // Build options for subcategory select
  const subcategoryOptions = [
    { value: "", label: "Select subcategory..." },
    ...subcategories.map((sub) => ({ value: sub, label: sub })),
  ];

  if (loading) {
    return (
      <div className={className}>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading categories...
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Select
        label="Category"
        options={categoryOptions}
        value={category}
        onChange={(e) => {
          onCategoryChange(e.target.value);
          // Reset subcategory when category changes
          if (e.target.value !== category) {
            onSubcategoryChange("");
          }
        }}
      />

      {category && (
        <Select
          label="Subcategory"
          options={subcategoryOptions}
          value={subcategory}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          disabled={subcategories.length === 0}
        />
      )}
    </div>
  );
};

export default CategorySelector;
