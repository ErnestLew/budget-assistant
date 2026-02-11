export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus = "pending" | "processed" | "verified" | "rejected" | "failed";

export interface Transaction {
  id: string;
  user_id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  email_id?: string | null;
  email_subject?: string | null;
  status: TransactionStatus;
  confidence: number;
  duplicate_group_id?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color: string;
  parentId?: string;
  userId?: string;
  isDefault: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  category?: Category;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlert {
  id: string;
  userId: string;
  budgetId: string;
  budget?: Budget;
  threshold: number;
  isTriggered: boolean;
  triggeredAt?: string;
  notificationSent: boolean;
  createdAt: string;
}

export interface SpendingAnalytics {
  totalSpent: number;
  averageTransaction: number;
  transactionCount: number;
  topCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  dailySpending: {
    date: string;
    amount: number;
  }[];
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    percentageChange: number;
  };
}

export interface EmailSyncStatus {
  lastSyncAt?: string;
  emailsProcessed: number;
  receiptsFound: number;
  status: "idle" | "syncing" | "error";
  errorMessage?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}
