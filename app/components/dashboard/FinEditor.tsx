"use client";

import { useState, useEffect } from "react";
import BottomSheet from "../ui-kit/BottomSheet";
import FinEditorForm from "./FinEditorForm";
import ScheduleActionDialog from "./ScheduleActionDialog";
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
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleAction, setScheduleAction] = useState<"update" | "delete">("update");
  const [pendingData, setPendingData] = useState<CreateFinRequest | UpdateFinRequest | null>(null);

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
    // Check if this is an update to a scheduled transaction
    const isUpdate = "finId" in data;
    if (isUpdate && existingFin?.isScheduled && existingFin?.scheduleRuleId) {
      // Show dialog to ask user's preference
      setPendingData(data);
      setScheduleAction("update");
      setShowScheduleDialog(true);
      return;
    }

    // Proceed with normal submission
    await executeSubmit(data);
  };

  const executeSubmit = async (data: CreateFinRequest | UpdateFinRequest, scope?: "single" | "all") => {
    setIsSubmitting(true);

    try {
      const isUpdate = "finId" in data;
      const endpoint = isUpdate ? "/api/fin/update" : "/api/fin/create";
      const method = isUpdate ? "PATCH" : "POST";

      // Add scope parameter for scheduled updates
      const payload = scope ? { ...data, scope } : data;

      // Start both the API call and the minimum delay timer
      const [response] = await Promise.all([
        fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
        new Promise((resolve) => setTimeout(resolve, 300)), // Minimum 300ms loading
      ]);

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

    // Check if this is a scheduled transaction
    if (existingFin.isScheduled && existingFin.scheduleRuleId) {
      // Show dialog to ask user's preference
      setScheduleAction("delete");
      setShowScheduleDialog(true);
      return;
    }

    // For non-scheduled transactions, show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction? This action cannot be undone."
    );

    if (!confirmed) return;

    // Proceed with normal deletion
    await executeDelete();
  };

  const executeDelete = async (scope?: "single" | "all") => {
    if (!existingFin) return;

    setIsSubmitting(true);

    try {
      // Add scope parameter for scheduled deletes
      const url = scope
        ? `/api/fin/${existingFin.finId}?scope=${scope}`
        : `/api/fin/${existingFin.finId}`;

      // Start both the API call and the minimum delay timer
      const [response] = await Promise.all([
        fetch(url, {
          method: "DELETE",
        }),
        new Promise((resolve) => setTimeout(resolve, 300)), // Minimum 300ms loading
      ]);

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

  const handleScheduleChoice = (scope: "single" | "all") => {
    setShowScheduleDialog(false);

    if (scheduleAction === "update" && pendingData) {
      // Execute the update with scope
      executeSubmit(pendingData, scope);
      setPendingData(null);
    } else if (scheduleAction === "delete") {
      // Execute the delete with scope
      executeDelete(scope);
    }
  };

  const handleScheduleCancel = () => {
    setShowScheduleDialog(false);
    setPendingData(null);
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose}>
        <div className="relative">
          <FinEditorForm
            type={type}
            existingFin={existingFin}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onDelete={existingFin ? handleDelete : undefined}
            isSubmitting={isSubmitting}
          />

          {/* Loading Overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Saving...
                </p>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Schedule Action Dialog */}
      <ScheduleActionDialog
        isOpen={showScheduleDialog}
        action={scheduleAction}
        onChoice={handleScheduleChoice}
        onCancel={handleScheduleCancel}
      />
    </>
  );
};

export default FinEditor;
