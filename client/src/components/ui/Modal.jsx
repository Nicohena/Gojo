import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { X } from "lucide-react";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = "",
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const sizeClasses = {
    sm:   "max-w-md",
    md:   "max-w-lg",
    lg:   "max-w-2xl",
    xl:   "max-w-4xl",
    full: "max-w-full mx-4",
  };

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape" && isOpen) onClose(); };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      previousActiveElement.current = document.activeElement;
      modalRef.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first?.focus(); } }
    };
    modalRef.current.addEventListener("keydown", handleTab);
    return () => modalRef.current?.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={clsx(
          "bg-white rounded-2xl shadow-xl w-full",
          sizeClasses[size],
          className
        )}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            {title && (
              <h2 id="modal-title" className="text-lg font-bold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
