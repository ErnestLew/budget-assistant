"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Plus,
  DollarSign,
  TrendingDown,
  Wallet,
  Target,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useDateRange } from "@/hooks/use-date-range";
import { useCurrency } from "@/hooks/use-currency";
import { DateSelector } from "@/components/dashboard/date-selector";
import {
  useBudgets,
  useBudgetProgress,
  useBudgetAlerts,
  useCategories,
  useDeleteBudget,
  type BudgetItem,
} from "@/hooks/use-budgets";
import { BudgetCard } from "@/components/dashboard/budgets/budget-card";
import { BudgetFormModal } from "@/components/dashboard/budgets/budget-form";

// --- Page wrapper ---

export default function BudgetsPage() {
  return <BudgetsContent />;
}

// --- Main content ---

function BudgetsContent() {
  const { dateRange } = useDateRange();
  const { formatAmount } = useCurrency();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);

  const { data: budgets, isLoading } = useBudgets();
  const { data: progress } = useBudgetProgress(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: alerts } = useBudgetAlerts();
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteBudget();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Compute overview
  const totalBudget = (budgets || [])
    .filter((b) => b.is_active)
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = (progress || []).reduce(
    (sum, p) => sum + Number(p.spent),
    0
  );
  const remaining = totalBudget - totalSpent;
  const activeCount = (budgets || []).filter((b) => b.is_active).length;

  // Chart data: merge budget + progress
  const chartData = (progress || []).map((p) => ({
    name: p.category,
    budget: Number(p.limit),
    spent: Number(p.spent),
  }));

  // Build alert map: budget_id -> alert
  const alertMap = new Map(
    (alerts || []).map((a) => [a.budget_id, a])
  );

  // Build progress map: budget name -> progress
  const progressMap = new Map(
    (progress || []).map((p) => [p.category, p])
  );

  const handleEdit = (budget: BudgetItem) => {
    setEditingBudget(budget);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBudget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">Budgets</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
            Manage budgets and track spending limits
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Budget
        </button>
      </div>

      <DateSelector />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title="Total Budget"
          value={formatAmount(totalBudget)}
          icon={Wallet}
          iconBg="bg-blue-50 dark:bg-blue-950"
          iconColor="text-blue-500"
        />
        <OverviewCard
          title="Total Spent"
          value={formatAmount(totalSpent)}
          icon={DollarSign}
          iconBg="bg-orange-50 dark:bg-orange-950"
          iconColor="text-orange-500"
        />
        <OverviewCard
          title="Remaining"
          value={formatAmount(Math.abs(remaining))}
          icon={TrendingDown}
          iconBg={remaining >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}
          iconColor={remaining >= 0 ? "text-green-500" : "text-red-500"}
          subtitle={remaining < 0 ? "Over budget!" : "Left to spend"}
        />
        <OverviewCard
          title="Active Budgets"
          value={activeCount.toString()}
          icon={Target}
          iconBg="bg-purple-50 dark:bg-purple-950"
          iconColor="text-purple-500"
        />
      </div>

      {/* Budget vs Actual Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            Budget vs Actual
          </h3>
          <div style={{ height: Math.max(200, chartData.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ left: 10, right: 20 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatAmount(Number(value)),
                    name === "budget" ? "Budget" : "Spent",
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#fff",
                    border: isDark ? "1px solid #334155" : "none",
                    boxShadow: "0 4px 20px rgb(0 0 0 / 0.08)",
                    padding: "8px 12px",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="budget" fill="#93c5fd" name="Budget" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" fill="#22c55e" name="Spent" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Budget Cards */}
      {(budgets && budgets.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              progress={progressMap.get(budget.name)}
              alert={alertMap.get(budget.id)}
              formatAmount={formatAmount}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-secondary-900 rounded-2xl p-12 border border-secondary-100 dark:border-secondary-800 text-center">
          <Wallet className="h-12 w-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-1">
            No budgets yet
          </h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
            Create a budget to start tracking your spending limits.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Budget
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <BudgetFormModal
          budget={editingBudget}
          categories={categories || []}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// --- Overview Card ---

function OverviewCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl p-5 border border-secondary-100 dark:border-secondary-800 hover:border-secondary-200 dark:hover:border-secondary-700 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">{title}</p>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">{value}</p>
      {subtitle && (
        <p className="mt-1.5 text-xs text-secondary-400">{subtitle}</p>
      )}
    </div>
  );
}
