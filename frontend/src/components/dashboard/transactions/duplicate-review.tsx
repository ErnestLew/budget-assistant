"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  Loader2,
  Copy,
  Ban,
} from "lucide-react";
import type { DuplicateGroup } from "@/hooks/use-transactions";

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  onResolve: (groupId: string, keepId: string) => void;
  onDismiss: (groupId: string) => void;
  isLoading: boolean;
}

export function DuplicateGroupCard({
  group,
  onResolve,
  onDismiss,
  isLoading,
}: DuplicateGroupCardProps) {
  const [selectedId, setSelectedId] = useState(group.primary_id);

  return (
    <div className="rounded-xl border-l-4 border-l-amber-400 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/50 overflow-hidden">
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Possible Duplicate
              </span>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{group.reason}</p>
            </div>
          </div>
          <span className="text-xs text-amber-500 dark:text-amber-400 bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded-full font-medium">
            {group.transactions.length} entries
          </span>
        </div>

        {/* Transaction options */}
        <div className="space-y-2">
          {group.transactions.map((tx) => (
            <label
              key={tx.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedId === tx.id
                  ? "border-amber-400 bg-white dark:bg-secondary-900 shadow-sm"
                  : "border-transparent bg-amber-50 dark:bg-amber-950/50 hover:bg-white dark:hover:bg-secondary-900"
              }`}
            >
              <input
                type="radio"
                name={`dup-${group.group_id}`}
                checked={selectedId === tx.id}
                onChange={() => setSelectedId(tx.id)}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-secondary-900 dark:text-secondary-100 text-sm">
                    {tx.merchant}
                  </span>
                  {tx.id === group.primary_id && (
                    <span className="text-[10px] font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded">
                      AI pick
                    </span>
                  )}
                </div>
                <p className="text-xs text-secondary-500 truncate mt-0.5">
                  {tx.email_subject || "No email subject"}
                </p>
                <p className="text-xs text-secondary-400 mt-0.5">
                  {format(new Date(tx.date), "MMM d, yyyy")} &middot;{" "}
                  {Math.round(tx.confidence * 100)}% confidence
                </p>
              </div>
              <span className="font-semibold text-secondary-900 dark:text-secondary-100 text-sm whitespace-nowrap">
                {tx.currency} {Number(tx.amount).toFixed(2)}
              </span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onResolve(group.group_id, selectedId)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            {selectedId === group.primary_id
              ? "Confirm AI Choice"
              : "Keep Selected"}
          </button>
          <button
            onClick={() => onDismiss(group.group_id)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 disabled:opacity-50 transition-colors"
          >
            <Ban className="h-3.5 w-3.5" />
            Not Duplicates
          </button>
        </div>
      </div>
    </div>
  );
}
