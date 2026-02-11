"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  RotateCcw,
  Zap,
  Sparkles,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useDateRange } from "@/hooks/use-date-range";
import {
  useGetProvidersQuery,
  useStartSyncMutation,
  useCancelSyncMutation,
  api,
} from "@/store/api";
import { useAppDispatch } from "@/hooks/use-store";

interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface TestResult {
  success: boolean;
  count?: number;
  emails?: EmailPreview[];
  error?: string;
}

interface Provider {
  id: string;
  label: string;
  source?: "user" | "server";
}

interface SyncProgress {
  status: "idle" | "running" | "done" | "error";
  step?: string;
  model?: string;
  total_emails?: number;
  already_processed?: number;
  to_parse?: number;
  parsed?: number;
  saved?: number;
  deduped?: number;
  rejected?: number;
  errors?: number;
  current_email?: string;
  ai_dedup_groups?: number;
}

export function GmailSync() {
  const { dateRange } = useDateRange();
  const dispatch = useAppDispatch();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [selectedModel, setSelectedModel] = useState("groq");
  const [progress, setProgress] = useState<SyncProgress>({ status: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: providersData } = useGetProvidersQuery() as {
    data: Provider[] | undefined;
  };
  const providers: Provider[] =
    providersData && providersData.length > 0
      ? providersData
      : [{ id: "groq", label: "Groq (Free)" }];

  const [startSync] = useStartSyncMutation();
  const [cancelSyncMutation] = useCancelSyncMutation();

  useEffect(() => {
    if (progress.status !== "running") return;

    let pollFailures = 0;
    const MAX_POLL_FAILURES = 10;

    pollRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get("/sync/progress");
        pollFailures = 0;
        setProgress(res.data);
        if (res.data.status === "done" || res.data.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          refreshDashboard();
        }
      } catch {
        pollFailures++;
        if (pollFailures >= MAX_POLL_FAILURES) {
          if (pollRef.current) clearInterval(pollRef.current);
          setProgress({
            status: "error",
            step: "Lost connection to server. Please try again.",
          });
        }
      }
    }, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [progress.status]);

  const dateParams = {
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
  };

  const refreshDashboard = () => {
    dispatch(api.util.invalidateTags(["Transaction", "Stats", "Budget"]));
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.get("/sync/gmail/test", {
        params: dateParams,
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.response?.data?.detail || err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const triggerSync = async () => {
    setProgress({ status: "running", step: "Starting sync..." });
    setTestResult(null);
    try {
      await startSync({ ...dateParams, model: selectedModel });
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Sync failed";
      setProgress({ status: "error", step: detail });
    }
  };

  const cancelSync = async () => {
    try {
      await cancelSyncMutation();
    } catch {
      // ignore cancel errors
    }
  };

  const isSyncing = progress.status === "running";
  const isDone = progress.status === "done";
  const isError = progress.status === "error";

  const progressPercent =
    progress.to_parse && progress.to_parse > 0
      ? Math.round(((progress.parsed || 0) / progress.to_parse) * 100)
      : 0;

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800">
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
            <Mail className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
              Gmail Sync
            </h3>
            <p className="text-xs text-secondary-400">{dateRange.label}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Model selector */}
          <div className="flex rounded-lg border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedModel(p.id)}
                disabled={isSyncing}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selectedModel === p.id
                    ? p.id === "gemini"
                      ? "bg-blue-600 text-white"
                      : "bg-secondary-800 dark:bg-secondary-200 text-white dark:text-secondary-900"
                    : "bg-white dark:bg-secondary-800 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                } disabled:opacity-50`}
              >
                {p.id === "groq" ? (
                  <Zap className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {p.label}
                {p.source && (
                  <span
                    className={`ml-0.5 px-1 py-0.5 text-[10px] rounded ${
                      selectedModel === p.id
                        ? "bg-white/20 text-white/90"
                        : p.source === "user"
                          ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
                          : "bg-secondary-100 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
                    }`}
                  >
                    {p.source === "user" ? "Your Key" : "Server"}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={testConnection}
            disabled={testing || isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 disabled:opacity-50 transition-colors"
          >
            {testing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Test
          </button>
          {isSyncing ? (
            <button
              onClick={cancelSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          ) : (
            <button
              onClick={triggerSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98] transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Receipts
            </button>
          )}
        </div>
      </div>

      {/* Progress panel */}
      {(isSyncing || isDone || isError) && (
        <div className="mx-5 mb-5">
          <div
            className={`rounded-xl border ${
              isError
                ? "bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-900"
                : isDone
                  ? "bg-green-50 dark:bg-green-950 border-green-100 dark:border-green-900"
                  : "bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900"
            }`}
          >
            <div className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                {isSyncing && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                )}
                {isDone && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                )}
                {isError && (
                  <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    isError
                      ? "text-red-700 dark:text-red-300"
                      : isDone
                        ? "text-green-700 dark:text-green-300"
                        : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {progress.step}
                </span>
              </div>

              {isSyncing && progress.to_parse && progress.to_parse > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <span>
                      {progress.parsed || 0} / {progress.to_parse} emails
                    </span>
                    <span className="tabular-nums">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-900 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {isSyncing && progress.current_email && (
                <p className="text-xs text-blue-500 dark:text-blue-400 truncate">
                  {progress.current_email}
                </p>
              )}

              {(isDone || (isSyncing && (progress.saved || 0) > 0)) && (
                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                  {(progress.saved || 0) > 0 && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {progress.saved} saved
                    </span>
                  )}
                  {(progress.ai_dedup_groups || 0) > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {progress.ai_dedup_groups} duplicate group
                      {(progress.ai_dedup_groups || 0) > 1 ? "s" : ""} found
                    </span>
                  )}
                  {(progress.deduped || 0) > 0 &&
                    !(progress.ai_dedup_groups || 0) && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {progress.deduped} duplicates
                      </span>
                    )}
                  {(progress.rejected || 0) > 0 && (
                    <span className="text-secondary-500 dark:text-secondary-400">
                      {progress.rejected} non-receipts
                    </span>
                  )}
                  {(progress.already_processed || 0) > 0 && (
                    <span className="text-secondary-400">
                      {progress.already_processed} already synced
                    </span>
                  )}
                  {(progress.errors || 0) > 0 && (
                    <span className="text-red-500 dark:text-red-400">
                      {progress.errors} errors
                    </span>
                  )}
                </div>
              )}

              {isDone && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={refreshDashboard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Refresh Dashboard
                  </button>
                  <button
                    onClick={() => setProgress({ status: "idle" })}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 mb-3">
            {testResult.success ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  Connected — Found {testResult.count} emails in{" "}
                  {dateRange.label}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-700 dark:text-red-400">
                  Error: {testResult.error}
                </span>
              </>
            )}
          </div>

          {testResult.emails && testResult.emails.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {testResult.emails.map((email) => (
                <div
                  key={email.id}
                  className="p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700"
                >
                  <p className="text-xs font-medium text-secondary-900 dark:text-secondary-100 truncate">
                    {email.subject}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                    From: {email.from}
                  </p>
                  <p className="text-xs text-secondary-400 mt-0.5">
                    {email.date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!testResult && progress.status === "idle" && (
        <div className="px-5 pb-5">
          <p className="text-xs text-secondary-500 dark:text-secondary-400 leading-relaxed">
            Select an AI model and click &quot;Sync Receipts&quot; to parse
            emails for <strong>{dateRange.label}</strong>.{" "}
            {selectedModel === "groq" ? (
              <span className="text-secondary-400">
                Groq is free but slower (rate limited). Switch to Gemini for
                faster, more accurate parsing.
              </span>
            ) : (
              <span className="text-blue-500 dark:text-blue-400">
                Gemini is faster and more accurate (paid API).
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
