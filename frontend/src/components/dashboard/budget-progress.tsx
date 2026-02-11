"use client";

import { useGetBudgetProgressQuery } from "@/store/api";
import { useDateRange } from "@/hooks/use-date-range";
import { useCurrency } from "@/hooks/use-currency";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface BudgetData {
  category: string;
  spent: number;
  limit: number;
}

export function BudgetProgress() {
  const { dateRange } = useDateRange();
  const { formatAmount } = useCurrency();
  const dateParams = { start_date: dateRange.startDate, end_date: dateRange.endDate };
  const { data: budgets, isLoading, isError, refetch } = useGetBudgetProgressQuery(dateParams) as {
    data: BudgetData[] | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  };

  if (isError) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-red-100 dark:border-red-900">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load budget progress</p>
        <button onClick={() => refetch()} className="text-xs text-red-500 underline mt-1">Retry</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800 animate-pulse">
        <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
              <div className="h-2 bg-secondary-100 dark:bg-secondary-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalSpent = budgets?.reduce((s, b) => s + Number(b.spent), 0) || 0;
  const totalLimit = budgets?.reduce((s, b) => s + Number(b.limit), 0) || 0;
  const overallPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800">
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100">
            Budget Progress
          </h3>
          <p className="text-xs text-secondary-400 mt-0.5">
            {overallPercent}% of total budget used
          </p>
        </div>
        <Link
          href="/dashboard/budgets"
          className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-0.5 transition-colors"
        >
          Manage
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="px-6 pb-6 space-y-3.5">
        {budgets?.map((budget) => {
          const spent = Number(budget.spent);
          const limit = Number(budget.limit);
          const percentage = Math.min((spent / limit) * 100, 100);
          const isOverBudget = spent > limit;

          return (
            <div key={budget.category}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                  {budget.category}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    isOverBudget
                      ? "text-red-600 font-semibold"
                      : "text-secondary-500"
                  }`}
                >
                  {formatAmount(spent)}{" "}
                  <span className="text-secondary-300 dark:text-secondary-600">/</span>{" "}
                  {formatAmount(limit)}
                </span>
              </div>
              <div className="h-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverBudget
                      ? "bg-red-500"
                      : percentage > 80
                        ? "bg-yellow-500"
                        : "bg-primary-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        {(!budgets || budgets.length === 0) && (
          <div className="text-center py-6">
            <p className="text-sm text-secondary-400 mb-2">
              No budgets set yet
            </p>
            <Link
              href="/dashboard/budgets"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Create your first budget
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
