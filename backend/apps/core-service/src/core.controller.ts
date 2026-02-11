import { Controller } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { TransactionService } from './transactions/transaction.service';
import { CategoryService } from './categories/category.service';
import { BudgetService } from './budgets/budget.service';

// ── Response mappers (snake_case for frontend) ──────────────────────────

function mapTransactionResponse(tx: Record<string, unknown>) {
  const category = tx.category as Record<string, unknown> | null | undefined;
  return {
    id: tx.id,
    user_id: tx.userId,
    merchant: tx.merchant,
    amount: tx.amount != null ? tx.amount.toString() : '0',
    currency: tx.currency,
    date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
    description: tx.description,
    category_id: tx.categoryId,
    email_id: tx.emailId,
    email_subject: tx.emailSubject,
    status: tx.status,
    confidence: tx.confidence,
    duplicate_group_id: tx.duplicateGroupId,
    is_primary: tx.isPrimary,
    category_name: category?.name ?? null,
    category_color: category?.color ?? null,
    created_at:
      tx.createdAt instanceof Date
        ? tx.createdAt.toISOString()
        : tx.createdAt,
    updated_at:
      tx.updatedAt instanceof Date
        ? tx.updatedAt.toISOString()
        : tx.updatedAt,
  };
}

function mapCategoryResponse(cat: Record<string, unknown>) {
  return {
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    parent_id: cat.parentId,
    user_id: cat.userId,
    is_default: cat.isDefault,
    created_at:
      cat.createdAt instanceof Date
        ? cat.createdAt.toISOString()
        : cat.createdAt,
    updated_at:
      cat.updatedAt instanceof Date
        ? cat.updatedAt.toISOString()
        : cat.updatedAt,
  };
}

function mapBudgetResponse(b: Record<string, unknown>) {
  return {
    id: b.id,
    user_id: b.userId,
    category_id: b.categoryId,
    name: b.name,
    amount: b.amount != null ? b.amount.toString() : '0',
    period: b.period,
    start_date:
      b.startDate instanceof Date ? b.startDate.toISOString() : b.startDate,
    end_date:
      b.endDate instanceof Date
        ? b.endDate.toISOString()
        : b.endDate ?? null,
    is_active: b.isActive,
    created_at:
      b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    updated_at:
      b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
  };
}

function mapBudgetAlertResponse(a: Record<string, unknown>) {
  return {
    id: a.id,
    user_id: a.userId,
    budget_id: a.budgetId,
    threshold: a.threshold,
    is_triggered: a.isTriggered,
    triggered_at:
      a.triggeredAt instanceof Date
        ? a.triggeredAt.toISOString()
        : a.triggeredAt ?? null,
    notification_sent: a.notificationSent,
    created_at:
      a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

// ── Controller ──────────────────────────────────────────────────────────

@Controller()
export class CoreController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly categoryService: CategoryService,
    private readonly budgetService: BudgetService,
  ) {}

  // ── Transactions ────────────────────────────────────────────────────

  @MessagePattern(CORE_PATTERNS.LIST_TRANSACTIONS)
  async listTransactions(payload: {
    userId: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }) {
    const result = await this.transactionService.getUserTransactions(
      payload.userId,
      {
        categoryId: payload.categoryId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status,
        skip: payload.skip,
        limit: payload.limit,
      },
    );

    return {
      transactions: result.transactions.map((tx) =>
        mapTransactionResponse(tx as unknown as Record<string, unknown>),
      ),
      total: result.total,
      skip: result.skip,
      limit: result.limit,
    };
  }

  @MessagePattern(CORE_PATTERNS.CREATE_TRANSACTION)
  async createTransaction(payload: {
    userId: string;
    data: {
      merchant: string;
      amount: number | string;
      currency?: string;
      date: string;
      description?: string;
      category_id?: string;
      email_id?: string;
      email_subject?: string;
      status?: string;
      confidence?: number;
      raw_data?: Record<string, unknown>;
      duplicate_group_id?: string;
      is_primary?: boolean;
    };
  }) {
    const tx = await this.transactionService.create(payload.userId, {
      merchant: payload.data.merchant,
      amount: payload.data.amount,
      currency: payload.data.currency,
      date: payload.data.date,
      description: payload.data.description,
      categoryId: payload.data.category_id,
      emailId: payload.data.email_id,
      emailSubject: payload.data.email_subject,
      status: payload.data.status,
      confidence: payload.data.confidence,
      rawData: payload.data.raw_data,
      duplicateGroupId: payload.data.duplicate_group_id,
      isPrimary: payload.data.is_primary,
    });

    return mapTransactionResponse(
      tx as unknown as Record<string, unknown>,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_TRANSACTION)
  async getTransaction(payload: { transactionId: string }) {
    const tx = await this.transactionService.getById(payload.transactionId);
    return mapTransactionResponse(
      tx as unknown as Record<string, unknown>,
    );
  }

  @MessagePattern(CORE_PATTERNS.UPDATE_TRANSACTION)
  async updateTransaction(payload: {
    transactionId: string;
    data: {
      merchant?: string;
      amount?: number | string;
      currency?: string;
      date?: string;
      description?: string;
      category_id?: string;
      status?: string;
      confidence?: number;
      duplicate_group_id?: string | null;
      is_primary?: boolean;
    };
  }) {
    const tx = await this.transactionService.update(payload.transactionId, {
      merchant: payload.data.merchant,
      amount: payload.data.amount,
      currency: payload.data.currency,
      date: payload.data.date,
      description: payload.data.description,
      categoryId: payload.data.category_id,
      status: payload.data.status,
      confidence: payload.data.confidence,
      duplicateGroupId: payload.data.duplicate_group_id,
      isPrimary: payload.data.is_primary,
    });

    return mapTransactionResponse(
      tx as unknown as Record<string, unknown>,
    );
  }

  @MessagePattern(CORE_PATTERNS.DELETE_TRANSACTION)
  async deleteTransaction(payload: { transactionId: string }) {
    return this.transactionService.delete(payload.transactionId);
  }

  @MessagePattern(CORE_PATTERNS.BULK_STATUS)
  async bulkStatus(payload: {
    userId: string;
    transactionIds: string[];
    status: string;
  }) {
    return this.transactionService.bulkUpdateStatus(
      payload.userId,
      payload.transactionIds,
      payload.status,
    );
  }

  @MessagePattern(CORE_PATTERNS.WITH_DUPLICATES)
  async withDuplicates(payload: {
    userId: string;
    startDate?: string;
    endDate?: string;
  }) {
    const result =
      await this.transactionService.getTransactionsWithDuplicates(
        payload.userId,
        payload.startDate,
        payload.endDate,
      );

    return {
      transactions: result.transactions.map((tx) =>
        mapTransactionResponse(tx as unknown as Record<string, unknown>),
      ),
      duplicate_groups: result.duplicate_groups.map((group) => ({
        group_id: group.group_id,
        reason: group.reason,
        transactions: group.transactions.map((tx) =>
          mapTransactionResponse(tx as unknown as Record<string, unknown>),
        ),
        primary_id: group.primary_id,
      })),
    };
  }

  @MessagePattern(CORE_PATTERNS.RESOLVE_DUPLICATE)
  async resolveDuplicate(payload: {
    userId: string;
    groupId: string;
    keepId: string;
  }) {
    return this.transactionService.resolveDuplicateGroup(
      payload.userId,
      payload.groupId,
      payload.keepId,
    );
  }

  @MessagePattern(CORE_PATTERNS.DISMISS_DUPLICATE)
  async dismissDuplicate(payload: { userId: string; groupId: string }) {
    return this.transactionService.dismissDuplicateGroup(
      payload.userId,
      payload.groupId,
    );
  }

  // ── Categories ──────────────────────────────────────────────────────

  @MessagePattern(CORE_PATTERNS.LIST_CATEGORIES)
  async listCategories(payload: { userId: string }) {
    const categories = await this.categoryService.getAll(payload.userId);
    return categories.map((cat) =>
      mapCategoryResponse(cat as unknown as Record<string, unknown>),
    );
  }

  @MessagePattern(CORE_PATTERNS.CREATE_CATEGORY)
  async createCategory(payload: {
    userId: string;
    data: {
      name: string;
      icon?: string;
      color?: string;
      parent_id?: string;
    };
  }) {
    const cat = await this.categoryService.create(payload.userId, {
      name: payload.data.name,
      icon: payload.data.icon,
      color: payload.data.color,
      parentId: payload.data.parent_id,
    });

    return mapCategoryResponse(cat as unknown as Record<string, unknown>);
  }

  @MessagePattern(CORE_PATTERNS.UPDATE_CATEGORY)
  async updateCategory(payload: {
    categoryId: string;
    data: {
      name?: string;
      icon?: string;
      color?: string;
      parent_id?: string;
    };
  }) {
    const cat = await this.categoryService.update(payload.categoryId, {
      name: payload.data.name,
      icon: payload.data.icon,
      color: payload.data.color,
      parentId: payload.data.parent_id,
    });

    return mapCategoryResponse(cat as unknown as Record<string, unknown>);
  }

  @MessagePattern(CORE_PATTERNS.DELETE_CATEGORY)
  async deleteCategory(payload: { categoryId: string }) {
    return this.categoryService.delete(payload.categoryId);
  }

  // ── Budgets ─────────────────────────────────────────────────────────

  @MessagePattern(CORE_PATTERNS.LIST_BUDGETS)
  async listBudgets(payload: { userId: string; activeOnly?: boolean }) {
    const budgets = await this.budgetService.getUserBudgets(
      payload.userId,
      payload.activeOnly,
    );
    return budgets.map((b) =>
      mapBudgetResponse(b as unknown as Record<string, unknown>),
    );
  }

  @MessagePattern(CORE_PATTERNS.CREATE_BUDGET)
  async createBudget(payload: {
    userId: string;
    data: {
      name: string;
      amount: number | string;
      period?: string;
      category_id?: string;
      start_date: string;
      end_date?: string;
      is_active?: boolean;
    };
  }) {
    const budget = await this.budgetService.create(payload.userId, {
      name: payload.data.name,
      amount: payload.data.amount,
      period: payload.data.period,
      categoryId: payload.data.category_id,
      startDate: payload.data.start_date,
      endDate: payload.data.end_date,
      isActive: payload.data.is_active,
    });

    return mapBudgetResponse(budget as unknown as Record<string, unknown>);
  }

  @MessagePattern(CORE_PATTERNS.UPDATE_BUDGET)
  async updateBudget(payload: {
    budgetId: string;
    data: {
      name?: string;
      amount?: number | string;
      period?: string;
      category_id?: string;
      start_date?: string;
      end_date?: string;
      is_active?: boolean;
    };
  }) {
    const budget = await this.budgetService.update(payload.budgetId, {
      name: payload.data.name,
      amount: payload.data.amount,
      period: payload.data.period,
      categoryId: payload.data.category_id,
      startDate: payload.data.start_date,
      endDate: payload.data.end_date,
      isActive: payload.data.is_active,
    });

    return mapBudgetResponse(budget as unknown as Record<string, unknown>);
  }

  @MessagePattern(CORE_PATTERNS.DELETE_BUDGET)
  async deleteBudget(payload: { budgetId: string }) {
    return this.budgetService.delete(payload.budgetId);
  }

  @MessagePattern(CORE_PATTERNS.BUDGET_PROGRESS)
  async budgetProgress(payload: {
    userId: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.budgetService.getBudgetProgress(
      payload.userId,
      payload.startDate,
      payload.endDate,
    );
  }

  @MessagePattern(CORE_PATTERNS.LIST_ALERTS)
  async listAlerts(payload: { userId: string }) {
    const alerts = await this.budgetService.getUserAlerts(payload.userId);
    return alerts.map((a) =>
      mapBudgetAlertResponse(a as unknown as Record<string, unknown>),
    );
  }

  @MessagePattern(CORE_PATTERNS.CREATE_ALERT)
  async createAlert(payload: {
    userId: string;
    data: {
      budget_id: string;
      threshold?: number;
    };
  }) {
    const alert = await this.budgetService.createAlert(payload.userId, {
      budgetId: payload.data.budget_id,
      threshold: payload.data.threshold,
    });

    return mapBudgetAlertResponse(
      alert as unknown as Record<string, unknown>,
    );
  }
}
