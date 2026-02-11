"use client";

import { format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import {
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryFormData } from "@/lib/validations";
import { useCurrency } from "@/hooks/use-currency";
import { CategoryIcon } from "@/components/dashboard/categories/category-card";
import { useSaveCategory } from "@/hooks/use-categories";
import type { CategoryTrend, CategoryItem } from "@/hooks/use-categories";

// --- Category Detail Panel ---

export function CategoryDetailPanel({
  trend,
  onClose,
}: {
  trend: CategoryTrend;
  onClose: () => void;
}) {
  const { formatAmount } = useCurrency();
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-secondary-100 dark:border-secondary-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: trend.color }}
          />
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">{trend.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
        >
          <X className="h-4 w-4 text-secondary-400" />
        </button>
      </div>

      {/* Mini chart */}
      <div className="p-4 border-b border-secondary-100 dark:border-secondary-800">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.data_points}>
              <defs>
                <linearGradient
                  id={`gradient-${trend.category_id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={trend.color}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor={trend.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="amount"
                stroke={trend.color}
                fill={`url(#gradient-${trend.category_id})`}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(v: number) => [formatAmount(Number(v))]}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgb(0 0 0 / 0.25)",
                  padding: "8px 12px",
                  fontSize: "12px",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-secondary-100 dark:divide-secondary-800 border-b border-secondary-100 dark:border-secondary-800">
        <div className="p-3 text-center">
          <p className="text-xs text-secondary-400">Total</p>
          <p className="text-sm font-bold text-secondary-900 dark:text-secondary-100">
            {formatAmount(Number(trend.total_amount))}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-secondary-400">Avg/Day</p>
          <p className="text-sm font-bold text-secondary-900 dark:text-secondary-100">
            {formatAmount(Number(trend.avg_daily))}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-secondary-400">Peak</p>
          <p className="text-sm font-bold text-secondary-900 dark:text-secondary-100">
            {trend.peak_day || "\u2014"}
          </p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="p-4">
        <h4 className="text-xs font-medium text-secondary-500 uppercase tracking-wide mb-3">
          Recent Transactions
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {trend.recent_transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <p className="font-medium text-secondary-900 dark:text-secondary-100 text-sm">
                  {tx.merchant}
                </p>
                <p className="text-xs text-secondary-400">
                  {tx.date ? format(new Date(tx.date), "MMM d") : ""}
                </p>
              </div>
              <span className="font-medium text-secondary-900 dark:text-secondary-100">
                {formatAmount(Number(tx.amount))}
              </span>
            </div>
          ))}
          {trend.recent_transactions.length === 0 && (
            <p className="text-sm text-secondary-400 text-center py-2">
              No transactions
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/transactions`}
          className="block mt-3 text-xs font-medium text-primary-600 hover:text-primary-700 text-center"
        >
          View all transactions
        </Link>
      </div>
    </div>
  );
}

// --- Category Management Panel ---

export function CategoryManagement({
  categories,
  onEdit,
  onDelete,
}: {
  categories: CategoryItem[];
  onEdit: (cat: CategoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const customCategories = categories.filter((c) => !c.is_default);

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800">
      <div className="p-4 border-b border-secondary-100 dark:border-secondary-800">
        <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
          Category Management
        </h3>
      </div>
      <div className="p-4">
        {customCategories.length > 0 ? (
          <div className="space-y-2">
            {customCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <CategoryIcon icon={cat.icon} className="h-4 w-4 text-secondary-500" />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(cat)}
                    className="p-1 rounded text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(cat.id)}
                    className="p-1 rounded text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-secondary-400 text-center py-4">
            No custom categories yet. Click &quot;Add Category&quot; to create
            one.
          </p>
        )}
        <p className="text-xs text-secondary-400 mt-4 pt-3 border-t border-secondary-100 dark:border-secondary-800">
          {categories.filter((c) => c.is_default).length} default categories
          cannot be edited or deleted.
        </p>
      </div>
    </div>
  );
}

// --- Category Form Modal ---

const PRESET_COLORS = [
  "#22C55E", "#F97316", "#EF4444", "#3B82F6",
  "#EC4899", "#8B5CF6", "#F59E0B", "#6366F1",
  "#14B8A6", "#10B981", "#06B6D4", "#0EA5E9",
];

const PRESET_ICONS = [
  "shopping-cart", "utensils", "bike", "shopping-bag",
  "package", "car", "receipt", "repeat",
  "film", "heart", "book", "plane", "more-horizontal",
];

export function CategoryFormModal({
  category,
  onClose,
}: {
  category: CategoryItem | null;
  onClose: () => void;
}) {
  const isEdit = !!category;

  const { createMutation, updateMutation } = useSaveCategory(() => {
    onClose();
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      icon: category?.icon || "shopping-bag",
      color: category?.color || PRESET_COLORS[0],
    },
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

  const onSubmit = async (data: CategoryFormData) => {
    try {
      const payload = {
        name: data.name.trim(),
        icon: data.icon || "shopping-bag",
        color: data.color || PRESET_COLORS[0],
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: category!.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (err) {
      console.error("Failed to save category:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            {isEdit ? "Edit Category" : "New Category"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-800"
          >
            <X className="h-5 w-5 text-secondary-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Name
            </label>
            <input
              type="text"
              {...register("name")}
              maxLength={100}
              className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm bg-white dark:bg-secondary-800 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="e.g. Pet Supplies"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Icon
            </label>
            <div className="grid grid-cols-7 gap-2">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setValue("icon", ic)}
                  className={`p-2 rounded-lg border transition-all ${
                    selectedIcon === ic
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-950 ring-1 ring-primary-500"
                      : "border-secondary-200 hover:border-secondary-300 dark:border-secondary-700 dark:hover:border-secondary-600"
                  }`}
                >
                  <CategoryIcon icon={ic} className="h-4 w-4 text-secondary-600 mx-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === c
                      ? "border-secondary-900 dark:border-secondary-100 scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
