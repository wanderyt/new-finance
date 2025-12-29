import { InputHTMLAttributes, forwardRef } from "react";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={props.checked}
          onClick={() => {
            // Trigger change event on the hidden checkbox
            const event = new Event("change", { bubbles: true });
            const input = document.getElementById(id || "") as HTMLInputElement;
            if (input) {
              input.checked = !input.checked;
              input.dispatchEvent(event);
            }
          }}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900
            ${props.checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"}
            ${props.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            ${className}
          `}
          disabled={props.disabled}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${props.checked ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className="sr-only"
          {...props}
        />
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Toggle.displayName = "Toggle";

export default Toggle;
