"use client";

import { useGetCategoryBreakdownQuery } from "@/store/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDateRange } from "@/hooks/use-date-range";
import { useCurrency } from "@/hooks/use-currency";

interface CategoryData {
  name: string;
  amount: number;
  color: string;
}

export function CategoryBreakdown() {
  const { dateRange } = useDateRange();
  const { formatAmount } = useCurrency();
  const dateParams = { start_date: dateRange.startDate, end_date: dateRange.endDate };
  const { data: categories, isLoading, isError, refetch } = useGetCategoryBreakdownQuery(dateParams) as {
    data: CategoryData[] | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  };

  if (isError) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-red-100 dark:border-red-900">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load categories</p>
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

  const dataWithColors =
    categories?.map((cat) => ({
      ...cat,
      color: cat.color || "#6B7280",
    })) || [];

  const total =
    dataWithColors.reduce((sum, cat) => sum + Number(cat.amount), 0) || 0;

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-1">
        By Category
      </h3>
      <p className="text-xs text-secondary-400 mb-4">
        {formatAmount(total)} total
      </p>
      <div className="flex items-center gap-6">
        <div className="h-44 w-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithColors}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={68}
                paddingAngle={3}
                dataKey="amount"
                strokeWidth={0}
              >
                {dataWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
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
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2.5 max-h-44 overflow-y-auto pr-1">
          {dataWithColors.map((category) => (
            <div key={category.name} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm text-secondary-600 dark:text-secondary-400 flex-1 truncate">
                {category.name}
              </span>
              <span className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 tabular-nums">
                {formatAmount(Number(category.amount))}
              </span>
              <span className="text-xs text-secondary-400 w-10 text-right tabular-nums">
                {total > 0 ? ((Number(category.amount) / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
