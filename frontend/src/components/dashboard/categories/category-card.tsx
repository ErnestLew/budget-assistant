"use client";

import {
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Utensils,
  Bike,
  ShoppingBag,
  Package,
  Car,
  Receipt,
  Repeat,
  Film,
  Heart,
  BookOpen,
  Plane,
  MoreHorizontal,
  Tag,
} from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import type { CategoryDetailed } from "@/hooks/use-categories";

// --- Icon map ---

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  bike: Bike,
  "shopping-bag": ShoppingBag,
  package: Package,
  car: Car,
  receipt: Receipt,
  repeat: Repeat,
  film: Film,
  heart: Heart,
  book: BookOpen,
  plane: Plane,
  "more-horizontal": MoreHorizontal,
};

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null;
  className?: string;
}) {
  const IconComponent = ICON_MAP[icon || ""] || Tag;
  return <IconComponent className={className} />;
}

// --- Category Card ---

export function CategoryCard({
  category: cat,
  isSelected,
  onClick,
}: {
  category: CategoryDetailed;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { formatAmount } = useCurrency();
  const budgetPct =
    cat.budget_limit && cat.budget_limit > 0
      ? (Number(cat.amount) / Number(cat.budget_limit)) * 100
      : null;

  return (
    <button
      onClick={onClick}
      className={`text-left bg-white dark:bg-secondary-900 rounded-2xl border transition-all hover:shadow-sm ${
        isSelected
          ? "ring-2 ring-primary-500 border-primary-300"
          : "border-secondary-100 dark:border-secondary-800 hover:border-secondary-200 dark:hover:border-secondary-700"
      }`}
    >
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: cat.color }}
      />
      <div className="p-4">
        {/* Icon + Name */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${cat.color}20` }}
          >
            <CategoryIcon
              icon={cat.icon}
              className="h-4 w-4"
            />
          </div>
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 truncate">
            {cat.name}
          </span>
        </div>

        {/* Amount */}
        <p className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
          {formatAmount(Number(cat.amount))}
        </p>

        {/* Count + Trend */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-secondary-400">
            {cat.transaction_count} transaction
            {cat.transaction_count !== 1 ? "s" : ""}
          </span>
          {cat.trend_percentage !== 0 && (
            <span
              className={`text-xs font-medium flex items-center gap-0.5 ${
                cat.trend_percentage > 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {cat.trend_percentage > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(cat.trend_percentage)}%
            </span>
          )}
        </div>

        {/* Budget bar */}
        {budgetPct !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-secondary-400">Budget</span>
              <span className="text-secondary-500">
                {Math.round(budgetPct)}%
              </span>
            </div>
            <div className="w-full bg-secondary-100 dark:bg-secondary-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  budgetPct > 100
                    ? "bg-red-500"
                    : budgetPct > 80
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
