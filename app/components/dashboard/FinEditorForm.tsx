"use client";

import { useState, FormEvent } from "react";
import Button from "../ui-kit/Button";
import SearchableSelect from "../ui-kit/SearchableSelect";
import TagInput from "./TagInput";
import ReceiptUpload from "./ReceiptUpload";
import LineItemEditor, { LineItem } from "./LineItemEditor";
import { CreateFinRequest, UpdateFinRequest, FinData } from "@/app/lib/types/api";

interface FinEditorFormProps {
  type: "expense" | "income";
  existingFin?: FinData;
  onSubmit: (data: CreateFinRequest | UpdateFinRequest) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  isSubmitting?: boolean;
}

const FinEditorForm = ({
  type,
  existingFin,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false,
}: FinEditorFormProps) => {
  // Form state
  const [date, setDate] = useState(
    existingFin?.date
      ? new Date(existingFin.date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [merchant, setMerchant] = useState(existingFin?.merchant || "");
  const [amount, setAmount] = useState(
    existingFin ? (existingFin.originalAmountCents / 100).toFixed(2) : ""
  );
  const [currency, setCurrency] = useState<"CAD" | "USD" | "CNY">(
    (existingFin?.originalCurrency as "CAD" | "USD" | "CNY") || "CAD"
  );
  const [category, setCategory] = useState(existingFin?.category || "");
  const [subcategory, setSubcategory] = useState(existingFin?.subcategory || "");
  const [place, setPlace] = useState(existingFin?.place || "");
  const [city, setCity] = useState(existingFin?.city || "Waterloo");
  const [tags, setTags] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(existingFin?.isScheduled || false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly" | "annually">("monthly");
  const [details, setDetails] = useState(existingFin?.details || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [categories, setCategories] = useState<Array<{ category: string; subcategory: string; appliesTo: string }>>([]);

  // Fetch categories on mount
  useState(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error);
  });

  // Form validation
  const isValid = () => {
    if (!date) return false;
    if (!amount || parseFloat(amount) <= 0) return false;
    if (!currency) return false;
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValid()) {
      alert("Please fill in all required fields");
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);

    if (existingFin) {
      const updateData: UpdateFinRequest = {
        finId: existingFin.finId,
        type,
        date: new Date(date).toISOString(),
        merchant: merchant || undefined,
        place: place || undefined,
        city: city || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        details: details || undefined,
        originalCurrency: currency,
        originalAmountCents: amountCents,
      };

      await onSubmit(updateData);
    } else {
      const createData: CreateFinRequest = {
        type,
        date: new Date(date).toISOString(),
        merchant: merchant || undefined,
        place: place || undefined,
        city: city || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        details: details || undefined,
        originalCurrency: currency,
        originalAmountCents: amountCents,
        isScheduled,
      };

      await onSubmit(createData);
    }
  };

  // Handle receipt upload
  const handleReceiptUpload = async (file: File) => {
    setReceiptFile(file);
    setIsAnalyzingReceipt(true);

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const response = await fetch("/api/receipts/analyze", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Receipt analysis result:", result);
      }
    } catch (error) {
      console.error("Failed to analyze receipt:", error);
      alert("Failed to analyze receipt. Please try again.");
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  const handleLineItemChange = (index: number, item: LineItem) => {
    const updated = [...lineItems];
    updated[index] = item;
    setLineItems(updated);
  };

  const handleLineItemRemove = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        name: "",
        originalAmountCents: 0,
      },
    ]);
  };

  // Filter categories by type
  const filteredCategories = categories.filter(
    (cat) => cat.appliesTo === type || cat.appliesTo === "both"
  );

  const uniqueCategories = Array.from(
    new Set(filteredCategories.map((cat) => cat.category))
  ).sort();

  const subcategories = filteredCategories
    .filter((cat) => cat.category === category)
    .map((cat) => cat.subcategory)
    .sort();

  const categoryOptions = [
    { value: "", label: "Select category..." },
    ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
  ];

  const subcategoryOptions = [
    { value: "", label: "Select subcategory..." },
    ...subcategories.map((sub) => ({ value: sub, label: sub })),
  ];

  const frequencyOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Biweekly" },
    { value: "monthly", label: "Monthly" },
    { value: "annually", label: "Annually" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Date and Scheduled */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full pl-10 pr-3 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
          />
        </div>
        {!existingFin && (
          <select
            value={isScheduled ? frequency : ""}
            onChange={(e) => {
              if (e.target.value) {
                setIsScheduled(true);
                setFrequency(e.target.value as typeof frequency);
              } else {
                setIsScheduled(false);
              }
            }}
            className="w-32 px-3 py-2.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
          >
            <option value="">Once</option>
            {frequencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Merchant */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Merchant name"
          className="w-full pl-10 pr-3 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
        />
      </div>

      {/* Amount and Currency */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full pl-10 pr-3 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as "CAD" | "USD" | "CNY")}
          className="w-24 px-3 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
        >
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
          <option value="CNY">CNY</option>
        </select>
      </div>

      {/* Category and Subcategory */}
      <div className="grid grid-cols-2 gap-2">
        <SearchableSelect
          value={category}
          onChange={(val) => {
            setCategory(val);
            if (val !== category) {
              setSubcategory("");
            }
          }}
          options={categoryOptions}
          placeholder="Category"
          icon={
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          }
        />

        <SearchableSelect
          value={subcategory}
          onChange={setSubcategory}
          options={subcategoryOptions}
          placeholder="Subcategory"
          disabled={!category}
        />
      </div>

      {/* Place and City */}
      <div className="flex gap-2">
        <div className="flex-[2] relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Place"
            className="w-full pl-10 pr-3 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-full pl-10 pr-3 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Tags */}
      <TagInput tags={tags} onTagsChange={setTags} label="" placeholder="Tags (press Enter)" />

      {/* Details */}
      <div className="relative">
        <svg
          className="absolute left-3 top-3 w-5 h-5 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Details (optional)"
          rows={2}
          className="w-full pl-10 pr-3 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all resize-none"
        />
      </div>

      {/* Receipt Upload */}
      {!existingFin && (
        <ReceiptUpload
          onFileSelect={setReceiptFile}
          onAnalyze={handleReceiptUpload}
          isAnalyzing={isAnalyzingReceipt}
          label=""
        />
      )}

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div className="space-y-3 pt-2">
          {lineItems.map((item, index) => (
            <LineItemEditor
              key={index}
              item={item}
              index={index}
              onChange={handleLineItemChange}
              onRemove={handleLineItemRemove}
            />
          ))}
          <button
            type="button"
            onClick={handleAddLineItem}
            className="w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            + Add Line Item
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          fullWidth
        >
          Cancel
        </Button>

        {existingFin && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isSubmitting}
            className="!bg-red-100 dark:!bg-red-900/30 !text-red-700 dark:!text-red-300 hover:!bg-red-200 dark:hover:!bg-red-900/50"
          >
            Delete
          </Button>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={!isValid() || isSubmitting}
          fullWidth
        >
          {isSubmitting ? "Saving..." : existingFin ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
};

export default FinEditorForm;
