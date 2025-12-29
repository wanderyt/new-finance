"use client";

import { useState, FormEvent } from "react";
import Input from "../ui-kit/Input";
import TextArea from "../ui-kit/TextArea";
import Button from "../ui-kit/Button";
import CategorySelector from "./CategorySelector";
import CurrencySelector from "./CurrencySelector";
import ScheduledToggle from "./ScheduledToggle";
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
  const [city, setCity] = useState(existingFin?.city || "");
  const [tags, setTags] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(existingFin?.isScheduled || false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly" | "annually">("monthly");
  const [details, setDetails] = useState(existingFin?.details || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);

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
      // Update existing fin
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
      // Create new fin
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
        // TODO: Create schedule rule if isScheduled
      };

      await onSubmit(createData);
    }
  };

  // Handle receipt upload and analysis
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
        // TODO: Open ReceiptAnalysisDialog with results
        console.log("Receipt analysis result:", result);
      }
    } catch (error) {
      console.error("Failed to analyze receipt:", error);
      alert("Failed to analyze receipt. Please try again.");
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  // Handle line item changes
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <Input
        label="Date"
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      {/* Merchant */}
      <Input
        label="Merchant"
        type="text"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        placeholder="e.g., Whole Foods"
      />

      {/* Amount and Currency */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount ($)"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>

      {/* Category Selector */}
      <CategorySelector
        type={type}
        category={category}
        subcategory={subcategory}
        onCategoryChange={setCategory}
        onSubcategoryChange={setSubcategory}
      />

      {/* Place and City */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Place"
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="e.g., Downtown store"
        />
        <Input
          label="City"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g., Toronto"
        />
      </div>

      {/* Tags */}
      <TagInput tags={tags} onTagsChange={setTags} />

      {/* Scheduled Toggle */}
      {!existingFin && (
        <ScheduledToggle
          isScheduled={isScheduled}
          frequency={frequency}
          onScheduledChange={setIsScheduled}
          onFrequencyChange={setFrequency}
        />
      )}

      {/* Details */}
      <TextArea
        label="Details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Add any additional notes..."
        rows={3}
      />

      {/* Receipt Upload */}
      {!existingFin && (
        <ReceiptUpload
          onFileSelect={setReceiptFile}
          onAnalyze={handleReceiptUpload}
          isAnalyzing={isAnalyzingReceipt}
        />
      )}

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Line Items
            </label>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add Item
            </button>
          </div>
          {lineItems.map((item, index) => (
            <LineItemEditor
              key={index}
              item={item}
              index={index}
              onChange={handleLineItemChange}
              onRemove={handleLineItemRemove}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
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
