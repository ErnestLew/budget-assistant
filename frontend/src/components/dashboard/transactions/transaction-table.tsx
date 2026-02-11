"use client";

import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Transaction, Status } from "@/hooks/use-transactions";

export type SortKey = "date" | "merchant" | "amount" | "confidence" | "status";
export type SortDir = "asc" | "desc";

const statusConfig: Record<
  Status,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-yellow-50 dark:bg-yellow-950",
    text: "text-yellow-700 dark:text-yellow-400",
    dot: "bg-yellow-400",
  },
  processed: {
    label: "Processed",
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-400",
  },
  verified: {
    label: "Verified",
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-400",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-400",
  },
  failed: {
    label: "Failed",
    bg: "bg-secondary-50 dark:bg-secondary-800",
    text: "text-secondary-700 dark:text-secondary-300",
    dot: "bg-secondary-400",
  },
};

function SortHeader({
  label,
  sortKey: colKey,
  activeSortKey,
  sortDir,
  onSort,
  className = "",
  sublabel,
  activeSublabel,
  onSortSub,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  sublabel?: string;
  activeSublabel?: boolean;
  onSortSub?: () => void;
}) {
  const isActive = activeSortKey === colKey;
  const Icon = isActive
    ? sortDir === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => onSort(colKey)}
        className={`inline-flex items-center gap-0.5 hover:text-secondary-900 dark:hover:text-secondary-100 transition-colors ${
          isActive ? "text-secondary-900 dark:text-secondary-100" : ""
        }`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
      {sublabel && onSortSub && (
        <button
          onClick={onSortSub}
          className={`text-[10px] px-1 rounded hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors ${
            activeSublabel ? "text-secondary-900 dark:text-secondary-100 font-bold" : "text-secondary-400"
          }`}
          title={`Sort by ${sublabel}`}
        >
          A-Z
        </button>
      )}
    </div>
  );
}

interface TransactionTableProps {
  transactions: Transaction[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onUpdateStatus: (ids: string[], status: Status) => void;
  anyMutating: boolean;
  emptyMessage: string;
}

export function TransactionTable({
  transactions,
  sortKey,
  sortDir,
  onSort,
  onUpdateStatus,
  anyMutating,
  emptyMessage,
}: TransactionTableProps) {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 overflow-hidden">
      {/* Table header -- sortable */}
      <div className="grid grid-cols-[1fr_110px_100px_80px_100px_90px] gap-4 px-4 py-3 bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-800 text-xs font-medium text-secondary-500 uppercase tracking-wider">
        <SortHeader
          label="Transaction"
          sortKey="date"
          activeSortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          sublabel="merchant"
          activeSublabel={sortKey === "merchant"}
          onSortSub={() => onSort("merchant")}
        />
        <span>Category</span>
        <SortHeader
          label="Amount"
          sortKey="amount"
          activeSortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          className="justify-end"
        />
        <SortHeader
          label="Confidence"
          sortKey="confidence"
          activeSortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          className="justify-center"
        />
        <SortHeader
          label="Status"
          sortKey="status"
          activeSortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          className="justify-center"
        />
        <span className="text-center">Actions</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
        {transactions.map((tx) => {
          const sc = statusConfig[tx.status] || statusConfig.pending;
          const isRejected = tx.status === "rejected";

          return (
            <div
              key={tx.id}
              className={`grid grid-cols-[1fr_110px_100px_80px_100px_90px] gap-4 px-4 py-3 items-center hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors ${
                isRejected ? "opacity-50" : ""
              }`}
            >
              {/* Merchant + date */}
              <div className="min-w-0">
                <p
                  className={`font-medium text-secondary-900 dark:text-secondary-100 truncate ${
                    isRejected ? "line-through" : ""
                  }`}
                >
                  {tx.merchant}
                </p>
                <p className="text-xs text-secondary-500 truncate">
                  {format(new Date(tx.date), "MMM d, yyyy")}
                  {tx.description && ` - ${tx.description}`}
                </p>
              </div>

              {/* Category */}
              <div>
                {tx.category_name ? (
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full"
                    style={{
                      backgroundColor: `${tx.category_color || "#6B7280"}20`,
                      color: tx.category_color || "#6B7280",
                    }}
                  >
                    {tx.category_name}
                  </span>
                ) : (
                  <span className="text-xs text-secondary-400">--</span>
                )}
              </div>

              {/* Amount */}
              <span
                className={`text-right font-semibold text-secondary-900 dark:text-secondary-100 ${
                  isRejected ? "line-through" : ""
                }`}
              >
                {tx.currency} {Number(tx.amount).toFixed(2)}
              </span>

              {/* Confidence */}
              <div className="flex justify-center">
                <span
                  className={`text-xs font-medium ${
                    tx.confidence >= 0.9
                      ? "text-green-600"
                      : tx.confidence >= 0.7
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(tx.confidence * 100)}%
                </span>
              </div>

              {/* Status badge */}
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                  />
                  {sc.label}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-1">
                {tx.status !== "verified" && (
                  <button
                    onClick={() => onUpdateStatus([tx.id], "verified")}
                    disabled={anyMutating}
                    className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                    title="Approve"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                {tx.status !== "rejected" && (
                  <button
                    onClick={() => onUpdateStatus([tx.id], "rejected")}
                    disabled={anyMutating}
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    title="Reject"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {transactions.length === 0 && (
          <div className="p-12 text-center text-secondary-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
