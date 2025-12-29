interface TagProps {
  children: React.ReactNode;
  onRemove?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export default function Tag({
  children,
  onRemove,
  size = "md",
  className = "",
}: TagProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full
        bg-blue-100 dark:bg-blue-900/30
        text-blue-700 dark:text-blue-300
        font-medium
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
          aria-label="Remove tag"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
