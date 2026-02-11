import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@budget-assistant-api/prisma-client';
import { TransactionStatus } from '@budget-assistant-api/shared';
import { Prisma } from '@prisma/client';

interface TransactionFilters {
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!transaction) {
      throw new RpcException('Transaction not found');
    }
    return transaction;
  }

  async getUserTransactions(userId: string, filters: TransactionFilters) {
    const where: Record<string, unknown> = { userId };

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.startDate) {
        dateFilter.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        dateFilter.lte = new Date(filters.endDate);
      }
      where.date = dateFilter;
    }

    const skip = Number(filters.skip) || 0;
    const take = Number(filters.limit) || 50;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total, skip, limit: take };
  }

  async create(
    userId: string,
    data: {
      merchant: string;
      amount: number | string;
      currency?: string;
      date: string;
      description?: string;
      categoryId?: string;
      emailId?: string;
      emailSubject?: string;
      status?: string;
      confidence?: number;
      rawData?: Record<string, unknown>;
      duplicateGroupId?: string;
      isPrimary?: boolean;
    },
  ) {
    return this.prisma.transaction.create({
      data: {
        userId,
        merchant: data.merchant,
        amount: data.amount,
        currency: data.currency ?? 'MYR',
        date: new Date(data.date),
        description: data.description ?? null,
        categoryId: data.categoryId ?? null,
        emailId: data.emailId ?? null,
        emailSubject: data.emailSubject ?? null,
        status: data.status ?? TransactionStatus.PROCESSED,
        confidence: data.confidence ?? 1.0,
        rawData: (data.rawData ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        duplicateGroupId: data.duplicateGroupId ?? null,
        isPrimary: data.isPrimary ?? true,
      },
      include: { category: true },
    });
  }

  async update(
    id: string,
    data: {
      merchant?: string;
      amount?: number | string;
      currency?: string;
      date?: string;
      description?: string;
      categoryId?: string;
      status?: string;
      confidence?: number;
      duplicateGroupId?: string | null;
      isPrimary?: boolean;
    },
  ) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new RpcException('Transaction not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.merchant !== undefined) updateData.merchant = data.merchant;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;
    if (data.duplicateGroupId !== undefined)
      updateData.duplicateGroupId = data.duplicateGroupId;
    if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;

    return this.prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new RpcException('Transaction not found');
    }
    await this.prisma.transaction.delete({ where: { id } });
    return { deleted: true };
  }

  async bulkUpdateStatus(
    userId: string,
    transactionIds: string[],
    status: string,
  ) {
    const result = await this.prisma.transaction.updateMany({
      where: {
        id: { in: transactionIds },
        userId,
      },
      data: { status },
    });
    return { updated: result.count };
  }

  async getTransactionsWithDuplicates(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Record<string, unknown> = { userId };

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 200,
    });

    // Group by duplicate_group_id
    const groupMap = new Map<
      string,
      { transactions: typeof transactions; reason: string | null }
    >();

    for (const tx of transactions) {
      if (!tx.duplicateGroupId) continue;

      if (!groupMap.has(tx.duplicateGroupId)) {
        groupMap.set(tx.duplicateGroupId, { transactions: [], reason: null });
      }

      const group = groupMap.get(tx.duplicateGroupId)!;
      group.transactions.push(tx);

      // Extract _dedup_reason from rawData
      if (!group.reason && tx.rawData) {
        const rawData = tx.rawData as Record<string, unknown>;
        if (rawData._dedup_reason) {
          group.reason = rawData._dedup_reason as string;
        }
      }
    }

    // Only include groups with 2+ members that have unresolved members
    const duplicateGroups: {
      group_id: string;
      reason: string | null;
      transactions: typeof transactions;
      primary_id: string | null;
    }[] = [];

    for (const [groupId, group] of groupMap.entries()) {
      if (group.transactions.length < 2) continue;

      // Check if group has unresolved members (not all VERIFIED or REJECTED)
      const hasUnresolved = group.transactions.some(
        (tx) =>
          tx.status !== TransactionStatus.VERIFIED &&
          tx.status !== TransactionStatus.REJECTED,
      );

      if (!hasUnresolved) continue;

      const primary = group.transactions.find((tx) => tx.isPrimary);
      duplicateGroups.push({
        group_id: groupId,
        reason: group.reason,
        transactions: group.transactions,
        primary_id: primary?.id ?? null,
      });
    }

    return { transactions, duplicate_groups: duplicateGroups };
  }

  async resolveDuplicateGroup(
    userId: string,
    groupId: string,
    keepId: string,
  ) {
    // Verify all transactions in group belong to user
    const groupTransactions = await this.prisma.transaction.findMany({
      where: { duplicateGroupId: groupId, userId },
    });

    if (groupTransactions.length === 0) {
      throw new RpcException('Duplicate group not found');
    }

    const keepTransaction = groupTransactions.find((tx) => tx.id === keepId);
    if (!keepTransaction) {
      throw new RpcException(
        'Transaction to keep not found in duplicate group',
      );
    }

    // First: reject ALL in group and set isPrimary=false
    await this.prisma.transaction.updateMany({
      where: { duplicateGroupId: groupId, userId },
      data: {
        status: TransactionStatus.REJECTED,
        isPrimary: false,
      },
    });

    // Then: update the kept one to VERIFIED + isPrimary=true
    await this.prisma.transaction.update({
      where: { id: keepId },
      data: {
        status: TransactionStatus.VERIFIED,
        isPrimary: true,
      },
    });

    return { resolved: true, kept_id: keepId };
  }

  async dismissDuplicateGroup(userId: string, groupId: string) {
    const groupTransactions = await this.prisma.transaction.findMany({
      where: { duplicateGroupId: groupId, userId },
    });

    if (groupTransactions.length === 0) {
      throw new RpcException('Duplicate group not found');
    }

    // Clear duplicate group, set all to PENDING
    await this.prisma.transaction.updateMany({
      where: { duplicateGroupId: groupId, userId },
      data: {
        duplicateGroupId: null,
        isPrimary: true,
        status: TransactionStatus.PENDING,
      },
    });

    return { dismissed: true };
  }
}
