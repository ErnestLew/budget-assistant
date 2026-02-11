"use client";

import {
  useGetBudgetsQuery,
  useGetBudgetProgressQuery,
  useGetBudgetAlertsQuery,
  useGetCategoriesQuery,
  useDeleteBudgetMutation,
} from "@/store/api";

// --- Types ---

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  category_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetProgressItem {
  category: string;
  spent: number;
  limit: number;
}

export interface BudgetAlertItem {
  id: string;
  budget_id: string;
  threshold: number;
  is_triggered: boolean;
  triggered_at: string | null;
  notification_sent: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

// --- Hooks ---

export function useBudgets() {
  return useGetBudgetsQuery() as ReturnType<typeof useGetBudgetsQuery> & {
    data: BudgetItem[] | undefined;
  };
}

export function useBudgetProgress(startDate: string, endDate: string) {
  return useGetBudgetProgressQuery({
    start_date: startDate,
    end_date: endDate,
  }) as ReturnType<typeof useGetBudgetProgressQuery> & {
    data: BudgetProgressItem[] | undefined;
  };
}

export function useBudgetAlerts() {
  return useGetBudgetAlertsQuery() as ReturnType<typeof useGetBudgetAlertsQuery> & {
    data: BudgetAlertItem[] | undefined;
  };
}

export function useCategories() {
  return useGetCategoriesQuery() as ReturnType<typeof useGetCategoriesQuery> & {
    data: CategoryItem[] | undefined;
  };
}

export function useDeleteBudget() {
  const [deleteBudget, { isLoading }] = useDeleteBudgetMutation();
  return {
    mutate: (id: string) => deleteBudget(id),
    isPending: isLoading,
  };
}
