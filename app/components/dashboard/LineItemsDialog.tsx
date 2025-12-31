"use client";

import { useState, useEffect } from "react";
import Dialog from "../ui-kit/Dialog";
import Button from "../ui-kit/Button";
import LineItemEditor, { LineItem } from "./LineItemEditor";

interface LineItemsDialogProps {
  isOpen: boolean;
  lineItems: LineItem[];
  onConfirm: (lineItems: LineItem[]) => void;
  onCancel: () => void;
  persons?: Array<{ personId: number; name: string; isDefault?: boolean }>;
}

const LineItemsDialog = ({
  isOpen,
  lineItems: initialLineItems,
  onConfirm,
  onCancel,
  persons = [],
}: LineItemsDialogProps) => {
  const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems);

  // Update line items when dialog opens with new data
  useEffect(() => {
    if (isOpen) {
      setLineItems(initialLineItems);
    }
  }, [isOpen, initialLineItems]);

  const handleLineItemChange = (index: number, item: LineItem) => {
    const updated = [...lineItems];
    updated[index] = item;
    setLineItems(updated);
  };

  const handleLineItemRemove = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleAddLineItem = () => {
    // Find the default person
    const defaultPerson = persons.find((p) => p.isDefault);

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
    // Filter out empty line items
    const validItems = lineItems.filter(
      (item) => item.name.trim() && item.originalAmountCents > 0
    );
    onConfirm(validItems);
  };

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + item.originalAmountCents,
    0
  );

  return (
    <Dialog isOpen={isOpen} onClose={onCancel}>
      <div className="space-y-3">
        {/* Line Items */}
        <div className="space-y-2">
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

        {/* Total */}
        {lineItems.length > 0 && (
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-zinc-700 dark:text-zinc-300">Total:</span>
              <span className="text-zinc-900 dark:text-zinc-50">
                ${(totalAmount / 100).toFixed(2)}
              </span>
            </div>
          </div>
        )}

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
            Confirm ({lineItems.length} {lineItems.length === 1 ? "item" : "items"})
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default LineItemsDialog;
