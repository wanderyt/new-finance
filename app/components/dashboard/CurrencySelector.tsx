"use client";

import Select from "../ui-kit/Select";

interface CurrencySelectorProps {
  value: "CAD" | "USD" | "CNY";
  onChange: (currency: "CAD" | "USD" | "CNY") => void;
  label?: string;
  className?: string;
}

const CURRENCY_OPTIONS = [
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
];

const CurrencySelector = ({
  value,
  onChange,
  label = "Currency",
  className = "",
}: CurrencySelectorProps) => {
  return (
    <Select
      label={label}
      options={CURRENCY_OPTIONS}
      value={value}
      onChange={(e) => onChange(e.target.value as "CAD" | "USD" | "CNY")}
      className={className}
    />
  );
};

export default CurrencySelector;
