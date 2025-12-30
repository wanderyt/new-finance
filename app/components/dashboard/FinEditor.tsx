"use client";

import { useState, useEffect } from "react";
import BottomSheet from "../ui-kit/BottomSheet";
import FinEditorForm from "./FinEditorForm";
import { CreateFinRequest, UpdateFinRequest, FinData } from "@/app/lib/types/api";

interface FinEditorProps {
  isOpen: boolean;
  type: "expense" | "income";
  existingFin?: FinData;
  onClose: () => void;
  onSuccess?: (data: FinData) => void;
}

const FinEditor = ({
  isOpen,
  type,
  existingFin,
  onClose,
  onSuccess,
}: FinEditorProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset state when editor closes
  useEffect(() => {
    if (!isOpen) {
      setHasUnsavedChanges(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleSubmit = async (data: CreateFinRequest | UpdateFinRequest) => {
    setIsSubmitting(true);

    try {
      const isUpdate = "finId" in data;
      const endpoint = isUpdate ? "/api/fin/update" : "/api/fin/create";
      const method = isUpdate ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save transaction");
      }

      const result = await response.json();

      if (result.success) {
        setHasUnsavedChanges(false);
        onSuccess?.(result.data);
        onClose();
      } else {
        throw new Error(result.error || "Failed to save transaction");
      }
    } catch (error) {
      console.error("Failed to save transaction:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save transaction. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingFin) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/fin/${existingFin.finId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete transaction");
      }

      const result = await response.json();

      if (result.success) {
        setHasUnsavedChanges(false);
        onSuccess?.(existingFin);
        onClose();
      } else {
        throw new Error(result.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete transaction. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <FinEditorForm
        type={type}
        existingFin={existingFin}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        onDelete={existingFin ? handleDelete : undefined}
        isSubmitting={isSubmitting}
      />
    </BottomSheet>
  );
};

export default FinEditor;
