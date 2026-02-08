"use client";

import { useState } from "react";
import Dialog from "../ui-kit/Dialog";
import Button from "../ui-kit/Button";
import LineItemEditor, { LineItem } from "./LineItemEditor";

export interface AnalyzedLineItem {
  name: string;
  amount: number; // In cents
  quantity?: number;
  unit?: string;
  unitPriceCents?: number; // Price per unit in cents (from AI or calculated)
  notes?: string; // Original name from receipt (before standardization)
}

interface ReceiptAnalysisResult {
  lineItems: AnalyzedLineItem[];
  totalAmount: number; // In cents
  detectedCurrency?: string;
  merchant?: string;
  merchantType?: string;
  date?: string;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
}

interface ReceiptAnalysisDialogProps {
  isOpen: boolean;
  result: ReceiptAnalysisResult | null;
  onConfirm: (lineItems: LineItem[]) => void;
  onCancel: () => void;
  persons?: Array<{ personId: number; name: string; isDefault?: boolean }>;
}

const ReceiptAnalysisDialog = ({
  isOpen,
  result,
  onConfirm,
  onCancel,
  persons = [],
}: ReceiptAnalysisDialogProps) => {
  // Find default person
  const defaultPerson = persons.find((p) => p.isDefault);

  // Convert analyzed items to editable line items with default person
  const initialLineItems: LineItem[] =
    result?.lineItems.map((item) => ({
      name: item.name,
      originalAmountCents: item.amount,
      qty: item.quantity,
      unit: item.unit,
      unitPriceCents: item.unitPriceCents,
      notes: item.notes, // Preserve original name from standardization
      personId: defaultPerson?.personId,
    })) || [];

  const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems);

  // Update line items when result changes
  useState(() => {
    if (result) {
      setLineItems(
        result.lineItems.map((item) => ({
          name: item.name,
          originalAmountCents: item.amount,
          qty: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          notes: item.notes, // Preserve original name from standardization
          personId: defaultPerson?.personId,
        }))
      );
    }
  });

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
        personId: defaultPerson?.personId,
      },
    ]);
  };

  const handleConfirm = () => {
    // Validate line items
    const validItems = lineItems.filter(
      (item) => item.name.trim() && item.originalAmountCents > 0
    );

    if (validItems.length === 0) {
      alert("Please add at least one valid line item");
      return;
    }

    onConfirm(validItems);
  };

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + item.originalAmountCents,
    0
  );

  if (!result) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title="Receipt Analysis Results">
      <div className="space-y-4">
        {/* Analysis Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Receipt Details
          </h3>
          <div className="space-y-1 text-sm">
            {result.merchant && (
              <p className="text-blue-800 dark:text-blue-200">
                <span className="font-medium">Merchant:</span> {result.merchant}
              </p>
            )}
            {result.date && (
              <p className="text-blue-800 dark:text-blue-200">
                <span className="font-medium">Date:</span>{" "}
                {new Date(result.date).toLocaleString()}
              </p>
            )}
            {result.detectedCurrency && (
              <p className="text-blue-800 dark:text-blue-200">
                <span className="font-medium">Currency:</span> {result.detectedCurrency}
              </p>
            )}
            <p className="text-blue-800 dark:text-blue-200">
              <span className="font-medium">Total:</span> $
              {(totalAmount / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Auto-detected Category */}
        {result.suggestedCategory && result.suggestedSubcategory && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm">
                <span className="font-medium text-green-900 dark:text-green-100">
                  Auto-detected category:
                </span>{" "}
                <span className="text-green-800 dark:text-green-200">
                  {result.suggestedCategory} / {result.suggestedSubcategory}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Review and edit the line items below. You can assign each item to a person,
          adjust amounts, or add/remove items.
        </p>

        {/* Line Items */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {lineItems.map((item, index) => (
            <LineItemEditor
              key={index}
              item={item}
              index={index}
              onChange={handleLineItemChange}
              onRemove={handleLineItemRemove}
              persons={persons}
            />
          ))}
        </div>

        {/* Add Item Button */}
        <button
          type="button"
          onClick={handleAddLineItem}
          className="w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          + Add Line Item
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            fullWidth
          >
            Confirm ({lineItems.length} items)
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ReceiptAnalysisDialog;
