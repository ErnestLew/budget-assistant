"use client";

import {
  useGetCategoriesDetailedQuery,
  useGetCategoriesQuery,
  useGetCategoryTrendQuery,
  useDeleteCategoryMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from "@/store/api";
import { useAppSelector } from "@/hooks/use-store";
import { selectDateParams } from "@/store/slices/dateRangeSlice";

// --- Types ---

export interface CategoryDetailed {
  category_id: string;
  name: string;
  icon: string | null;
  color: string;
  is_default: boolean;
  amount: number;
  transaction_count: number;
  percentage: number;
  budget_limit: number | null;
  previous_amount: number;
  trend_percentage: number;
  avg_transaction: number;
  top_merchant: string | null;
  top_merchant_amount: number | null;
}

export interface CategoryTrend {
  category_id: string;
  name: string;
  color: string;
  data_points: { date: string; amount: number }[];
  recent_transactions: {
    id: string;
    merchant: string;
    amount: number;
    currency: string;
    date: string;
    status: string;
  }[];
  total_amount: number;
  avg_daily: number;
  peak_day: string | null;
  peak_amount: number | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  is_default: boolean;
}

// --- Hooks ---

export function useCategoriesDetailed() {
  const dateParams = useAppSelector(selectDateParams);
  return useGetCategoriesDetailedQuery(dateParams) as ReturnType<typeof useGetCategoriesDetailedQuery> & {
    data: CategoryDetailed[] | undefined;
  };
}

export function useAllCategories() {
  return useGetCategoriesQuery() as ReturnType<typeof useGetCategoriesQuery> & {
    data: CategoryItem[] | undefined;
  };
}

export function useCategoryTrend(categoryId: string | null) {
  const dateParams = useAppSelector(selectDateParams);
  return useGetCategoryTrendQuery(
    { categoryId: categoryId!, ...dateParams },
    { skip: !categoryId }
  ) as ReturnType<typeof useGetCategoryTrendQuery> & {
    data: CategoryTrend | undefined;
  };
}

export function useDeleteCategory() {
  const [deleteCategory, { isLoading }] = useDeleteCategoryMutation();
  return {
    mutate: (id: string) => deleteCategory(id),
    isPending: isLoading,
  };
}

export function useSaveCategory(onSuccess: () => void) {
  const [createCategory, createResult] = useCreateCategoryMutation();
  const [updateCategory, updateResult] = useUpdateCategoryMutation();

  const createMutation = {
    mutateAsync: async (data: { name: string; icon: string; color: string }) => {
      const result = await createCategory(data).unwrap();
      onSuccess();
      return result;
    },
    isPending: createResult.isLoading,
  };

  const updateMutation = {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; icon: string; color: string };
    }) => {
      const result = await updateCategory({ id, data }).unwrap();
      onSuccess();
      return result;
    },
    isPending: updateResult.isLoading,
  };

  return { createMutation, updateMutation };
}
