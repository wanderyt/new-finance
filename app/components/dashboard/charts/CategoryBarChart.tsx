"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CategoryData {
  category: string;
  subcategory?: string;
  totalCents: number;
  count: number;
}

interface CategoryBarChartProps {
  data: CategoryData[];
  drilldownCategory?: string;
  onCategoryClick: (category: string, subcategory?: string) => void;
  height?: number;
}

export default function CategoryBarChart({
  data,
  drilldownCategory,
  onCategoryClick,
  height = 400,
}: CategoryBarChartProps) {
  // Format data for recharts
  const chartData = data.map((item) => ({
    name: drilldownCategory ? item.subcategory! : item.category,
    total: item.totalCents / 100, // Convert to dollars
    count: item.count,
    category: item.category,
    subcategory: item.subcategory,
  }));

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
            ${data.total.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {data.count} 笔交易
          </p>
        </div>
      );
    }
    return null;
  };

  // Handle bar click
  const handleBarClick = (data: any) => {
    if (drilldownCategory) {
      // Clicking a subcategory → show expense list
      onCategoryClick(data.category, data.subcategory);
    } else {
      // Clicking a category → drill down to subcategories
      onCategoryClick(data.category);
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-xs">暂无支出数据</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-zinc-200 dark:stroke-zinc-700"
        />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={80}
          className="text-xs fill-zinc-700 dark:fill-zinc-300"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          className="text-xs fill-zinc-700 dark:fill-zinc-300"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toFixed(0)}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.1)" }} />
        <Bar
          dataKey="total"
          fill="#dc2626"
          className="dark:fill-red-400"
          onClick={handleBarClick}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
