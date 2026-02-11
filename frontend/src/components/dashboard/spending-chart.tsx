"use client";

import { useGetSpendingQuery } from "@/store/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";
import { useDateRange } from "@/hooks/use-date-range";
import { useCurrency } from "@/hooks/use-currency";

interface SpendingData {
  date: string;
  amount: number;
}

function abbreviate(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toFixed(0);
}

export function SpendingChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { dateRange } = useDateRange();
  const { formatAmount } = useCurrency();
  const dateParams = { start_date: dateRange.startDate, end_date: dateRange.endDate };
  const { data: spendingData, isLoading, isError, refetch } = useGetSpendingQuery(dateParams) as {
    data: SpendingData[] | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  };

  if (isError) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-red-100 dark:border-red-900">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load spending chart</p>
        <button onClick={() => refetch()} className="text-xs text-red-500 underline mt-1">Retry</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800 animate-pulse">
        <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 mb-4" />
        <div className="h-64 bg-secondary-50 dark:bg-secondary-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-1">
        Spending Over Time
      </h3>
      <p className="text-xs text-secondary-400 mb-4">Daily spending for {dateRange.label}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spendingData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: isDark ? "#64748b" : "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={spendingData && spendingData.length > 15 ? Math.ceil(spendingData.length / 8) - 1 : 0}
              angle={spendingData && spendingData.length > 20 ? -35 : 0}
              textAnchor={spendingData && spendingData.length > 20 ? "end" : "middle"}
              height={spendingData && spendingData.length > 20 ? 50 : 30}
            />
            <YAxis
              tick={{ fontSize: 11, fill: isDark ? "#64748b" : "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={abbreviate}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                boxShadow: "0 4px 20px rgb(0 0 0 / 0.25)",
                padding: "8px 12px",
              }}
              itemStyle={{ color: "#f1f5f9", fontSize: 13 }}
              formatter={(value: number | string) => [
                formatAmount(Number(value)),
                "Spent",
              ]}
              labelStyle={{ color: "#94a3b8", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#22c55e"
              strokeWidth={2.5}
              fill="url(#spendingGradient)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: "#22c55e" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
