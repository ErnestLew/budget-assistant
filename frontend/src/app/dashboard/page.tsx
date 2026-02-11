"use client";

import { Suspense } from "react";
import { DateSelector } from "@/components/dashboard/date-selector";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { GmailSync } from "@/components/dashboard/gmail-sync";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-secondary-500 mt-0.5">
          Track your spending and manage your budget
        </p>
      </div>

      <DateSelector />
      <GmailSync />

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Suspense fallback={<ChartSkeleton />}>
          <SpendingChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <CategoryBreakdown />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Suspense fallback={<TableSkeleton />}>
            <RecentTransactions />
          </Suspense>
        </div>
        <Suspense fallback={<ChartSkeleton />}>
          <BudgetProgress />
        </Suspense>
      </div>
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-secondary-900 rounded-2xl p-5 border border-secondary-100 dark:border-secondary-800 animate-pulse"
        >
          <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2 mb-4" />
          <div className="h-8 bg-secondary-100 dark:bg-secondary-800 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 border border-secondary-100 dark:border-secondary-800 animate-pulse">
      <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 mb-4" />
      <div className="h-64 bg-secondary-50 dark:bg-secondary-800 rounded-xl" />
    </div>
  );
}

function TableSkeleton() {
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
