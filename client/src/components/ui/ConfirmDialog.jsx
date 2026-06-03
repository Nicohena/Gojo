import React, { useState } from "react";
import Modal from "./Modal";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import clsx from "clsx";

const CORAL = "#E67E5F";

const variantConfig = {
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    buttonCls: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  danger: {
    icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    buttonCls: "bg-red-600 hover:bg-red-700 text-white",
  },
  info: {
    icon: Info,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    buttonCls: "text-white",
    buttonStyle: { background: CORAL },
  },
  success: {
    icon: CheckCircle,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    buttonCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
};

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
  const config = variantConfig[variant] || variantConfig.warning;
  const Icon   = config.icon;
  const loading = isLoading || isProcessing;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Confirmation action failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnOverlayClick={!loading} showCloseButton={false}>
      <div className="text-center py-2">
        {/* Icon */}
        <div className={clsx("mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4", config.iconBg)}>
          <Icon size={26} className={config.iconColor} aria-hidden="true" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

        {/* Message */}
        {message && <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={clsx("flex-1 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2", config.buttonCls)}
            style={config.buttonStyle}
          >
            {loading && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {loading ? "Processing…" : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const useConfirmDialog = () => {
  const [state, setState] = useState({
    isOpen: false, title: "", message: "", onConfirm: () => {},
    variant: "warning", confirmText: "Confirm", cancelText: "Cancel",
  });

  const confirm = ({ title, message, onConfirm, variant = "warning", confirmText = "Confirm", cancelText = "Cancel" }) =>
    new Promise((resolve) => {
      setState({
        isOpen: true, title, message, variant, confirmText, cancelText,
        onConfirm: async () => { await onConfirm(); resolve(true); },
      });
    });

  const closeDialog = () => setState((p) => ({ ...p, isOpen: false }));

  return {
    confirm,
    ConfirmDialog: () => <ConfirmDialog {...state} onClose={closeDialog} />,
  };
};

export default ConfirmDialog;
