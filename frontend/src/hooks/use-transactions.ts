"use client";

import {
  useGetTransactionsQuery,
  useBulkUpdateStatusMutation,
  useResolveDuplicateMutation,
  useDismissDuplicateMutation,
} from "@/store/api";
import { useAppSelector } from "@/hooks/use-store";
import { selectDateParams } from "@/store/slices/dateRangeSlice";

export type Status = "pending" | "processed" | "verified" | "rejected" | "failed";

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  status: Status;
  confidence: number;
  email_id: string | null;
  email_subject: string | null;
  duplicate_group_id: string | null;
  is_primary: boolean;
  category_name: string | null;
  category_color: string | null;
  created_at: string;
}

export interface DuplicateGroup {
  group_id: string;
  reason: string;
  primary_id: string;
  transactions: Transaction[];
}

export interface TransactionsWithDuplicates {
  transactions: Transaction[];
  duplicate_groups: DuplicateGroup[];
}

export function useTransactionsQuery() {
  const dateParams = useAppSelector(selectDateParams);
  return useGetTransactionsQuery(dateParams) as ReturnType<typeof useGetTransactionsQuery> & {
    data: TransactionsWithDuplicates | undefined;
  };
}

export function useTransactionMutations() {
  const [bulkUpdate, bulkResult] = useBulkUpdateStatusMutation();
  const [resolve, resolveResult] = useResolveDuplicateMutation();
  const [dismiss, dismissResult] = useDismissDuplicateMutation();

  const bulkMutation = {
    mutate: (payload: { transaction_ids: string[]; status: Status }) =>
      bulkUpdate(payload),
    isPending: bulkResult.isLoading,
  };

  const resolveMutation = {
    mutate: (payload: { group_id: string; keep_id: string }) =>
      resolve(payload),
    isPending: resolveResult.isLoading,
  };

  const dismissMutation = {
    mutate: (payload: { group_id: string }) => dismiss(payload),
    isPending: dismissResult.isLoading,
  };

  const updateStatus = (ids: string[], status: Status) => {
    bulkUpdate({ transaction_ids: ids, status });
  };

  const anyMutating =
    bulkResult.isLoading || resolveResult.isLoading || dismissResult.isLoading;

  return {
    bulkMutation,
    resolveMutation,
    dismissMutation,
    updateStatus,
    anyMutating,
  };
}
