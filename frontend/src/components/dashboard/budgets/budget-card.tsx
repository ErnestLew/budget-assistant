"use client";

import { format } from "date-fns";
import { Pencil, Trash2, Bell } from "lucide-react";
import type {
  BudgetItem,
  BudgetProgressItem,
  BudgetAlertItem,
} from "@/hooks/use-budgets";

interface BudgetCardProps {
  budget: BudgetItem;
  progress: BudgetProgressItem | undefined;
  alert: BudgetAlertItem | undefined;
  formatAmount: (amount: number) => string;
  onEdit: (budget: BudgetItem) => void;
  onDelete: (id: string) => void;
}

export function BudgetCard({
  budget,
  progress,
  alert,
  formatAmount,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const spent = progress ? Number(progress.spent) : 0;
  const limit = Number(budget.amount);
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const isOver = pct > 100;

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-5">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">
            {budget.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 capitalize">
              {budget.period}
            </span>
            {alert && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {alert.threshold}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(budget)}
            className="p-1.5 rounded text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-800"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this budget?")) {
                onDelete(budget.id);
              }
            }}
            className="p-1.5 rounded text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Amount display */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            {formatAmount(spent)}
          </span>
          <span className="text-sm text-secondary-500 dark:text-secondary-400">
            / {limit.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-secondary-500 dark:text-secondary-400">
            {Math.round(pct)}% used
          </span>
          <span
            className={
              isOver
                ? "text-red-600 font-semibold"
                : "text-secondary-400"
            }
          >
            {isOver
              ? `${formatAmount(spent - limit)} over`
              : `${formatAmount(limit - spent)} left`}
          </span>
        </div>
        <div className="w-full bg-secondary-100 dark:bg-secondary-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isOver
                ? "bg-red-500"
                : pct > 80
                  ? "bg-yellow-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-secondary-400">
        <span>
          Started{" "}
          {format(new Date(budget.start_date), "MMM d, yyyy")}
        </span>
        {!budget.is_active && (
          <span className="text-red-500 font-medium">Inactive</span>
        )}
      </div>
    </div>
  );
}
