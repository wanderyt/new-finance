"use client";

import { useState, FormEvent, useEffect } from "react";
import Button from "../ui-kit/Button";
import SearchableSelect from "../ui-kit/SearchableSelect";
import Dropdown from "../ui-kit/Dropdown";
import CalculatorInput from "../ui-kit/CalculatorInput";
import TagInput from "./TagInput";
import ReceiptUpload from "./ReceiptUpload";
import { LineItem } from "./LineItemEditor";
import ReceiptAnalysisDialog from "./ReceiptAnalysisDialog";
import LineItemsDialog from "./LineItemsDialog";
import HistoricalDataSheet from "./HistoricalDataSheet";
import {
  CreateFinRequest,
  UpdateFinRequest,
  FinData,
  HistoricalDataItem,
} from "@/app/lib/types/api";

interface ReceiptAnalysisResult {
  lineItems: Array<{
    name: string;
    amount: number;
    quantity?: number;
    unit?: string;
  }>;
  totalAmount: number;
  detectedCurrency?: string;
  merchant?: string;
  date?: string;
}

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
  // Helper function to convert UTC date to local datetime-local format
  const toLocalDatetimeString = (utcDate: string | Date) => {
    const date = new Date(utcDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Form state
  // For scheduled transactions, use scheduledOn; otherwise use date
  const [date, setDate] = useState(
    existingFin
      ? toLocalDatetimeString(existingFin.isScheduled && existingFin.scheduledOn ? existingFin.scheduledOn : existingFin.date)
      : toLocalDatetimeString(new Date())
  );
  const isScheduledTransaction = Boolean(existingFin?.isScheduled && existingFin?.scheduleRuleId);
  const [merchant, setMerchant] = useState(existingFin?.merchant || "");
  const [amount, setAmount] = useState(
    existingFin ? (existingFin.originalAmountCents / 100).toFixed(2) : ""
  );
  const [currency, setCurrency] = useState<"CAD" | "USD" | "CNY">(
    (existingFin?.originalCurrency as "CAD" | "USD" | "CNY") || "CAD"
  );
  const [category, setCategory] = useState(existingFin?.category || "");
  const [subcategory, setSubcategory] = useState(
    existingFin?.subcategory || ""
  );
  const [place, setPlace] = useState(existingFin?.place || "");
  const [city, setCity] = useState(existingFin?.city || "");
  const [tags, setTags] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(
    existingFin?.isScheduled || false
  );
  const [frequency, setFrequency] = useState<
    "daily" | "weekly" | "biweekly" | "monthly" | "annually"
  >("monthly");
  const [details, setDetails] = useState(existingFin?.details || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [categories, setCategories] = useState<
    Array<{ category: string; subcategory: string; appliesTo: string }>
  >([]);

  // Receipt analysis state
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<ReceiptAnalysisResult | null>(null);

  // Line items dialog state
  const [showLineItemsDialog, setShowLineItemsDialog] = useState(false);

  // Historical data sheet state
  const [showHistoricalDataSheet, setShowHistoricalDataSheet] = useState(false);
  const [selectedMerchantForHistory, setSelectedMerchantForHistory] = useState("");

  // Autocomplete data
  const [merchantOptions, setMerchantOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [placeOptions, setPlaceOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [cityOptions, setCityOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [persons, setPersons] = useState<
    Array<{ personId: number; name: string; isDefault?: boolean }>
  >([]);

  // Fetch categories, autocomplete data, and persons on mount
  useEffect(() => {
    // Fetch categories
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error);

    // Fetch autocomplete data
    fetch("/api/fin/autocomplete")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMerchantOptions(
            data.data.merchants.map((m: string) => ({ value: m, label: m }))
          );
          setPlaceOptions(
            data.data.places.map((p: string) => ({ value: p, label: p }))
          );
          // Pin common cities at the top
          const pinnedCities = ["Waterloo", "Kitchener", "Toronto"];
          const otherCities = data.data.cities.filter(
            (c: string) => !pinnedCities.includes(c)
          );
          setCityOptions([
            ...pinnedCities.map((c) => ({ value: c, label: c })),
            ...otherCities.map((c: string) => ({ value: c, label: c })),
          ]);
        }
      })
      .catch(console.error);

    // Fetch persons
    fetch("/api/persons")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPersons(data.persons);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch line items for existing fin record
  useEffect(() => {
    if (existingFin?.finId) {
      fetch(`/api/fin/${existingFin.finId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.items) {
            // Convert API items to LineItem format
            const items: LineItem[] = data.data.items.map((item: {
              name: string;
              originalAmountCents: number;
              qty?: number;
              unit?: string;
              unitPriceCents?: number;
              personId?: number;
              category?: string;
              subcategory?: string;
              notes?: string;
            }) => ({
              name: item.name,
              originalAmountCents: item.originalAmountCents,
              qty: item.qty,
              unit: item.unit,
              unitPriceCents: item.unitPriceCents,
              personId: item.personId,
              category: item.category,
              subcategory: item.subcategory,
              notes: item.notes,
            }));
            setLineItems(items);
          }
        })
        .catch(console.error);
    }
  }, [existingFin?.finId]);

  // Form validation
  const isValid = () => {
    if (!date) return false;
    if (!amount || parseFloat(amount) <= 0) return false;
    if (!currency) return false;
    if (!city || city.trim() === "") return false;
    if (!merchant || merchant.trim() === "") return false;
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
        lineItems: lineItems.length > 0 ? lineItems : undefined,
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
        frequency: isScheduled ? frequency : undefined,
        lineItems: lineItems.length > 0 ? lineItems : undefined,
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

        // Store analysis result and show dialog
        setAnalysisResult(result);
        setShowAnalysisDialog(true);

        // Auto-populate form fields if detected
        if (result.merchant) setMerchant(result.merchant);
        if (result.city) setCity(result.city);
        if (result.date) {
          setDate(new Date(result.date).toISOString().slice(0, 16));
        }
        if (result.detectedCurrency) {
          setCurrency(result.detectedCurrency as "CAD" | "USD" | "CNY");
        }
        if (result.totalAmount) {
          setAmount((result.totalAmount / 100).toFixed(2));
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to analyze receipt. Please try again.");
      }
    } catch (error) {
      console.error("Failed to analyze receipt:", error);
      alert("Failed to analyze receipt. Please try again.");
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  // Handle merchant selection from dropdown
  const handleMerchantSelected = (selectedMerchant: string) => {
    // Don't set merchant immediately - wait for user confirmation
    // Only store the selected merchant for historical data lookup
    if (selectedMerchant?.trim()) {
      setSelectedMerchantForHistory(selectedMerchant);
      setShowHistoricalDataSheet(true);
    }
  };

  // Handle historical data confirmation
  const handleHistoricalDataConfirm = (selections: HistoricalDataItem[]) => {
    // Set the merchant when user confirms the autopopulate
    setMerchant(selectedMerchantForHistory);

    // Apply selected historical data to form fields
    selections.forEach((item) => {
      if (item.type === "category") {
        setCategory(item.category || "");
        setSubcategory(item.subcategory || "");
      } else if (item.type === "location") {
        setPlace(item.place || "");
        setCity(item.city || "");
      } else if (item.type === "detail") {
        setDetails(item.detail || "");
      }
    });

    setShowHistoricalDataSheet(false);
  };

  // Handle historical data cancellation
  const handleHistoricalDataCancel = () => {
    // Set the merchant even when user cancels - they selected it from the dropdown
    setMerchant(selectedMerchantForHistory);
    setShowHistoricalDataSheet(false);
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
    { value: "", label: "分类" },
    ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
  ];

  const subcategoryOptions = [
    { value: "", label: "子分类" },
    ...subcategories.map((sub) => ({ value: sub, label: sub })),
  ];

  const frequencyOptions = [
    { value: "", label: "一次" },
    { value: "daily", label: "每日" },
    { value: "weekly", label: "每周" },
    { value: "biweekly", label: "双周" },
    { value: "monthly", label: "每月" },
    { value: "annually", label: "每年" },
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
            disabled={isScheduledTransaction}
            className={`w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all ${
              isScheduledTransaction ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <Dropdown
          value={isScheduled ? frequency : ""}
          onChange={(val) => {
            if (val) {
              setIsScheduled(true);
              setFrequency(val as typeof frequency);
            } else {
              setIsScheduled(false);
            }
          }}
          options={frequencyOptions}
          placeholder={isScheduledTransaction ? "已排期" : "一次"}
          className="w-32"
          disabled={isScheduledTransaction}
        />
      </div>

      {/* Merchant */}
      <SearchableSelect
        value={merchant}
        onChange={setMerchant}
        options={merchantOptions}
        placeholder="商家名称"
        onOptionSelected={handleMerchantSelected}
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        }
      />

      {/* Amount and Currency */}
      <div className="flex gap-2">
        <CalculatorInput
          value={amount}
          onChange={(val) => setAmount(val)}
          onBlur={(e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value)) {
              setAmount(value.toFixed(2));
            }
          }}
          placeholder="0.00"
          required
          leftIcon={
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
          }
        />
        <Dropdown
          value={currency}
          onChange={(val) => setCurrency(val as "CAD" | "USD" | "CNY")}
          options={[
            { value: "CAD", label: "CAD" },
            { value: "USD", label: "USD" },
            { value: "CNY", label: "CNY" },
          ]}
          placeholder="CAD"
          className="w-24"
        />
      </div>

      {/* Category and Subcategory with Line Items Button */}
      <div className="flex gap-2">
        <div className="grid grid-cols-2 gap-2 flex-1">
          <Dropdown
            value={category}
            onChange={(val) => {
              setCategory(val);
              if (val !== category) {
                setSubcategory("");
              }
            }}
            options={categoryOptions}
            placeholder=""
          />

          <Dropdown
            value={subcategory}
            onChange={setSubcategory}
            options={subcategoryOptions}
            placeholder=""
            disabled={!category}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowLineItemsDialog(true)}
          className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
          title="管理明细项"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        </button>
      </div>

      {/* Place and City */}
      <div className="flex gap-2">
        <SearchableSelect
          value={place}
          onChange={setPlace}
          options={placeOptions}
          placeholder="地点"
          className="flex-[2]"
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        />

        <SearchableSelect
          value={city}
          onChange={setCity}
          options={cityOptions}
          placeholder="城市"
          className="flex-1"
        />
      </div>

      {/* Tags */}
      <TagInput
        tags={tags}
        onTagsChange={setTags}
        label=""
        placeholder="标签（按回车）"
      />

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
          placeholder="详细说明（可选）"
          rows={2}
          className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all resize-none"
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

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          取消
        </Button>

        {existingFin && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isSubmitting}
            className="flex-1 !bg-red-100 dark:!bg-red-900/30 !text-red-700 dark:!text-red-300 hover:!bg-red-200 dark:hover:!bg-red-900/50"
          >
            删除
          </Button>
        )}

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!isValid() || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "保存中..." : existingFin ? "更新" : "保存"}
        </Button>
      </div>

      {/* Receipt Analysis Dialog */}
      {showAnalysisDialog && analysisResult && (
        <ReceiptAnalysisDialog
          isOpen={showAnalysisDialog}
          result={analysisResult}
          onConfirm={(items) => {
            setLineItems(items);
            setShowAnalysisDialog(false);
          }}
          onCancel={() => setShowAnalysisDialog(false)}
          persons={persons}
        />
      )}

      {/* Line Items Dialog */}
      <LineItemsDialog
        isOpen={showLineItemsDialog}
        lineItems={lineItems}
        onConfirm={(items) => {
          setLineItems(items);
          setShowLineItemsDialog(false);
        }}
        onCancel={() => setShowLineItemsDialog(false)}
        persons={persons}
      />

      {/* Historical Data Selection Sheet */}
      <HistoricalDataSheet
        isOpen={showHistoricalDataSheet}
        merchant={selectedMerchantForHistory}
        onConfirm={handleHistoricalDataConfirm}
        onCancel={handleHistoricalDataCancel}
      />
    </form>
  );
};

export default FinEditorForm;
