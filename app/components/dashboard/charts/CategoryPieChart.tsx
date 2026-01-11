"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface CategoryData {
  category: string;
  subcategory?: string;
  totalCents: number;
  count: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  drilldownCategory?: string;
  onCategoryClick: (category: string, subcategory?: string) => void;
  height?: number;
}

// Color palette for pie slices
const COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#eab308", // yellow-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
];

export default function CategoryPieChart({
  data,
  drilldownCategory,
  onCategoryClick,
  height = 300,
}: CategoryPieChartProps) {
  // Format data for recharts
  const chartData = data.map((item) => ({
    name: drilldownCategory ? item.subcategory! : item.category,
    value: item.totalCents / 100, // Convert to dollars
    count: item.count,
    category: item.category,
    subcategory: item.subcategory,
  }));

  // Custom label
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / entry.payload.total) * 100).toFixed(0);
    return `${entry.name}: ${percent}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-zinc-800 px-2 py-1.5 rounded shadow-lg border border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {data.name}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            ${data.value.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {data.count} 笔交易
          </p>
        </div>
      );
    }
    return null;
  };

  // Handle pie slice click
  const handlePieClick = (entry: any) => {
    if (drilldownCategory) {
      // Clicking a subcategory → show expense list
      onCategoryClick(entry.category, entry.subcategory);
    } else {
      // Clicking a category → drill down
      onCategoryClick(entry.category);
    }
  };

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700"
        style={{ height }}
      >
        <div className="text-center">
          <svg
            className="w-10 h-10 mx-auto mb-1.5 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
            />
          </svg>
          <p className="text-xs">暂无支出数据</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="40%"
          labelLine={false}
          label={false}
          outerRadius={Math.min(80, height * 0.25)}
          fill="#8884d8"
          dataKey="value"
          onClick={handlePieClick}
          cursor="pointer"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{
            fontSize: "12px",
            paddingTop: "10px",
          }}
          formatter={(value, entry: any) => (
            <span className="text-xs text-zinc-700 dark:text-zinc-300">
              {value} (${entry.payload.value.toFixed(0)})
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
