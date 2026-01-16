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
import Dropdown from "../../ui-kit/Dropdown";

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
        <p className="text-xs">请选择两个月份进行对比</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Month Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            月份 1
          </label>
          <Dropdown
            value={month1}
            onChange={(value) => onMonth1Change(value)}
            options={availableMonths.map((month) => ({
              value: month,
              label: formatMonth(month),
            }))}
            placeholder="选择月份"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            月份 2
          </label>
          <Dropdown
            value={month2}
            onChange={(value) => onMonth2Change(value)}
            options={availableMonths.map((month) => ({
              value: month,
              label: formatMonth(month),
            }))}
            placeholder="选择月份"
          />
        </div>
      </div>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          <XAxis
            dataKey="day"
            className="text-xs fill-zinc-700 dark:fill-zinc-300"
            tick={{ fontSize: 10 }}
            label={{
              value: "日期",
              position: "insideBottom",
              offset: -5,
              className: "fill-zinc-700 dark:fill-zinc-300",
              fontSize: 10,
            }}
          />
          <YAxis
            className="text-xs fill-zinc-700 dark:fill-zinc-300"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            label={{
              value: "累计支出",
              angle: -90,
              position: "insideLeft",
              className: "fill-zinc-700 dark:fill-zinc-300",
              fontSize: 10,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "10px", fontSize: "10px" }}
            iconType="line"
            formatter={(value) => formatMonth(value)}
          />
          <Line
            type="monotone"
            dataKey={month1}
            stroke="#2563eb"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
            className="dark:stroke-blue-400"
          />
          <Line
            type="monotone"
            dataKey={month2}
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
            className="dark:stroke-amber-400"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
