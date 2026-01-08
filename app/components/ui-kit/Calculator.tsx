"use client";

import { useState } from "react";

interface CalculatorProps {
  initialValue: string;
  onCalculate: (result: string) => void;
  onClose: () => void;
}

type Operator = "+" | "-" | "×" | "÷" | null;

export default function Calculator({
  initialValue,
  onCalculate,
  onClose,
}: CalculatorProps) {
  const [display, setDisplay] = useState(initialValue || "0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [currentOperator, setCurrentOperator] = useState<Operator>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);

  const MAX_VALUE = 999999999.99;

  const handleNumberClick = (num: string) => {
    if (display === "Error") {
      setDisplay(num);
      return;
    }

    if (shouldResetDisplay) {
      setDisplay(num);
      setShouldResetDisplay(false);
      return;
    }

    if (display === "0" && num !== ".") {
      setDisplay(num);
    } else {
      const newDisplay = display + num;
      const value = parseFloat(newDisplay);
      if (value <= MAX_VALUE) {
        setDisplay(newDisplay);
      }
    }
  };

  const handleDecimal = () => {
    if (display === "Error") {
      setDisplay("0.");
      return;
    }

    if (shouldResetDisplay) {
      setDisplay("0.");
      setShouldResetDisplay(false);
      return;
    }

    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const calculate = (a: number, b: number, operator: Operator): number => {
    switch (operator) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        if (b === 0) {
          throw new Error("Division by zero");
        }
        return a / b;
      default:
        return b;
    }
  };

  const handleOperatorClick = (operator: Operator) => {
    if (display === "Error") {
      setDisplay("0");
      setPreviousValue(null);
      setCurrentOperator(operator);
      setShouldResetDisplay(true);
      return;
    }

    const currentValue = parseFloat(display);

    if (previousValue !== null && currentOperator && !shouldResetDisplay) {
      try {
        const result = calculate(previousValue, currentValue, currentOperator);
        const roundedResult = Math.round(result * 100) / 100;

        if (roundedResult > MAX_VALUE) {
          setDisplay("Error");
          setPreviousValue(null);
          setCurrentOperator(null);
          setShouldResetDisplay(true);
          return;
        }

        setDisplay(roundedResult.toString());
        setPreviousValue(roundedResult);
      } catch (error) {
        setDisplay("Error");
        setPreviousValue(null);
        setCurrentOperator(null);
        setShouldResetDisplay(true);
        return;
      }
    } else {
      setPreviousValue(currentValue);
    }

    setCurrentOperator(operator);
    setShouldResetDisplay(true);
  };

  const handleEquals = () => {
    if (display === "Error") {
      onClose();
      return;
    }

    if (previousValue !== null && currentOperator) {
      const currentValue = parseFloat(display);
      try {
        const result = calculate(previousValue, currentValue, currentOperator);
        const roundedResult = Math.round(result * 100) / 100;

        if (roundedResult > MAX_VALUE) {
          setDisplay("Error");
          setPreviousValue(null);
          setCurrentOperator(null);
          setShouldResetDisplay(true);
          return;
        }

        const formattedResult = roundedResult.toFixed(2);
        onCalculate(formattedResult);
        onClose();
      } catch (error) {
        setDisplay("Error");
        setPreviousValue(null);
        setCurrentOperator(null);
        setShouldResetDisplay(true);
      }
    } else {
      const formattedResult = parseFloat(display).toFixed(2);
      onCalculate(formattedResult);
      onClose();
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setCurrentOperator(null);
    setShouldResetDisplay(false);
  };

  const handleBackspace = () => {
    if (display === "Error") {
      setDisplay("0");
      return;
    }

    if (shouldResetDisplay) {
      setDisplay("0");
      setShouldResetDisplay(false);
      return;
    }

    if (display.length === 1) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const Button = ({
    children,
    onClick,
    variant = "default",
    className = "",
  }: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "operator" | "clear" | "equals";
    className?: string;
  }) => {
    const baseClass =
      "h-11 rounded-lg font-medium transition-colors text-sm flex items-center justify-center";
    const variantClass = {
      default:
        "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600",
      operator:
        "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700",
      clear:
        "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
      equals:
        "bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700",
    }[variant];

    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} ${variantClass} ${className}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg shadow-lg p-3 mt-2">
      {/* Display */}
      <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="text-right text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">
          {display}
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1: C, ⌫, ÷, × */}
        <Button onClick={handleClear} variant="clear">
          C
        </Button>
        <Button onClick={handleBackspace} variant="default">
          ⌫
        </Button>
        <Button onClick={() => handleOperatorClick("÷")} variant="operator">
          ÷
        </Button>
        <Button onClick={() => handleOperatorClick("×")} variant="operator">
          ×
        </Button>

        {/* Row 2: 7, 8, 9, - */}
        <Button onClick={() => handleNumberClick("7")} variant="default">
          7
        </Button>
        <Button onClick={() => handleNumberClick("8")} variant="default">
          8
        </Button>
        <Button onClick={() => handleNumberClick("9")} variant="default">
          9
        </Button>
        <Button onClick={() => handleOperatorClick("-")} variant="operator">
          −
        </Button>

        {/* Row 3: 4, 5, 6, + */}
        <Button onClick={() => handleNumberClick("4")} variant="default">
          4
        </Button>
        <Button onClick={() => handleNumberClick("5")} variant="default">
          5
        </Button>
        <Button onClick={() => handleNumberClick("6")} variant="default">
          6
        </Button>
        <Button onClick={() => handleOperatorClick("+")} variant="operator">
          +
        </Button>

        {/* Row 4: 1, 2, 3, = */}
        <Button onClick={() => handleNumberClick("1")} variant="default">
          1
        </Button>
        <Button onClick={() => handleNumberClick("2")} variant="default">
          2
        </Button>
        <Button onClick={() => handleNumberClick("3")} variant="default">
          3
        </Button>
        <Button onClick={handleEquals} variant="equals" className="row-span-2">
          =
        </Button>

        {/* Row 5: 0 (spans 2), . */}
        <Button onClick={() => handleNumberClick("0")} variant="default" className="col-span-2">
          0
        </Button>
        <Button onClick={handleDecimal} variant="default">
          .
        </Button>
      </div>
    </div>
  );
}
