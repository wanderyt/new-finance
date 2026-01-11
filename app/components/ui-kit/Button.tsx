import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) => {
  const baseClasses =
    "font-medium rounded-lg transition-colors focus:outline-none touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-500",
    secondary:
      "bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:bg-zinc-100 dark:active:bg-zinc-600 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-700 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800",
    ghost:
      "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600 active:bg-zinc-400 dark:active:bg-zinc-500 disabled:hover:bg-zinc-200 dark:disabled:hover:bg-zinc-700",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-4 py-3 text-base font-semibold",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
