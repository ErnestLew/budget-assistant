"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetFormData } from "@/lib/validations";
import {
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useCreateBudgetAlertMutation,
} from "@/store/api";
import { useCurrency } from "@/hooks/use-currency";
import {
  type BudgetItem,
  type CategoryItem,
} from "@/hooks/use-budgets";

interface BudgetFormModalProps {
  budget: BudgetItem | null;
  categories: CategoryItem[];
  onClose: () => void;
}

export function BudgetFormModal({
  budget,
  categories,
  onClose,
}: BudgetFormModalProps) {
  const { currency } = useCurrency();
  const isEdit = !!budget;

  const [createBudget] = useCreateBudgetMutation();
  const [updateBudget] = useUpdateBudgetMutation();
  const [createAlert] = useCreateBudgetAlertMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: budget?.name || "",
      amount: budget?.amount || (undefined as unknown as number),
      period: budget?.period || "monthly",
      categoryId: budget?.category_id || "",
      startDate: budget?.start_date
        ? format(new Date(budget.start_date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-01"),
      endDate: budget?.end_date
        ? format(new Date(budget.end_date), "yyyy-MM-dd")
        : "",
      alertThreshold: 80,
    },
  });

  const alertThreshold = watch("alertThreshold");

  const onSubmit = async (data: BudgetFormData) => {
    try {
      const payload = {
        name: data.name.trim(),
        amount: data.amount,
        period: data.period,
        category_id: data.categoryId || null,
        start_date: new Date(data.startDate + "T00:00:00").toISOString(),
        end_date: data.endDate
          ? new Date(data.endDate + "T00:00:00").toISOString()
          : null,
      };

      if (isEdit) {
        await updateBudget({ id: budget!.id, data: payload }).unwrap();
      } else {
        const res = (await createBudget(payload).unwrap()) as { id: string };
        if (data.alertThreshold && data.alertThreshold > 0) {
          await createAlert({
            budget_id: res.id,
            threshold: data.alertThreshold,
          }).unwrap();
        }
      }
      onClose();
    } catch (err) {
      console.error("Failed to save budget:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-lg max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            {isEdit ? "Edit Budget" : "New Budget"}
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
              Budget Name
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Monthly Food Budget"
              className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100 dark:placeholder:text-secondary-500"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary-500">
                {currency}
              </span>
              <input
                type="number"
                {...register("amount", { valueAsNumber: true })}
                min="1"
                step="0.01"
                placeholder="500.00"
                className="w-full pl-12 pr-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100 dark:placeholder:text-secondary-500"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Period
            </label>
            <select
              {...register("period")}
              className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            {errors.period && (
              <p className="text-xs text-red-500 mt-1">{errors.period.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Category (optional)
            </label>
            <select
              {...register("categoryId")}
              className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
            >
              <option value="">All Spending</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              {...register("startDate")}
              className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
            />
            {errors.startDate && (
              <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              End Date (optional)
            </label>
            <input
              type="date"
              {...register("endDate")}
              className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
            />
            {errors.endDate && (
              <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>
            )}
          </div>

          {/* Alert Threshold (create only) */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Alert at (% of budget)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  {...register("alertThreshold", { valueAsNumber: true })}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 w-10 text-right">
                  {alertThreshold ?? 80}%
                </span>
              </div>
              <p className="text-xs text-secondary-400 mt-1">
                {(alertThreshold ?? 0) === 0
                  ? "No alert"
                  : `Alert when spending reaches ${alertThreshold}% of budget`}
              </p>
            </div>
          )}

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
