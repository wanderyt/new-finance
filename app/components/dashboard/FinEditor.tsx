"use client";

import { useState, useEffect } from "react";
import BottomSheet from "../ui-kit/BottomSheet";
import FinEditorForm from "./FinEditorForm";
import ScheduleActionDialog from "./ScheduleActionDialog";
import ConfirmDialog from "../ui-kit/ConfirmDialog";
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
  const [pendingData, setPendingData] = useState<CreateFinRequest | UpdateFinRequest | FormData | null>(null);
  const [currentFinData, setCurrentFinData] = useState<FinData | undefined>(existingFin);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [preservedFormData, setPreservedFormData] = useState<{ date: string; city: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Sync current fin data when existingFin changes
  useEffect(() => {
    setCurrentFinData(existingFin);
  }, [existingFin]);

  // Reset state when editor closes
  useEffect(() => {
    if (!isOpen) {
      setHasUnsavedChanges(false);
      setIsSubmitting(false);
      setPreservedFormData(null);
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

  const handleSubmit = async (data: CreateFinRequest | UpdateFinRequest | FormData, saveAndCreateAnother = false) => {
    // Check if this is an update to a scheduled transaction
    const isUpdate = data instanceof FormData ? false : "finId" in data;
    if (isUpdate && existingFin?.isScheduled && existingFin?.scheduleRuleId) {
      // Show dialog to ask user's preference
      setPendingData(data);
      setScheduleAction("update");
      setShowScheduleDialog(true);
      return;
    }

    // Proceed with normal submission
    await executeSubmit(data, undefined, saveAndCreateAnother);
  };

  const executeSubmit = async (data: CreateFinRequest | UpdateFinRequest | FormData, scope?: "single" | "all", saveAndCreateAnother = false) => {
    setIsSubmitting(true);

    try {
      const isUpdate = data instanceof FormData
        ? false  // FormData always means create
        : "finId" in data;

      const endpoint = isUpdate ? "/api/fin/update" : "/api/fin/create";
      const method = isUpdate ? "PATCH" : "POST";

      // Extract date and city for preserving when creating another
      let dateToPreserve: string | undefined;
      let cityToPreserve: string | undefined;
      if (saveAndCreateAnother && !isUpdate) {
        // Helper to convert ISO date to local datetime-local format
        const toLocalDatetimeString = (isoDate: string) => {
          const date = new Date(isoDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        if (data instanceof FormData) {
          // Data is stored as JSON string under "data" key
          const dataStr = data.get("data") as string;
          if (dataStr) {
            const parsedData = JSON.parse(dataStr) as CreateFinRequest;
            // Convert ISO date back to local datetime-local format
            dateToPreserve = toLocalDatetimeString(parsedData.date);
            cityToPreserve = parsedData.city;
          }
        } else {
          dateToPreserve = toLocalDatetimeString((data as CreateFinRequest).date);
          cityToPreserve = (data as CreateFinRequest).city;
        }
      }

      // Prepare body and headers
      let body: BodyInit;
      let headers: HeadersInit = {};

      if (data instanceof FormData) {
        // FormData: browser sets Content-Type with boundary
        body = scope
          ? (() => {
              data.append("scope", scope);
              return data;
            })()
          : data;
        // No Content-Type header - let browser set it
      } else {
        // JSON
        const payload = scope ? { ...data, scope } : data;
        body = JSON.stringify(payload);
        headers = { "Content-Type": "application/json" };
      }

      // Start both the API call and the minimum delay timer
      const [response] = await Promise.all([
        fetch(endpoint, {
          method,
          headers,
          body,
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

        if (saveAndCreateAnother && dateToPreserve && cityToPreserve) {
          // Preserve date and city for next record
          setPreservedFormData({
            date: dateToPreserve,
            city: cityToPreserve,
          });
          // Reset the current fin data to null (create mode)
          setCurrentFinData(undefined);
          // Increment form key to force form reset
          setFormKey(prev => prev + 1);
          // Don't close the editor
        } else {
          onClose();
        }
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
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    await executeDelete();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
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

  const handleReceiptUpdate = async (finId: string) => {
    try {
      // Fetch updated fin data
      const response = await fetch(`/api/fin/${finId}`);
      const data = await response.json();

      if (data.success) {
        setCurrentFinData(data.data);
      }
    } catch (error) {
      console.error("Failed to refresh fin data:", error);
    }
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose}>
        <div className="relative">
          <FinEditorForm
            key={formKey}
            type={type}
            existingFin={currentFinData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onDelete={existingFin ? handleDelete : undefined}
            isSubmitting={isSubmitting}
            onReceiptUpdate={handleReceiptUpdate}
            preservedFormData={preservedFormData}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除记录"
        message="确定要删除这条记录吗？此操作无法撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />
    </>
  );
};

export default FinEditor;
