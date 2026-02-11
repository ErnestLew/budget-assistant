"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  ArrowUpRight,
  Hash,
  AlertTriangle,
  CheckCircle,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCurrency } from "@/hooks/use-currency";
import { DateSelector } from "@/components/dashboard/date-selector";
import {
  useCategoriesDetailed,
  useAllCategories,
  useCategoryTrend,
  useDeleteCategory,
} from "@/hooks/use-categories";
import type { CategoryDetailed, CategoryItem } from "@/hooks/use-categories";
import { CategoryCard } from "@/components/dashboard/categories/category-card";
import {
  CategoryDetailPanel,
  CategoryManagement,
  CategoryFormModal,
} from "@/components/dashboard/categories/category-detail-modal";

// --- Page wrapper ---

export default function CategoriesPage() {
  return <CategoriesContent />;
}

// --- Main content ---

function CategoriesContent() {
  const { formatAmount } = useCurrency();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(
    null
  );

  // Data fetching
  const { data: detailed, isLoading } = useCategoriesDetailed();
  const { data: allCategories } = useAllCategories();
  const { data: trend } = useCategoryTrend(selectedCategoryId);
  const deleteMutation = useDeleteCategory();

  const withSpending = detailed?.filter((c) => c.amount > 0) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">Categories</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
            Understand your spending patterns by category
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <DateSelector />

      {/* Insight Cards */}
      <InsightCards data={detailed || []} />

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {detailed?.map((cat) => (
          <CategoryCard
            key={cat.category_id}
            category={cat}
            isSelected={selectedCategoryId === cat.category_id}
            onClick={() =>
              setSelectedCategoryId(
                selectedCategoryId === cat.category_id
                  ? null
                  : cat.category_id
              )
            }
          />
        ))}
      </div>

      {/* Bottom section: Chart + Detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Horizontal bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            Spending Comparison
          </h3>
          {withSpending.length > 0 ? (
            <div style={{ height: Math.max(200, withSpending.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={withSpending}
                  margin={{ left: 10, right: 20 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v}`}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatAmount(Number(value)),
                      "Spent",
                    ]}
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#fff",
                      border: isDark ? "1px solid #334155" : "none",
                      boxShadow: "0 4px 20px rgb(0 0 0 / 0.08)",
                      padding: "8px 12px",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {withSpending.map((entry) => (
                      <Cell key={entry.category_id} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-8">
              No spending data for this period
            </p>
          )}
        </div>

        {/* Right panel */}
        <div>
          {selectedCategoryId && trend ? (
            <CategoryDetailPanel
              trend={trend}
              onClose={() => setSelectedCategoryId(null)}
            />
          ) : (
            <CategoryManagement
              categories={allCategories || []}
              onEdit={(cat) => {
                setEditingCategory(cat);
                setShowModal(true);
              }}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CategoryFormModal
          category={editingCategory}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}

// --- Insight Cards ---

function InsightCards({ data }: { data: CategoryDetailed[] }) {
  const { formatAmount } = useCurrency();
  const withSpending = data.filter((c) => c.amount > 0);
  const topCategory = withSpending[0]; // already sorted by amount desc
  const fastestGrowing = withSpending.reduce(
    (best, c) =>
      c.trend_percentage > (best?.trend_percentage ?? -Infinity) ? c : best,
    null as CategoryDetailed | null
  );
  const mostTransactions = withSpending.reduce(
    (best, c) =>
      c.transaction_count > (best?.transaction_count ?? -1) ? c : best,
    null as CategoryDetailed | null
  );
  const overBudgetCount = data.filter(
    (c) => c.budget_limit && c.amount > c.budget_limit
  ).length;

  const cards = [
    {
      label: "Top Category",
      value: topCategory ? formatAmount(Number(topCategory.amount)) : "\u2014",
      sub: topCategory?.name || "No data",
      icon: TrendingUp,
      color: topCategory?.color || "#6B7280",
    },
    {
      label: "Fastest Growing",
      value: fastestGrowing
        ? `${fastestGrowing.trend_percentage > 0 ? "+" : ""}${fastestGrowing.trend_percentage}%`
        : "\u2014",
      sub: fastestGrowing?.name || "No trend data",
      icon: ArrowUpRight,
      color: "#EF4444",
    },
    {
      label: "Most Transactions",
      value: mostTransactions ? `${mostTransactions.transaction_count}` : "\u2014",
      sub: mostTransactions?.name || "No data",
      icon: Hash,
      color: "#3B82F6",
    },
    {
      label: "Over Budget",
      value: overBudgetCount > 0 ? `${overBudgetCount}` : "All on track",
      sub:
        overBudgetCount > 0
          ? `${overBudgetCount} categor${overBudgetCount > 1 ? "ies" : "y"}`
          : "Within limits",
      icon: overBudgetCount > 0 ? AlertTriangle : CheckCircle,
      color: overBudgetCount > 0 ? "#EF4444" : "#22C55E",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-secondary-900 rounded-2xl p-4 border border-secondary-100 dark:border-secondary-800 hover:border-secondary-200 dark:hover:border-secondary-700 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
              {card.label}
            </span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${card.color}15` }}
            >
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
            </div>
          </div>
          <p className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">{card.value}</p>
          <p className="text-xs text-secondary-400 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
