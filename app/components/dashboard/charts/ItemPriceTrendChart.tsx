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

interface WeeklyPricePoint {
  merchant: string;
  week: string;
  avgPrice: number;
  count: number;
}

interface ItemPriceTrendChartProps {
  itemName: string;
  data: WeeklyPricePoint[];
  merchants: string[];
}

// Generate distinct colors for merchants
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

// Convert ISO week (e.g., "2025-W08") to readable date format
function formatWeekLabel(isoWeek: string): string {
  const [year, weekStr] = isoWeek.split("-W");
  const weekNum = parseInt(weekStr, 10);

  // Calculate the date of the first day of the week (Monday)
  // ISO week 1 is the week with the first Thursday of the year
  const jan4 = new Date(parseInt(year), 0, 4);
  const jan4Day = jan4.getDay() || 7; // Sunday = 7
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4Day + 1 + (weekNum - 1) * 7);

  // Format as MM/DD
  const month = String(weekStart.getMonth() + 1).padStart(2, "0");
  const day = String(weekStart.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

export function ItemPriceTrendChart({
  itemName,
  data,
  merchants,
}: ItemPriceTrendChartProps) {
  // Transform data: group by week, create one entry per week with all merchant prices
  const weekMap = new Map<string, Record<string, number>>();

  for (const point of data) {
    if (!weekMap.has(point.week)) {
      weekMap.set(point.week, {});
    }
    weekMap.get(point.week)![point.merchant] = point.avgPrice;
  }

  const chartData = Array.from(weekMap.entries())
    .map(([week, merchantPrices]) => ({
      week,
      weekLabel: formatWeekLabel(week),
      ...merchantPrices,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 dark:text-zinc-400">
        暂无数据
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: "currentColor", fontSize: 11 }}
            tickMargin={8}
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 11 }}
            label={{
              value: "平均价格 ($)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--tooltip-bg)",
              border: "1px solid var(--tooltip-border)",
              borderRadius: "0.375rem",
              fontSize: "11px",
            }}
            formatter={(value: number | undefined) => [
              `$${value?.toFixed(2)}`,
              "",
            ]}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={10} />
          {merchants.map((merchant, index) => (
            <Line
              key={merchant}
              type="monotone"
              dataKey={merchant}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={1.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
