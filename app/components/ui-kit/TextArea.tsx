import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`w-full px-3.5 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all resize-y ${className}`}
          {...props}
        />
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
