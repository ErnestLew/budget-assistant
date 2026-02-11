"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  CheckCheck,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { DateSelector } from "@/components/dashboard/date-selector";
import { DuplicateGroupCard } from "@/components/dashboard/transactions/duplicate-review";
import { TransactionTable } from "@/components/dashboard/transactions/transaction-table";
import type { SortKey, SortDir } from "@/components/dashboard/transactions/transaction-table";
import {
  useTransactionsQuery,
  useTransactionMutations,
} from "@/hooks/use-transactions";

type FilterTab = "all" | "pending" | "duplicates" | "verified" | "rejected";

function TransactionsContent() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "amount" ? "desc" : "asc");
    }
  };

  const { data, isLoading } = useTransactionsQuery();
  const {
    bulkMutation,
    resolveMutation,
    dismissMutation,
    updateStatus,
    anyMutating,
  } = useTransactionMutations();

  const transactions = data?.transactions || [];
  const duplicateGroups = data?.duplicate_groups || [];

  // Filter out non-primary duplicates from the main table (they appear in group cards)
  const dupTxIds = new Set(
    duplicateGroups.flatMap((g) => g.transactions.map((t) => t.id))
  );
  const mainTransactions = transactions.filter((t) => !dupTxIds.has(t.id));

  const sorted = [...mainTransactions].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case "merchant":
        cmp = a.merchant.localeCompare(b.merchant);
        break;
      case "amount":
        cmp = Number(a.amount) - Number(b.amount);
        break;
      case "confidence":
        cmp = a.confidence - b.confidence;
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const filtered = (() => {
    if (activeTab === "duplicates") return []; // show only group cards
    if (activeTab === "all") return sorted;
    return sorted.filter((t) => t.status === activeTab);
  })();

  // Non-duplicate pending transactions (safe to bulk approve)
  const pendingIds = mainTransactions
    .filter(
      (t) =>
        (t.status === "pending" || t.status === "processed") &&
        !t.duplicate_group_id
    )
    .map((t) => t.id);

  const counts = {
    all: transactions.length,
    pending: transactions.filter((t) => t.status === "pending").length,
    duplicates: duplicateGroups.length,
    verified: transactions.filter((t) => t.status === "verified").length,
    rejected: transactions.filter((t) => t.status === "rejected").length,
  };

  // Summary stats
  const pendingTotal = mainTransactions
    .filter(
      (t) => t.status === "pending" || t.status === "processed"
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const currency = transactions[0]?.currency || "USD";

  const lowConfidence = mainTransactions.filter(
    (t) =>
      t.confidence < 0.7 &&
      t.status !== "verified" &&
      t.status !== "rejected"
  );

  const tabs: { key: FilterTab; label: string; badge?: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    {
      key: "duplicates",
      label: "Duplicates",
      badge: counts.duplicates > 0 ? String(counts.duplicates) : undefined,
    },
    { key: "verified", label: "Verified" },
    { key: "rejected", label: "Rejected" },
  ];

  const emptyMessage =
    activeTab === "all"
      ? "No transactions for this period. Sync your Gmail to find receipts."
      : `No ${activeTab} transactions.`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors text-secondary-600 dark:text-secondary-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">
              Transactions
            </h1>
            <p className="text-sm text-secondary-500 mt-0.5">
              Review and verify AI-parsed transactions
            </p>
          </div>
        </div>

        {pendingIds.length > 0 && (
          <button
            onClick={() => updateStatus(pendingIds, "verified")}
            disabled={anyMutating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {bulkMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Approve All ({pendingIds.length})
          </button>
        )}
      </div>

      <DateSelector />

      {/* Summary bar */}
      {!isLoading && transactions.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-secondary-50 dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-secondary-500">Pending:</span>
            <span className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
              {currency} {pendingTotal.toFixed(2)}
            </span>
          </div>
          <div className="w-px h-4 bg-secondary-200 dark:bg-secondary-700" />
          <span className="text-sm text-secondary-500">
            {transactions.length} transactions
          </span>
          {duplicateGroups.length > 0 && (
            <>
              <div className="w-px h-4 bg-secondary-200 dark:bg-secondary-700" />
              <button
                onClick={() => setActiveTab("duplicates")}
                className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors"
              >
                <Copy className="h-3 w-3" />
                {duplicateGroups.length} duplicate
                {duplicateGroups.length > 1 ? "s" : ""}
              </button>
            </>
          )}
          {lowConfidence.length > 0 && (
            <>
              <div className="w-px h-4 bg-secondary-200 dark:bg-secondary-700" />
              <span className="inline-flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {lowConfidence.length} low confidence
              </span>
            </>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 shadow-sm"
                : "text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 text-xs ${
                tab.badge
                  ? "bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium"
                  : "text-secondary-400"
              }`}
            >
              {tab.badge || counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 animate-pulse">
          <div className="p-6 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-secondary-100 dark:bg-secondary-800 rounded" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Needs Attention: Duplicate groups */}
          {(activeTab === "all" ||
            activeTab === "pending" ||
            activeTab === "duplicates") &&
            duplicateGroups.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Needs Attention
                </h2>
                {duplicateGroups.map((group) => (
                  <DuplicateGroupCard
                    key={group.group_id}
                    group={group}
                    onResolve={(groupId, keepId) =>
                      resolveMutation.mutate({ group_id: groupId, keep_id: keepId })
                    }
                    onDismiss={(groupId) =>
                      dismissMutation.mutate({ group_id: groupId })
                    }
                    isLoading={
                      resolveMutation.isPending || dismissMutation.isPending
                    }
                  />
                ))}
              </div>
            )}

          {/* Low confidence warnings (in all/pending tab) */}
          {(activeTab === "all" || activeTab === "pending") &&
            lowConfidence.length > 0 && (
              <div className="space-y-2">
                {lowConfidence.map((tx) => (
                  <div
                    key={`low-${tx.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border-l-4 border-l-red-400 border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                          {tx.merchant} &mdash; {tx.currency}{" "}
                          {Number(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Low confidence: {Math.round(tx.confidence * 100)}%
                          &mdash; please verify
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateStatus([tx.id], "verified")}
                        disabled={anyMutating}
                        className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateStatus([tx.id], "rejected")}
                        disabled={anyMutating}
                        className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Transaction table (skip on duplicates-only tab) */}
          {activeTab !== "duplicates" && (
            <TransactionTable
              transactions={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              onUpdateStatus={updateStatus}
              anyMutating={anyMutating}
              emptyMessage={emptyMessage}
            />
          )}

          {/* Duplicates tab with no groups */}
          {activeTab === "duplicates" && duplicateGroups.length === 0 && (
            <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-12 text-center text-secondary-500">
              No duplicate groups detected. All clear!
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return <TransactionsContent />;
}
