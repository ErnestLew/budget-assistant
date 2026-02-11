"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  CreditCard,
  PieChart,
  PlusCircle,
  Settings,
  Tag,
  Wallet,
  BarChart3,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/dashboard/transactions", icon: CreditCard },
  { name: "Add Spending", href: "/dashboard/add-spending", icon: PlusCircle },
  { name: "Categories", href: "/dashboard/categories", icon: Tag },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Budgets", href: "/dashboard/budgets", icon: PieChart },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col overflow-y-auto bg-white dark:bg-secondary-950 border-r border-secondary-100 dark:border-secondary-800">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-secondary-100 dark:border-secondary-800">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm shadow-primary-600/20">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
            Budget Assistant
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col px-4 py-4">
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400 shadow-sm"
                        : "text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-900 hover:text-secondary-900 dark:hover:text-secondary-200"
                    )}
                  >
                    <item.icon
                      className={clsx(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-secondary-400 group-hover:text-secondary-600 dark:group-hover:text-secondary-300"
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950 dark:to-primary-900/50 p-4 border border-primary-100 dark:border-primary-800">
            <p className="text-xs font-semibold text-primary-800 dark:text-primary-300 mb-1">
              AI-Powered
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400 leading-relaxed">
              Receipts are parsed and categorized automatically using AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
