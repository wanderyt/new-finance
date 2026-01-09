"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Select from "../../ui-kit/Select";

interface DayAccumulation {
  day: number;
  month1Total: number;
  month2Total: number;
}

interface MonthComparisonLineChartProps {
  month1?: string;
  month2?: string;
  data: DayAccumulation[];
  availableMonths: string[];
  onMonth1Change: (month: string) => void;
  onMonth2Change: (month: string) => void;
  height?: number;
}

export default function MonthComparisonLineChart({
  month1,
  month2,
  data,
  availableMonths,
  onMonth1Change,
  onMonth2Change,
  height = 400,
}: MonthComparisonLineChartProps) {
  // Format month for display
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  // Format chart data for recharts
  const chartData = data.map((item) => ({
    day: item.day,
    [month1 || "Month 1"]: item.month1Total / 100,
    [month2 || "Month 2"]: item.month2Total / 100,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Day {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {entry.name}: ${entry.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!month1 || !month2) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700"
        style={{ height }}
      >
        <p className="text-sm">Please select two months to compare</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Month 1
          </label>
          <select
            value={month1}
            onChange={(e) => onMonth1Change(e.target.value)}
            className="w-full px-3.5 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Month 2
          </label>
          <select
            value={month2}
            onChange={(e) => onMonth2Change(e.target.value)}
            className="w-full px-3.5 py-2.5 text-base rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          <XAxis
            dataKey="day"
            className="text-xs fill-zinc-700 dark:fill-zinc-300"
            tick={{ fontSize: 12 }}
            label={{
              value: "Day of Month",
              position: "insideBottom",
              offset: -10,
              className: "fill-zinc-700 dark:fill-zinc-300",
            }}
          />
          <YAxis
            className="text-xs fill-zinc-700 dark:fill-zinc-300"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            label={{
              value: "Accumulated Expenses ($)",
              angle: -90,
              position: "insideLeft",
              className: "fill-zinc-700 dark:fill-zinc-300",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
            formatter={(value) => formatMonth(value)}
          />
          <Line
            type="monotone"
            dataKey={month1}
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            className="dark:stroke-blue-400"
          />
          <Line
            type="monotone"
            dataKey={month2}
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            className="dark:stroke-amber-400"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
