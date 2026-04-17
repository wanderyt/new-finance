"use client";

import { useState, useEffect } from "react";
import Dialog from "../ui-kit/Dialog";
import CalculatorInput from "../ui-kit/CalculatorInput";
import TextArea from "../ui-kit/TextArea";
import Dropdown from "../ui-kit/Dropdown";
import Button from "../ui-kit/Button";
import ConfirmDialog from "../ui-kit/ConfirmDialog";
import type { PocketMoneyData } from "@/app/lib/types/api";

interface PocketMoneyEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PocketMoneyData | null;
  onSave: (data: {
    transaction_type: "bonus" | "deduction" | "expense" | "red_pocket";
    amount_cents: number;
    reason: string;
    transaction_date?: string;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export default function PocketMoneyEditorDialog({
  isOpen,
  onClose,
  transaction,
  onSave,
  onDelete,
}: PocketMoneyEditorDialogProps) {
  const isEditMode = transaction !== null;

  // Form state
  const [transactionType, setTransactionType] = useState<"bonus" | "deduction" | "expense" | "red_pocket">("bonus");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or transaction changes
  useEffect(() => {
    if (isOpen && transaction) {
      setTransactionType(transaction.transaction_type as "bonus" | "deduction" | "expense" | "red_pocket");
      setAmount(Math.abs(transaction.amount_cents / 100).toString());
      setReason(transaction.reason);
      setError(null);
    } else if (isOpen && !transaction) {
      setTransactionType("bonus");
      setAmount("");
      setReason("");
      setError(null);
    }
  }, [isOpen, transaction]);

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError("金额必须大于0");
      return;
    }
    if (!reason.trim()) {
      setError("原因不能为空");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const amountCents =
        transactionType === "bonus" || transactionType === "red_pocket"
          ? Math.round(parseFloat(amount) * 100)
          : -Math.round(parseFloat(amount) * 100); // negative for deduction and expense

      await onSave({
        transaction_type: transactionType,
        amount_cents: amountCents,
        reason: reason.trim(),
      });

      // Close dialog on success
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "保存交易失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction || !onDelete) return;

    setIsSubmitting(true);
    try {
      await onDelete(transaction.pocket_money_id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "删除交易失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? "编辑交易" : "添加交易"}
      >
        <div className="space-y-3">
          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              交易类型
            </label>
            <Dropdown
              value={transactionType}
              onChange={(value) => setTransactionType(value as "bonus" | "deduction" | "expense" | "red_pocket")}
              options={[
                { value: "bonus", label: "🎁 奖励" },
                { value: "deduction", label: "⚠️ 惩罚" },
                { value: "expense", label: "💸 花销" },
                { value: "red_pocket", label: "🧧 红包" },
              ]}
              placeholder="选择类型"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              金额 (CAD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 text-xs">
                CAD $
              </span>
              <CalculatorInput
                value={amount}
                onChange={setAmount}
                onBlur={() => {}}
                className="pl-16"
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              输入正数金额。正负号将根据交易类型自动确定。
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              原因
            </label>
            <TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：表现良好、考试成绩优秀等"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              fullWidth
            >
              取消
            </Button>

            {isEditMode && onDelete && (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                删除
              </Button>
            )}

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              fullWidth
            >
              {isSubmitting
                ? "保存中..."
                : isEditMode
                ? "更新"
                : "保存"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {isEditMode && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="删除交易"
          message="确定要删除此交易吗？此操作无法撤销。"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
