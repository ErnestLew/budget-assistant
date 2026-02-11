"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  User,
  Mail,
  Calendar,
  CheckCircle,
  Download,
  RefreshCw,
  Pencil,
  X,
  Check,
  Zap,
  Globe,
  Key,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useCurrency } from "@/hooks/use-currency";
import {
  useGetUserQuery,
  useUpdateUserMutation,
  useGetApiKeysQuery,
  useUpdateApiKeyMutation,
  useDeleteApiKeyMutation,
} from "@/store/api";

// --- Types ---

interface UserProfile {
  id: string;
  email: string;
  name: string;
  image: string | null;
  is_active: boolean;
  preferred_currency: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Page ---

export default function SettingsPage() {
  const { data: userData, isLoading } = useGetUserQuery();
  const user = userData as UserProfile | undefined;
  const [updateUser] = useUpdateUserMutation();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-48 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">Settings</h1>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      {user && <ProfileSection user={user} onUpdateName={(name) => updateUser({ name })} />}

      {/* Display Currency */}
      <CurrencySection />

      {/* AI Providers */}
      <AIProvidersSection />

      {/* Connected Accounts */}
      {user && <ConnectedAccounts user={user} />}

      {/* Data Management */}
      <DataManagement />

      {/* About */}
      <AboutSection />
    </div>
  );
}

// --- Profile Section ---

function ProfileSection({
  user,
  onUpdateName,
}: {
  user: UserProfile;
  onUpdateName: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== user.name) {
      onUpdateName(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-6">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
        Profile
      </h3>
      <div className="flex items-start gap-5">
        {/* Avatar */}
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center">
            <User className="h-8 w-8 text-primary-600" />
          </div>
        )}

        <div className="flex-1 space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wide">
              Name
            </label>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setIsEditing(false);
                  }}
                />
                <button
                  onClick={handleSave}
                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(user.name);
                  }}
                  className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                  {user.name}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wide">
              Email
            </label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-secondary-400" />
              <p className="text-sm text-secondary-700 dark:text-secondary-300">{user.email}</p>
            </div>
          </div>

          {/* Member since */}
          <div>
            <label className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wide">
              Member Since
            </label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-secondary-400" />
              <p className="text-sm text-secondary-700 dark:text-secondary-300">
                {format(new Date(user.created_at), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Currency Section ---

function CurrencySection() {
  const { currency, setCurrency, isUpdating, supportedCurrencies } = useCurrency();

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-6">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
        Display Currency
      </h3>
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50 dark:bg-secondary-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950 border border-primary-100 dark:border-primary-800 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
              Preferred Currency
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              All analytics and totals will be converted to this currency
            </p>
          </div>
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          disabled={isUpdating}
          className="px-3 py-1.5 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:opacity-50 bg-white dark:bg-secondary-800 dark:text-secondary-100"
        >
          {supportedCurrencies.length > 0 ? (
            supportedCurrencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))
          ) : (
            <option value={currency}>{currency}</option>
          )}
        </select>
      </div>
    </div>
  );
}

// --- AI Providers Section ---

interface ApiKeyStatus {
  groq: { configured: boolean; masked_key: string | null };
  gemini: { configured: boolean; masked_key: string | null };
}

function AIProvidersSection() {
  const [groqInput, setGroqInput] = useState("");
  const [geminiInput, setGeminiInput] = useState("");
  const [showGroqInput, setShowGroqInput] = useState(false);
  const [showGeminiInput, setShowGeminiInput] = useState(false);
  const [groqVisible, setGroqVisible] = useState(false);
  const [geminiVisible, setGeminiVisible] = useState(false);

  const { data: keyStatusData, isLoading } = useGetApiKeysQuery();
  const keyStatus = keyStatusData as ApiKeyStatus | undefined;

  const [saveApiKey, { isLoading: isSaving }] = useUpdateApiKeyMutation();
  const [deleteApiKey, { isLoading: isDeleting }] = useDeleteApiKeyMutation();

  const handleSave = async (provider: string, apiKey: string) => {
    await saveApiKey({ provider, api_key: apiKey });
    setShowGroqInput(false);
    setShowGeminiInput(false);
    setGroqInput("");
    setGeminiInput("");
  };

  const providers = [
    {
      id: "groq" as const,
      label: "Groq",
      icon: Zap,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      borderColor: "border-orange-100 dark:border-orange-800",
      description: "Free tier with rate limits. Uses Llama models.",
      inputValue: groqInput,
      setInput: setGroqInput,
      showInput: showGroqInput,
      setShowInput: setShowGroqInput,
      visible: groqVisible,
      setVisible: setGroqVisible,
    },
    {
      id: "gemini" as const,
      label: "Gemini",
      icon: Sparkles,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      borderColor: "border-blue-100 dark:border-blue-800",
      description: "Fast and accurate. Requires a Google AI API key.",
      inputValue: geminiInput,
      setInput: setGeminiInput,
      showInput: showGeminiInput,
      setShowInput: setShowGeminiInput,
      visible: geminiVisible,
      setVisible: setGeminiVisible,
    },
  ];

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100">
          AI Providers
        </h3>
        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
          Add your own API keys for AI-powered receipt parsing. Keys are encrypted at rest.
        </p>
      </div>

      <div className="space-y-3">
        {providers.map((p) => {
          const status = keyStatus?.[p.id];
          const configured = status?.configured ?? false;
          const maskedKey = status?.masked_key;
          const Icon = p.icon;

          return (
            <div
              key={p.id}
              className="p-4 rounded-lg bg-secondary-50 dark:bg-secondary-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${p.bgColor} border ${p.borderColor} flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${p.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        {p.label}
                      </p>
                      {configured && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Configured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      {p.description}
                    </p>
                    {configured && maskedKey && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Key className="h-3 w-3 text-secondary-400" />
                        <code className="text-xs text-secondary-500 dark:text-secondary-400 font-mono">
                          {p.visible ? maskedKey : "••••••••••••"}
                        </code>
                        <button
                          onClick={() => p.setVisible(!p.visible)}
                          className="p-0.5 rounded text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
                        >
                          {p.visible ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {configured && (
                    <button
                      onClick={() => deleteApiKey(p.id)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                      title="Remove API key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => p.setShowInput(!p.showInput)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-secondary-300 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-white dark:hover:bg-secondary-900 transition-colors"
                  >
                    <Key className="h-3.5 w-3.5" />
                    {configured ? "Update Key" : "Add Key"}
                  </button>
                </div>
              </div>

              {/* Input for adding/updating key */}
              {p.showInput && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="password"
                    value={p.inputValue}
                    onChange={(e) => p.setInput(e.target.value)}
                    placeholder={`Enter ${p.label} API key...`}
                    className="flex-1 px-3 py-1.5 border border-secondary-300 dark:border-secondary-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-secondary-800 dark:text-secondary-100 font-mono"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && p.inputValue.trim().length >= 10) {
                        handleSave(p.id, p.inputValue.trim());
                      }
                      if (e.key === "Escape") {
                        p.setShowInput(false);
                        p.setInput("");
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSave(p.id, p.inputValue.trim())}
                    disabled={
                      isSaving || p.inputValue.trim().length < 10
                    }
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      p.setShowInput(false);
                      p.setInput("");
                    }}
                    className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Connected Accounts ---

function ConnectedAccounts({ user }: { user: UserProfile }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiClient.post("/sync/trigger");
    } catch {
      console.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-6">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
        Connected Accounts
      </h3>
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50 dark:bg-secondary-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 flex items-center justify-center">
            <Mail className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">Gmail</p>
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="h-3 w-3" />
                Connected
              </span>
            </div>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">{user.email}</p>
            {user.last_sync_at && (
              <p className="text-xs text-secondary-400 mt-0.5">
                Last synced{" "}
                {formatDistanceToNow(new Date(user.last_sync_at), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-white dark:hover:bg-secondary-900 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    </div>
  );
}

// --- Data Management ---

function DataManagement() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get("/transactions", {
        params: { limit: 10000 },
      });
      const transactions = res.data;

      if (!transactions || transactions.length === 0) {
        alert("No transactions to export.");
        return;
      }

      // Build CSV
      const headers = [
        "Date",
        "Merchant",
        "Amount",
        "Currency",
        "Category",
        "Status",
      ];
      const rows = transactions.map((tx: Record<string, unknown>) => [
        tx.date || "",
        `"${(tx.merchant as string || "").replace(/"/g, '""')}"`,
        tx.amount || 0,
        tx.currency || "USD",
        `"${(tx.category_name as string || "Uncategorized").replace(/"/g, '""')}"`,
        tx.status || "",
      ]);

      const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join(
        "\n"
      );

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-6">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
        Data Management
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50 dark:bg-secondary-800">
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
              Export Transactions
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              Download all your transactions as a CSV file
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-white dark:hover:bg-secondary-900 transition-colors disabled:opacity-50"
          >
            <Download className={`h-4 w-4 ${exporting ? "animate-bounce" : ""}`} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- About Section ---

function AboutSection() {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-100 dark:border-secondary-800 p-6">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">About</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary-600" />
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
              Budget Assistant
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-xs text-secondary-500 dark:text-secondary-400 leading-relaxed">
          Smart budget tracking powered by AI. Automatically parses receipt
          emails from Gmail, categorizes transactions, and provides spending
          insights.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400">
            TypeScript
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400">
            Microservices
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400">
            AI-Powered
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400">
            PostgreSQL
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400">
            Redis
          </span>
        </div>
      </div>
    </div>
  );
}
