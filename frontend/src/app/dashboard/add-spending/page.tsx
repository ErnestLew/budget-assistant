"use client";

import { useState } from "react";
import { PlusCircle, Check, AlertCircle, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormData } from "@/lib/validations";
import { useCreateTransactionMutation } from "@/store/api";
import { useAllCategories } from "@/hooks/use-categories";
import { useCurrency } from "@/hooks/use-currency";

export default function AddSpendingPage() {
  const { currency, supportedCurrencies } = useCurrency();
  const { data: categories } = useAllCategories();

  const today = new Date().toISOString().split("T")[0];

  const [createTransaction, { isLoading: saving }] = useCreateTransactionMutation();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      merchant: "",
      amount: undefined as unknown as number,
      currency: currency,
      date: today,
      categoryId: "",
      description: "",
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    setError("");
    setSuccess(false);
    try {
      await createTransaction({
        merchant: data.merchant.trim(),
        amount: parseFloat(data.amount.toFixed(2)),
        currency: data.currency,
        date: new Date(data.date).toISOString(),
        category_id: data.categoryId || null,
        description: data.description?.trim() || null,
        status: "VERIFIED",
        confidence: 1.0,
        is_primary: true,
      }).unwrap();
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save transaction";
      setError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">
          Add Spending
        </h1>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
          Manually record cash payments or transactions not captured by email
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-lg">
        <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-800 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-base font-semibold text-secondary-900 dark:text-secondary-100">
              Transaction Details
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Merchant */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Merchant <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("merchant")}
                placeholder="e.g. Mamak Stall, Parking, Petrol"
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100 placeholder:text-secondary-400"
              />
              {errors.merchant && (
                <p className="text-xs text-red-500 mt-1">{errors.merchant.message}</p>
              )}
            </div>

            {/* Amount + Currency row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100 placeholder:text-secondary-400"
                />
                {errors.amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
                )}
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Currency
                </label>
                <select
                  {...register("currency")}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
                >
                  {supportedCurrencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
                {errors.currency && (
                  <p className="text-xs text-red-500 mt-1">{errors.currency.message}</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("date")}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
              />
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Category
              </label>
              <select
                {...register("categoryId")}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
              >
                <option value="">Select a category (optional)</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Description
              </label>
              <textarea
                {...register("description")}
                placeholder="Optional notes about this purchase"
                rows={2}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100 placeholder:text-secondary-400 resize-none"
              />
            </div>

            {/* Success message */}
            {success && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Transaction saved! You can add another.
                </span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              {saving ? "Saving..." : "Add Transaction"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
