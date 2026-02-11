import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@budget-assistant-api/prisma-client';
import { TransactionStatus, BudgetPeriod } from '@budget-assistant-api/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const budget = await this.prisma.budget.findUnique({ where: { id } });
    if (!budget) {
      throw new RpcException('Budget not found');
    }
    return budget;
  }

  async getUserBudgets(userId: string, activeOnly?: boolean) {
    const where: Record<string, unknown> = { userId };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    data: {
      name: string;
      amount: number | string;
      period?: string;
      categoryId?: string;
      startDate: string;
      endDate?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.budget.create({
      data: {
        userId,
        name: data.name,
        amount: data.amount,
        period: data.period ?? BudgetPeriod.MONTHLY,
        categoryId: data.categoryId ?? null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      amount?: number | string;
      period?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.budget.findUnique({ where: { id } });
    if (!existing) {
      throw new RpcException('Budget not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.period !== undefined) updateData.period = data.period;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.startDate !== undefined)
      updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined)
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.budget.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.budget.findUnique({ where: { id } });
    if (!existing) {
      throw new RpcException('Budget not found');
    }
    await this.prisma.budget.delete({ where: { id } });
    return { deleted: true };
  }

  async getBudgetProgress(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Get all active budgets for user
    const budgets = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
    });

    const progress: {
      budget_id: string;
      category: string;
      spent: string;
      limit: string;
      period: string;
    }[] = [];

    for (const budget of budgets) {
      // Calculate period start/end based on budget period
      const { periodStart, periodEnd } = this.calculatePeriodDates(
        budget.period,
        startDate,
        endDate,
      );

      // Build where clause for spending query
      const txWhere: Record<string, unknown> = {
        userId,
        status: { not: TransactionStatus.REJECTED },
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      };

      // If budget has a category, filter by it
      if (budget.categoryId) {
        txWhere.categoryId = budget.categoryId;
      }

      // Sum spending (assumes same currency for now)
      const aggregate = await this.prisma.transaction.aggregate({
        where: txWhere,
        _sum: { amount: true },
      });

      const spent = aggregate._sum.amount ?? new Decimal(0);

      progress.push({
        budget_id: budget.id,
        category: budget.name,
        spent: spent.toString(),
        limit: budget.amount.toString(),
        period: budget.period,
      });
    }

    return progress;
  }

  async createAlert(
    userId: string,
    data: {
      budgetId: string;
      threshold?: number;
    },
  ) {
    // Verify budget exists and belongs to user
    const budget = await this.prisma.budget.findUnique({
      where: { id: data.budgetId },
    });
    if (!budget || budget.userId !== userId) {
      throw new RpcException('Budget not found');
    }

    return this.prisma.budgetAlert.create({
      data: {
        userId,
        budgetId: data.budgetId,
        threshold: data.threshold ?? 80,
      },
    });
  }

  async getUserAlerts(userId: string) {
    return this.prisma.budgetAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private calculatePeriodDates(
    period: string,
    startDateStr?: string,
    endDateStr?: string,
  ): { periodStart: Date; periodEnd: Date } {
    // If explicit dates are provided, use them
    if (startDateStr && endDateStr) {
      return {
        periodStart: new Date(startDateStr),
        periodEnd: new Date(endDateStr),
      };
    }

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case BudgetPeriod.WEEKLY: {
        const day = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - day);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        break;
      }
      case BudgetPeriod.YEARLY: {
        periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      }
      case BudgetPeriod.MONTHLY:
      default: {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        periodEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        break;
      }
    }

    // Allow overriding individual dates
    if (startDateStr) {
      periodStart = new Date(startDateStr);
    }
    if (endDateStr) {
      periodEnd = new Date(endDateStr);
    }

    return { periodStart, periodEnd };
  }
}
