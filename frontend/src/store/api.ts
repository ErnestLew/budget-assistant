import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { apiClient } from "@/lib/api-client";

// ---- Base query wrapping the existing axios client (preserves 401 refresh) ----

const axiosBaseQuery =
  (): BaseQueryFn<{
    url: string;
    method?: string;
    data?: unknown;
    params?: Record<string, unknown>;
  }> =>
  async ({ url, method = "GET", data, params }) => {
    try {
      const result = await apiClient({ url, method, data, params });
      return { data: result.data };
    } catch (err: unknown) {
      const error = err as {
        response?: { status: number; data: unknown };
      };
      return {
        error: {
          status: error.response?.status,
          data: error.response?.data,
        },
      };
    }
  };

// ---- API slice ----

export const api = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    "User",
    "Budget",
    "Category",
    "Transaction",
    "Stats",
    "ApiKeys",
    "Providers",
  ],

  endpoints: (builder) => ({
    // ===================== Queries =====================

    getUser: builder.query<unknown, void>({
      query: () => ({ url: "/users/me" }),
      providesTags: ["User"],
    }),

    getApiKeys: builder.query<unknown, void>({
      query: () => ({ url: "/users/me/api-keys" }),
      providesTags: ["ApiKeys"],
    }),

    getSupportedCurrencies: builder.query<unknown, void>({
      query: () => ({ url: "/exchange-rates/supported-currencies" }),
      keepUnusedDataFor: 86400,
    }),

    getStats: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/analytics/stats",
        params: { start_date, end_date },
      }),
      providesTags: ["Stats"],
    }),

    getSpending: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/analytics/spending",
        params: { start_date, end_date },
      }),
      providesTags: ["Stats"],
    }),

    getCategoryBreakdown: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/analytics/categories",
        params: { start_date, end_date },
      }),
      providesTags: ["Stats"],
    }),

    getCategoriesDetailed: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/analytics/categories/detailed",
        params: { start_date, end_date },
      }),
      providesTags: ["Stats"],
    }),

    getCategoryTrend: builder.query<
      unknown,
      { categoryId: string; start_date: string; end_date: string }
    >({
      query: ({ categoryId, start_date, end_date }) => ({
        url: `/analytics/categories/${categoryId}/trend`,
        params: { start_date, end_date },
      }),
      providesTags: ["Stats"],
    }),

    getMerchants: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/analytics/merchants",
        params: { start_date, end_date },
      }),
      providesTags: ["Stats"],
    }),

    getMonthlySummary: builder.query<unknown, void>({
      query: () => ({ url: "/analytics/monthly-summary" }),
      providesTags: ["Stats"],
    }),

    getBudgets: builder.query<unknown, void>({
      query: () => ({ url: "/budgets" }),
      providesTags: ["Budget"],
    }),

    getBudgetProgress: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/budgets/progress",
        params: { start_date, end_date },
      }),
      providesTags: ["Budget"],
    }),

    getBudgetAlerts: builder.query<unknown, void>({
      query: () => ({ url: "/budgets/alerts" }),
      providesTags: ["Budget"],
    }),

    getCategories: builder.query<unknown, void>({
      query: () => ({ url: "/categories" }),
      providesTags: ["Category"],
    }),

    getTransactions: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/transactions/with-duplicates",
        params: { start_date, end_date },
      }),
      providesTags: ["Transaction"],
    }),

    getRecentTransactions: builder.query<
      unknown,
      { start_date: string; end_date: string; limit?: number }
    >({
      query: ({ start_date, end_date, limit = 5 }) => ({
        url: "/transactions",
        params: { start_date, end_date, limit },
      }),
      providesTags: ["Transaction"],
    }),

    getSyncStatus: builder.query<unknown, void>({
      query: () => ({ url: "/sync/status" }),
    }),

    getSyncProgress: builder.query<unknown, void>({
      query: () => ({ url: "/sync/progress" }),
    }),

    getProviders: builder.query<unknown, void>({
      query: () => ({ url: "/sync/providers" }),
      providesTags: ["Providers"],
    }),

    testGmail: builder.query<
      unknown,
      { start_date: string; end_date: string }
    >({
      query: ({ start_date, end_date }) => ({
        url: "/sync/gmail/test",
        params: { start_date, end_date },
      }),
    }),

    // ===================== Mutations =====================

    updateUser: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({ url: "/users/me", method: "PATCH", data }),
      invalidatesTags: ["User"],
    }),

    updateApiKey: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({ url: "/users/me/api-keys", method: "PATCH", data }),
      invalidatesTags: ["ApiKeys", "Providers"],
    }),

    deleteApiKey: builder.mutation<unknown, string>({
      query: (provider) => ({
        url: `/users/me/api-keys/${provider}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ApiKeys", "Providers"],
    }),

    createTransaction: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({ url: "/transactions", method: "POST", data }),
      invalidatesTags: ["Transaction", "Stats"],
    }),

    bulkUpdateStatus: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({
        url: "/transactions/bulk-status",
        method: "PATCH",
        data,
      }),
      invalidatesTags: ["Transaction", "Stats", "Budget"],
    }),

    resolveDuplicate: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({
        url: "/transactions/resolve-duplicate",
        method: "PATCH",
        data,
      }),
      invalidatesTags: ["Transaction", "Stats"],
    }),

    dismissDuplicate: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({
        url: "/transactions/dismiss-duplicate",
        method: "PATCH",
        data,
      }),
      invalidatesTags: ["Transaction"],
    }),

    createBudget: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({ url: "/budgets", method: "POST", data }),
      invalidatesTags: ["Budget"],
    }),

    updateBudget: builder.mutation<
      unknown,
      { id: string; data: Record<string, unknown> }
    >({
      query: ({ id, data }) => ({
        url: `/budgets/${id}`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: ["Budget"],
    }),

    deleteBudget: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/budgets/${id}`, method: "DELETE" }),
      invalidatesTags: ["Budget"],
    }),

    createBudgetAlert: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({ url: "/budgets/alerts", method: "POST", data }),
      invalidatesTags: ["Budget"],
    }),

    createCategory: builder.mutation<unknown, Record<string, unknown>>({
      query: (data) => ({ url: "/categories", method: "POST", data }),
      invalidatesTags: ["Category", "Stats"],
    }),

    updateCategory: builder.mutation<
      unknown,
      { id: string; data: Record<string, unknown> }
    >({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: ["Category", "Stats"],
    }),

    deleteCategory: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/categories/${id}`, method: "DELETE" }),
      invalidatesTags: ["Category", "Stats"],
    }),

    startSync: builder.mutation<
      unknown,
      Record<string, unknown>
    >({
      query: (params) => ({
        url: "/sync/gmail",
        method: "POST",
        params,
      }),
      invalidatesTags: ["Transaction", "Stats"],
    }),

    cancelSync: builder.mutation<unknown, void>({
      query: () => ({ url: "/sync/cancel", method: "POST" }),
    }),
  }),
});

// ---- Auto-generated hooks ----

export const {
  // Queries
  useGetUserQuery,
  useGetApiKeysQuery,
  useGetSupportedCurrenciesQuery,
  useGetStatsQuery,
  useGetSpendingQuery,
  useGetCategoryBreakdownQuery,
  useGetCategoriesDetailedQuery,
  useGetCategoryTrendQuery,
  useGetMerchantsQuery,
  useGetMonthlySummaryQuery,
  useGetBudgetsQuery,
  useGetBudgetProgressQuery,
  useGetBudgetAlertsQuery,
  useGetCategoriesQuery,
  useGetTransactionsQuery,
  useGetRecentTransactionsQuery,
  useGetSyncStatusQuery,
  useGetSyncProgressQuery,
  useGetProvidersQuery,
  useTestGmailQuery,
  useLazyTestGmailQuery,
  // Mutations
  useUpdateUserMutation,
  useUpdateApiKeyMutation,
  useDeleteApiKeyMutation,
  useCreateTransactionMutation,
  useBulkUpdateStatusMutation,
  useResolveDuplicateMutation,
  useDismissDuplicateMutation,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  useCreateBudgetAlertMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useStartSyncMutation,
  useCancelSyncMutation,
} = api;
