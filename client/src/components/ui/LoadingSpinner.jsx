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
    primary:   "border-t-transparent",
    white:     "border-white border-t-transparent",
    secondary: "border-gray-400 border-t-transparent",
  };

  const primaryStyle = variant === "primary" ? { borderColor: "#E67E5F", borderTopColor: "transparent" } : {};

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
        style={primaryStyle}
        aria-label={label}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
