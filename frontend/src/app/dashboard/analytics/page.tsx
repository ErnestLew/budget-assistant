"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  CalendarDays,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useDateRange } from "@/hooks/use-date-range";
import { useCurrency } from "@/hooks/use-currency";
import { DateSelector } from "@/components/dashboard/date-selector";
import {
  useGetStatsQuery,
  useGetSpendingQuery,
  useGetCategoriesDetailedQuery,
  useGetMerchantsQuery,
  useGetMonthlySummaryQuery,
} from "@/store/api";

// --- Types ---

interface Stats {
  total_spent: number;
  monthly_budget: number;
  transaction_count: number;
  savings_rate: number;
  trend_percentage: number;
}

interface SpendingData {
  date: string;
  amount: number;
}

interface CategoryDetailed {
  category_id: string;
  name: string;
  color: string;
  amount: number;
  transaction_count: number;
  percentage: number;
}

interface MerchantData {
  merchant: string;
  amount: number;
  transaction_count: number;
  avg_transaction: number;
  last_date: string | null;
}

interface MonthlySummaryData {
  month: string;
  amount: number;
  transaction_count: number;
}

// --- Helpers ---

function abbreviate(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toFixed(0);
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "10px",
    boxShadow: "0 4px 20px rgb(0 0 0 / 0.25)",
    padding: "8px 12px",
  },
  itemStyle: { color: "#f1f5f9", fontSize: 13 } as const,
  labelStyle: { color: "#94a3b8", fontSize: 12 } as const,
};

// --- Page wrapper ---

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}

// --- Main content ---

function AnalyticsContent() {
  const { dateRange } = useDateRange();
  const { formatAmount } = useCurrency();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const dateParams = {
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
  };

  const { data: statsRaw, isLoading: statsLoading } = useGetStatsQuery(dateParams);
  const { data: spendingRaw, isLoading: spendingLoading } = useGetSpendingQuery(dateParams);
  const { data: categoriesRaw } = useGetCategoriesDetailedQuery(dateParams);
  const { data: merchantsRaw } = useGetMerchantsQuery(dateParams);
  const { data: monthlyRaw } = useGetMonthlySummaryQuery();

  const stats = statsRaw as Stats | undefined;
  const spending = spendingRaw as SpendingData[] | undefined;
  const categories = categoriesRaw as CategoryDetailed[] | undefined;
  const merchants = merchantsRaw as MerchantData[] | undefined;
  const monthly = monthlyRaw as MonthlySummaryData[] | undefined;

  const isLoading = statsLoading || spendingLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Compute derived stats
  const totalSpent = stats?.total_spent || 0;
  const txCount = stats?.transaction_count || 0;

  // Calculate days in range
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  const daysInRange = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);

  const avgDaily = totalSpent / daysInRange;
  const avgTransaction = txCount > 0 ? totalSpent / txCount : 0;

  // Day-of-week breakdown from spending data
  const dayOfWeekData = computeDayOfWeek(spending || [], dateRange.startDate);

  // Categories with spending
  const withSpending = (categories || []).filter((c) => c.amount > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">Analytics</h1>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
          Deep insights into your spending patterns
        </p>
      </div>

      <DateSelector />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Spent"
          value={formatAmount(totalSpent)}
          icon={DollarSign}
          subtitle={`${dateRange.label}`}
          iconBg="bg-red-50 dark:bg-red-950"
          iconColor="text-red-500"
        />
        <StatCard
          title="Avg / Day"
          value={formatAmount(avgDaily)}
          icon={CalendarDays}
          subtitle={`Over ${daysInRange} days`}
          iconBg="bg-blue-50 dark:bg-blue-950"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Avg / Transaction"
          value={formatAmount(avgTransaction)}
          icon={TrendingUp}
          subtitle={`${txCount} transactions`}
          iconBg="bg-green-50 dark:bg-green-950"
          iconColor="text-green-500"
        />
        <StatCard
          title="Transactions"
          value={txCount.toString()}
          icon={Receipt}
          subtitle={`${dateRange.label}`}
          iconBg="bg-purple-50 dark:bg-purple-950"
          iconColor="text-purple-500"
        />
      </div>

      {/* Row 1: Monthly Comparison + Day-of-Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            Monthly Comparison
          </h3>
          {monthly && monthly.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.replace(/\s\d{4}$/, "")}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={abbreviate}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatAmount(Number(value)),
                      "Spent",
                    ]}
                    {...tooltipStyle}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {monthly.map((entry, index) => (
                      <Cell
                        key={entry.month}
                        fill={index === monthly.length - 1 ? "#22c55e" : "#86efac"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-8">
              No monthly data yet
            </p>
          )}
        </div>

        {/* Day of Week */}
        <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            By Day of Week
          </h3>
          {dayOfWeekData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={dayOfWeekData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={abbreviate}
                  />
                  <YAxis
                    type="category"
                    dataKey="day"
                    width={36}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatAmount(Number(value)),
                      "Spent",
                    ]}
                    {...tooltipStyle}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-8">No data</p>
          )}
        </div>
      </div>

      {/* Row 2: Spending Over Time + Top Merchants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            Spending Over Time
          </h3>
          {spending && spending.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spending} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    interval={spending.length > 15 ? Math.ceil(spending.length / 8) - 1 : 0}
                    angle={spending.length > 20 ? -35 : 0}
                    textAnchor={spending.length > 20 ? "end" : "middle"}
                    height={spending.length > 20 ? 50 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={abbreviate}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number | string) => [
                      formatAmount(Number(value)),
                      "Spent",
                    ]}
                    {...tooltipStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#analyticsGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#22c55e" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-8">No data</p>
          )}
        </div>

        {/* Top Merchants */}
        <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            Top Merchants
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {merchants && merchants.length > 0 ? (
              merchants.slice(0, 10).map((m, i) => (
                <div key={m.merchant} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-secondary-400 w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                      {m.merchant}
                    </p>
                    <p className="text-xs text-secondary-400">
                      {m.transaction_count} transaction{m.transaction_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 whitespace-nowrap">
                    {formatAmount(Number(m.amount))}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-secondary-400 text-center py-4">
                No merchant data
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Category Spending (full width) */}
      <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
          Spending by Category
        </h3>
        {withSpending.length > 0 ? (
          <div style={{ height: Math.max(200, withSpending.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={withSpending}
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={abbreviate}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatAmount(Number(value)),
                    "Spent",
                  ]}
                  {...tooltipStyle}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {withSpending.map((entry) => (
                    <Cell key={entry.category_id} fill={entry.color || "#6B7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-secondary-400 text-center py-8">
            No category data for this period
          </p>
        )}
      </div>
    </div>
  );
}

// --- Stat Card ---

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  iconBg = "bg-primary-50 dark:bg-primary-950",
  iconColor = "text-primary-500",
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle: string;
  iconBg?: string;
  iconColor?: string;
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
      <p className="mt-1.5 text-xs text-secondary-400">{subtitle}</p>
    </div>
  );
}

// --- Day-of-Week computation ---

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function computeDayOfWeek(
  spending: SpendingData[],
  startDateStr: string
): { day: string; amount: number }[] {
  if (spending.length === 0) return [];

  // Parse the start date to determine the year
  const startYear = new Date(startDateStr).getFullYear();
  const dayTotals: Record<string, number> = {};

  for (const point of spending) {
    // point.date is like "Feb 01" — construct a parseable date
    const parsed = new Date(`${point.date}, ${startYear}`);
    if (isNaN(parsed.getTime())) continue;
    const dayName = DAY_NAMES[parsed.getDay()];
    dayTotals[dayName] = (dayTotals[dayName] || 0) + Number(point.amount);
  }

  // Return Mon-Sun order
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return order.map((day) => ({
    day,
    amount: Math.round((dayTotals[day] || 0) * 100) / 100,
  }));
}
