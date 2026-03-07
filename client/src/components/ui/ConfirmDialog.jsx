import React, { useState } from "react";
import Modal from "./Modal";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import clsx from "clsx";

/**
 * Confirm Dialog Component
 * Accessible confirmation dialog to replace window.confirm()
 * Restyled for luxury dark/gold theme.
 */

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const variantConfig = {
    warning: {
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      buttonColor: "bg-amber-600 hover:bg-amber-700 text-[#0a0a0a]",
    },
    danger: {
      icon: AlertTriangle,
      iconColor: "text-red-500",
      iconBg: "bg-red-500/10 border-red-500/20",
      buttonColor: "bg-red-600 hover:bg-red-700 text-white",
    },
    info: {
      icon: Info,
      iconColor: "text-[#d4af37]",
      iconBg: "bg-[#d4af37]/10 border-[#d4af37]/20",
      buttonColor: "bg-[#d4af37] hover:bg-[#b8941f] text-[#0a0a0a]",
    },
    success: {
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const loading = isLoading || isProcessing;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!loading}
      showCloseButton={false}
    >
      <div className="text-center py-4">
        {/* Icon */}
        <div
          className={clsx(
            "mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 border",
            config.iconBg,
          )}
        >
          <Icon
            className={clsx("h-8 w-8", config.iconColor)}
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h3 className="text-2xl text-[#f8f6f3] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h3>

        {/* Message */}
        {message && <p className="text-[#9a9a9a] mb-8 text-sm leading-relaxed">{message}</p>}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 border border-[#d4af37]/20 text-[#d4af37] text-xs font-bold uppercase tracking-widest hover:border-[#d4af37] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={clsx(
              "px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2",
              config.buttonColor,
            )}
          >
            {loading && (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
            )}
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "warning",
    confirmText: "Confirm",
    cancelText: "Cancel",
  });

  const confirm = ({
    title,
    message,
    onConfirm,
    variant = "warning",
    confirmText = "Confirm",
    cancelText = "Cancel",
  }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        onConfirm: async () => {
          await onConfirm();
          resolve(true);
        },
        variant,
        confirmText,
        cancelText,
      });
    });
  };

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    confirm,
    ConfirmDialog: () => (
      <ConfirmDialog {...dialogState} onClose={closeDialog} />
    ),
  };
};

export default ConfirmDialog;
