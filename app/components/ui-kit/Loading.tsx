export interface LoadingProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({
  size = "md",
  message,
  fullScreen = false
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-12 w-12 border-2",
    lg: "h-16 w-16 border-4",
  };

  const spinner = (
    <div className="text-center">
      <div
        className={`animate-spin rounded-full border-blue-600 border-t-transparent mx-auto mb-4 ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        {spinner}
      </div>
    );
  }

  return spinner;
}
