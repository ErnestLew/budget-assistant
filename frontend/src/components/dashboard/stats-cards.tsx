"use client";

import { TrendingUp, TrendingDown, DollarSign, Receipt, PiggyBank, Percent } from "lucide-react";
import { useGetStatsQuery } from "@/store/api";
import { useDateRange } from "@/hooks/use-date-range";
import { useCurrency } from "@/hooks/use-currency";

interface Stats {
  total_spent: number;
  monthly_budget: number;
  transaction_count: number;
  savings_rate: number;
  trend_percentage: number;
}

export function StatsCards() {
  const { dateRange } = useDateRange();
  const { formatAmount } = useCurrency();
  const dateParams = { start_date: dateRange.startDate, end_date: dateRange.endDate };
  const { data: stats, isLoading, isError, refetch } = useGetStatsQuery(dateParams) as {
    data: Stats | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  };

  if (isError) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-5 border border-red-100 dark:border-red-900">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load stats</p>
        <button onClick={() => refetch()} className="text-xs text-red-500 underline mt-1">Retry</button>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-secondary-900 rounded-2xl p-5 border border-secondary-100 dark:border-secondary-800 animate-pulse">
            <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2 mb-4" />
            <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const budgetUsed = Math.round((stats.total_spent / stats.monthly_budget) * 100);

  const cards = [
    {
      title: "Total Spent",
      value: formatAmount(stats.total_spent),
      icon: DollarSign,
      iconBg: "bg-red-50 dark:bg-red-950",
      iconColor: "text-red-500",
      trend: stats.trend_percentage,
      trendLabel: "vs last period",
    },
    {
      title: "Monthly Budget",
      value: formatAmount(stats.monthly_budget),
      icon: Receipt,
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-500",
      subtitle: `${budgetUsed}% used`,
      subtitleColor: budgetUsed > 90 ? "text-red-500" : budgetUsed > 70 ? "text-yellow-500" : "text-green-500",
    },
    {
      title: "Transactions",
      value: stats.transaction_count.toString(),
      icon: Receipt,
      iconBg: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-500",
      subtitle: "This period",
    },
    {
      title: "Savings Rate",
      value: `${stats.savings_rate}%`,
      icon: PiggyBank,
      iconBg: "bg-green-50 dark:bg-green-950",
      iconColor: "text-green-500",
      subtitle: "Of budget saved",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white dark:bg-secondary-900 rounded-2xl p-5 border border-secondary-100 dark:border-secondary-800 hover:border-secondary-200 dark:hover:border-secondary-700 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
              {card.title}
            </p>
            <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center`}>
              <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">
            {card.value}
          </p>
          {card.trend !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              {card.trend >= 0 ? (
                <div className="flex items-center gap-0.5 text-red-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{Math.abs(card.trend)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-green-500">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{Math.abs(card.trend)}%</span>
                </div>
              )}
              <span className="text-xs text-secondary-400">{card.trendLabel}</span>
            </div>
          )}
          {card.subtitle && (
            <p className={`mt-2 text-xs ${card.subtitleColor || "text-secondary-400"}`}>
              {card.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
