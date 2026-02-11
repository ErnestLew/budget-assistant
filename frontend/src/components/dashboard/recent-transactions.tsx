"use client";

import { format } from "date-fns";
import { ArrowUpRight, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useDateRange } from "@/hooks/use-date-range";
import { useGetRecentTransactionsQuery, useBulkUpdateStatusMutation } from "@/store/api";

type Status = "pending" | "processed" | "verified" | "rejected" | "failed";

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  category_name: string | null;
  category_color: string | null;
  date: string;
  status: Status;
}

const statusDot: Record<Status, string> = {
  pending: "bg-yellow-400",
  processed: "bg-blue-400",
  verified: "bg-green-400",
  rejected: "bg-red-400",
  failed: "bg-secondary-400",
};

export function RecentTransactions() {
  const { dateRange } = useDateRange();
  const [bulkUpdate] = useBulkUpdateStatusMutation();
  const { data, isLoading, isError, refetch } = useGetRecentTransactionsQuery({
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
    limit: 5,
  });

  const response = data as { transactions?: Transaction[] } | Transaction[] | undefined;
  const transactions = Array.isArray(response) ? response : response?.transactions || [];

  if (isError) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-red-100 dark:border-red-900">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load transactions</p>
        <button onClick={() => refetch()} className="text-xs text-red-500 underline mt-1">Retry</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 animate-pulse">
        <div className="p-6 pb-4">
          <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
        </div>
        <div className="px-6 pb-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-secondary-50 dark:bg-secondary-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800">
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100">
            Recent Transactions
          </h3>
          <p className="text-xs text-secondary-400 mt-0.5">
            Latest {transactions.length} transactions
          </p>
        </div>
        <Link
          href="/dashboard/transactions"
          className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-0.5 transition-colors"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-secondary-50 dark:divide-secondary-800">
        {transactions.map((transaction) => {
          const isRejected = transaction.status === "rejected";
          return (
            <div
              key={transaction.id}
              className={`group px-6 py-3.5 flex items-center justify-between hover:bg-secondary-50/50 dark:hover:bg-secondary-800/50 transition-colors ${
                isRejected ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    statusDot[transaction.status] || statusDot.pending
                  }`}
                  title={transaction.status}
                />
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate ${
                      isRejected ? "line-through" : ""
                    }`}
                  >
                    {transaction.merchant}
                  </p>
                  <p className="text-xs text-secondary-400">
                    {format(new Date(transaction.date), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {transaction.status !== "verified" && (
                    <button
                      onClick={() =>
                        bulkUpdate({ transaction_ids: [transaction.id], status: "verified" })
                      }
                      className="p-1 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {transaction.status !== "rejected" && (
                    <button
                      onClick={() =>
                        bulkUpdate({ transaction_ids: [transaction.id], status: "rejected" })
                      }
                      className="p-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {transaction.category_name && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${transaction.category_color || "#6B7280"}15`,
                      color: transaction.category_color || "#6B7280",
                    }}
                  >
                    {transaction.category_name}
                  </span>
                )}
                <span
                  className={`text-sm font-semibold text-secondary-900 dark:text-secondary-100 w-24 text-right tabular-nums ${
                    isRejected ? "line-through" : ""
                  }`}
                >
                  {transaction.currency || "MYR"}{" "}
                  {Number(transaction.amount).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
        {transactions.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-secondary-400">
              No transactions yet. Connect your Gmail to start tracking!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
