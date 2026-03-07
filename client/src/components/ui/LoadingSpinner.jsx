import React from "react";
import clsx from "clsx";

/**
 * Loading Spinner Component
 * Reusable spinner with different sizes and variants
 * Restyled for luxury dark/gold theme.
 */

const LoadingSpinner = ({
  size = "md",
  variant = "primary",
  className = "",
  label = "Loading Status...",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4",
  };

  const variantClasses = {
    primary: "border-[#d4af37] border-t-transparent shadow-[0_0_15px_rgba(212,175,55,0.2)]",
    white: "border-[#f8f6f3] border-t-transparent",
    secondary: "border-[#9a9a9a] border-t-transparent",
  };

  return (
    <div
      className={clsx("flex items-center justify-center", className)}
      role="status"
      aria-live="polite"
    >
      <div
        className={clsx(
          "animate-spin rounded-full",
          sizeClasses[size],
          variantClasses[variant],
        )}
        aria-label={label}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
