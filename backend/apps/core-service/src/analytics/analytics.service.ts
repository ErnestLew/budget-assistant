import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@budget-assistant-api/prisma-client';
import { ExchangeRateService } from '../exchange-rates/exchange-rate.service';

interface CurrencyAmount {
  currency: string;
  amount: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Convert an array of (currency, amount) pairs into a single sum
   * in the target currency.
   */
  private async convertAndSum(
    currencyAmounts: CurrencyAmount[],
    targetCurrency: string,
  ): Promise<number> {
    if (currencyAmounts.length === 0) return 0;

    // Fast path: all same currency
    const allSame = currencyAmounts.every(
      (ca) => ca.currency === targetCurrency,
    );
    if (allSame) {
      return currencyAmounts.reduce((sum, ca) => sum + ca.amount, 0);
    }

    let total = 0;
    for (const { currency, amount } of currencyAmounts) {
      if (currency === targetCurrency) {
        total += amount;
      } else {
        total += await this.exchangeRateService.convert(
          amount,
          currency,
          targetCurrency,
        );
      }
    }
    return total;
  }

  /**
   * Format a Date as a short label like "Jan 20".
   */
  private formatDateLabel(date: Date): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  /**
   * Format a Date as a month label like "Jan 2026".
   */
  private formatMonthLabel(date: Date): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Compute start-of-day in UTC.
   */
  private startOfDay(d: Date): Date {
    const result = new Date(d);
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Compute end-of-day in UTC.
   */
  private endOfDay(d: Date): Date {
    const result = new Date(d);
    result.setUTCHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Round a number to 2 decimal places.
   */
  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  // ---------------------------------------------------------------------------
  // getStats
  // ---------------------------------------------------------------------------

  async getStats(
    userId: string,
    startDate?: string,
    endDate?: string,
    targetCurrency = 'MYR',
  ) {
    const now = new Date();

    // Current period
    let currentStart: Date;
    let currentEnd: Date;
    if (startDate && endDate) {
      currentStart = this.startOfDay(new Date(startDate));
      currentEnd = this.endOfDay(new Date(endDate));
    } else {
      // Month-to-date
      currentStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      currentEnd = this.endOfDay(now);
    }

    // Previous period: same duration immediately before current period
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    // Query current period spending grouped by currency
    const currentSpending = await this.prisma.$queryRaw<
      { currency: string; total: number; tx_count: bigint }[]
    >`
      SELECT currency, SUM(amount::numeric) as total, COUNT(id) as tx_count
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${currentStart}
        AND date <= ${currentEnd}
        AND status != 'rejected'
      GROUP BY currency
    `;

    // Query previous period spending grouped by currency
    const previousSpending = await this.prisma.$queryRaw<
      { currency: string; total: number }[]
    >`
      SELECT currency, SUM(amount::numeric) as total
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${previousStart}
        AND date <= ${previousEnd}
        AND status != 'rejected'
      GROUP BY currency
    `;

    // Convert current period to target currency
    const currentAmounts: CurrencyAmount[] = currentSpending.map((row) => ({
      currency: row.currency,
      amount: Number(row.total),
    }));
    const totalSpent = await this.convertAndSum(currentAmounts, targetCurrency);

    // Transaction count
    const transactionCount = currentSpending.reduce(
      (sum, row) => sum + Number(row.tx_count),
      0,
    );

    // Convert previous period to target currency
    const previousAmounts: CurrencyAmount[] = previousSpending.map((row) => ({
      currency: row.currency,
      amount: Number(row.total),
    }));
    const previousTotal = await this.convertAndSum(
      previousAmounts,
      targetCurrency,
    );

    // Get monthly budget from active budgets
    const budgetResult = await this.prisma.$queryRaw<
      { total_budget: number | null }[]
    >`
      SELECT SUM(amount::numeric) as total_budget
      FROM budgets
      WHERE user_id = ${userId}::uuid
        AND is_active = true
    `;

    const monthlyBudget =
      budgetResult[0]?.total_budget != null
        ? Number(budgetResult[0].total_budget)
        : 2000;

    // Trend percentage
    let trendPercentage = 0;
    if (previousTotal > 0) {
      trendPercentage = this.round2(
        ((totalSpent - previousTotal) / previousTotal) * 100,
      );
    }

    // Savings rate
    const savingsRate =
      monthlyBudget > 0
        ? this.round2(
            Math.max(0, ((monthlyBudget - totalSpent) / monthlyBudget) * 100),
          )
        : 0;

    return {
      total_spent: this.round2(totalSpent),
      monthly_budget: this.round2(monthlyBudget),
      transaction_count: transactionCount,
      savings_rate: savingsRate,
      trend_percentage: trendPercentage,
    };
  }

  // ---------------------------------------------------------------------------
  // getSpendingOverTime
  // ---------------------------------------------------------------------------

  async getSpendingOverTime(
    userId: string,
    days = 30,
    startDate?: string,
    endDate?: string,
    targetCurrency = 'MYR',
  ) {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = this.startOfDay(new Date(startDate));
      end = this.endOfDay(new Date(endDate));
    } else {
      end = this.endOfDay(now);
      start = this.startOfDay(
        new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000),
      );
    }

    // Query daily spending grouped by date and currency
    const rows = await this.prisma.$queryRaw<
      { day: Date; currency: string; amount: number }[]
    >`
      SELECT date::date as day, currency, SUM(amount::numeric) as amount
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${start}
        AND date <= ${end}
        AND status != 'rejected'
      GROUP BY date::date, currency
      ORDER BY day
    `;

    // Group rows by day string -> currency amounts
    const dayMap = new Map<string, CurrencyAmount[]>();
    for (const row of rows) {
      const dayStr = new Date(row.day).toISOString().split('T')[0];
      if (!dayMap.has(dayStr)) {
        dayMap.set(dayStr, []);
      }
      dayMap.get(dayStr)!.push({
        currency: row.currency,
        amount: Number(row.amount),
      });
    }

    // Cap end date at today so we don't fill future dates with zeros
    const today = this.endOfDay(now);
    if (end > today) {
      end = today;
    }

    // Build continuous array with zero-fill for missing days
    const result: { date: string; amount: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const dayStr = cursor.toISOString().split('T')[0];
      const label = this.formatDateLabel(cursor);
      const amounts = dayMap.get(dayStr);

      let dayAmount = 0;
      if (amounts && amounts.length > 0) {
        dayAmount = await this.convertAndSum(amounts, targetCurrency);
      }

      result.push({
        date: label,
        amount: this.round2(dayAmount),
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // getCategoryBreakdown
  // ---------------------------------------------------------------------------

  async getCategoryBreakdown(
    userId: string,
    days = 30,
    startDate?: string,
    endDate?: string,
    targetCurrency = 'MYR',
  ) {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = this.startOfDay(new Date(startDate));
      end = this.endOfDay(new Date(endDate));
    } else {
      end = this.endOfDay(now);
      start = this.startOfDay(
        new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000),
      );
    }

    const rows = await this.prisma.$queryRaw<
      {
        category_name: string | null;
        color: string | null;
        currency: string;
        amount: number;
      }[]
    >`
      SELECT
        c.name as category_name,
        c.color as color,
        t.currency,
        SUM(t.amount::numeric) as amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}::uuid
        AND t.date >= ${start}
        AND t.date <= ${end}
        AND t.status != 'rejected'
      GROUP BY c.name, c.color, t.currency
      ORDER BY c.name
    `;

    // Aggregate by category name (across currencies)
    const categoryMap = new Map<
      string,
      { color: string; amounts: CurrencyAmount[] }
    >();

    for (const row of rows) {
      const name = row.category_name || 'Uncategorized';
      const color = row.color || '#6B7280';

      if (!categoryMap.has(name)) {
        categoryMap.set(name, { color, amounts: [] });
      }
      categoryMap.get(name)!.amounts.push({
        currency: row.currency,
        amount: Number(row.amount),
      });
    }

    const result: { name: string; amount: number; color: string }[] = [];
    for (const [name, data] of categoryMap.entries()) {
      const amount = await this.convertAndSum(data.amounts, targetCurrency);
      result.push({
        name,
        amount: this.round2(amount),
        color: data.color,
      });
    }

    // Sort descending by amount
    result.sort((a, b) => b.amount - a.amount);

    return result;
  }

  // ---------------------------------------------------------------------------
  // getDetailedCategoryBreakdown
  // ---------------------------------------------------------------------------

  async getDetailedCategoryBreakdown(
    userId: string,
    startDate?: string,
    endDate?: string,
    targetCurrency = 'MYR',
  ) {
    const now = new Date();

    // Current period
    let currentStart: Date;
    let currentEnd: Date;
    if (startDate && endDate) {
      currentStart = this.startOfDay(new Date(startDate));
      currentEnd = this.endOfDay(new Date(endDate));
    } else {
      currentStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      currentEnd = this.endOfDay(now);
    }

    // Previous period
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    // 1. Current period spending + count per category (by currency)
    const currentRows = await this.prisma.$queryRaw<
      {
        category_id: string | null;
        currency: string;
        amount: number;
        tx_count: bigint;
      }[]
    >`
      SELECT category_id, currency, SUM(amount::numeric) as amount, COUNT(id) as tx_count
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${currentStart}
        AND date <= ${currentEnd}
        AND status != 'rejected'
      GROUP BY category_id, currency
    `;

    // 2. Previous period spending per category (for trend)
    const previousRows = await this.prisma.$queryRaw<
      { category_id: string | null; currency: string; amount: number }[]
    >`
      SELECT category_id, currency, SUM(amount::numeric) as amount
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${previousStart}
        AND date <= ${previousEnd}
        AND status != 'rejected'
      GROUP BY category_id, currency
    `;

    // 3. Top merchant per category (current period)
    const merchantRows = await this.prisma.$queryRaw<
      {
        category_id: string | null;
        merchant: string;
        currency: string;
        merchant_amount: number;
      }[]
    >`
      SELECT DISTINCT ON (category_id)
        category_id,
        merchant,
        currency,
        SUM(amount::numeric) OVER (PARTITION BY category_id, merchant) as merchant_amount
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${currentStart}
        AND date <= ${currentEnd}
        AND status != 'rejected'
      ORDER BY category_id, merchant_amount DESC
    `;

    // 4. Active budgets per category
    const budgetRows = await this.prisma.$queryRaw<
      { category_id: string | null; budget_amount: number }[]
    >`
      SELECT category_id, SUM(amount::numeric) as budget_amount
      FROM budgets
      WHERE user_id = ${userId}::uuid
        AND is_active = true
      GROUP BY category_id
    `;

    // 5. All categories (default + user's)
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
      },
      orderBy: { name: 'asc' },
    });

    // Build lookup maps
    // Current amounts by category_id
    const currentByCat = new Map<
      string,
      { amounts: CurrencyAmount[]; txCount: number }
    >();
    for (const row of currentRows) {
      const catId = row.category_id || '__uncategorized__';
      if (!currentByCat.has(catId)) {
        currentByCat.set(catId, { amounts: [], txCount: 0 });
      }
      const entry = currentByCat.get(catId)!;
      entry.amounts.push({
        currency: row.currency,
        amount: Number(row.amount),
      });
      entry.txCount += Number(row.tx_count);
    }

    // Previous amounts by category_id
    const previousByCat = new Map<string, CurrencyAmount[]>();
    for (const row of previousRows) {
      const catId = row.category_id || '__uncategorized__';
      if (!previousByCat.has(catId)) {
        previousByCat.set(catId, []);
      }
      previousByCat.get(catId)!.push({
        currency: row.currency,
        amount: Number(row.amount),
      });
    }

    // Top merchants by category_id
    const topMerchantByCat = new Map<
      string,
      { merchant: string; currency: string; amount: number }
    >();
    for (const row of merchantRows) {
      const catId = row.category_id || '__uncategorized__';
      topMerchantByCat.set(catId, {
        merchant: row.merchant,
        currency: row.currency,
        amount: Number(row.merchant_amount),
      });
    }

    // Budgets by category_id
    const budgetByCat = new Map<string, number>();
    for (const row of budgetRows) {
      const catId = row.category_id || '__uncategorized__';
      budgetByCat.set(catId, Number(row.budget_amount));
    }

    // Compute grand total for percentage calculation
    let grandTotal = 0;
    for (const [, data] of currentByCat.entries()) {
      grandTotal += await this.convertAndSum(data.amounts, targetCurrency);
    }

    // Build result per category
    const result: {
      category_id: string | null;
      name: string;
      icon: string | null;
      color: string;
      is_default: boolean;
      amount: number;
      transaction_count: number;
      percentage: number;
      budget_limit: number | null;
      previous_amount: number;
      trend_percentage: number;
      avg_transaction: number;
      top_merchant: string | null;
      top_merchant_amount: number | null;
    }[] = [];

    // Track which category IDs we've processed
    const processedCatIds = new Set<string>();

    for (const cat of categories) {
      processedCatIds.add(cat.id);

      const currentData = currentByCat.get(cat.id);
      const amount = currentData
        ? await this.convertAndSum(currentData.amounts, targetCurrency)
        : 0;
      const txCount = currentData ? currentData.txCount : 0;

      const prevAmounts = previousByCat.get(cat.id);
      const previousAmount = prevAmounts
        ? await this.convertAndSum(prevAmounts, targetCurrency)
        : 0;

      let trendPercentage = 0;
      if (previousAmount > 0) {
        trendPercentage = this.round2(
          ((amount - previousAmount) / previousAmount) * 100,
        );
      }

      const budgetLimit = budgetByCat.get(cat.id) ?? null;

      const topMerchant = topMerchantByCat.get(cat.id);
      let topMerchantAmount: number | null = null;
      if (topMerchant) {
        topMerchantAmount = this.round2(
          await this.exchangeRateService.convert(
            topMerchant.amount,
            topMerchant.currency,
            targetCurrency,
          ),
        );
      }

      const percentage =
        grandTotal > 0 ? this.round2((amount / grandTotal) * 100) : 0;
      const avgTransaction = txCount > 0 ? this.round2(amount / txCount) : 0;

      result.push({
        category_id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        is_default: cat.isDefault,
        amount: this.round2(amount),
        transaction_count: txCount,
        percentage,
        budget_limit: budgetLimit != null ? this.round2(budgetLimit) : null,
        previous_amount: this.round2(previousAmount),
        trend_percentage: trendPercentage,
        avg_transaction: avgTransaction,
        top_merchant: topMerchant?.merchant ?? null,
        top_merchant_amount: topMerchantAmount,
      });
    }

    // Handle uncategorized transactions
    if (currentByCat.has('__uncategorized__')) {
      const currentData = currentByCat.get('__uncategorized__')!;
      const amount = await this.convertAndSum(
        currentData.amounts,
        targetCurrency,
      );
      const txCount = currentData.txCount;

      const prevAmounts = previousByCat.get('__uncategorized__');
      const previousAmount = prevAmounts
        ? await this.convertAndSum(prevAmounts, targetCurrency)
        : 0;

      let trendPercentage = 0;
      if (previousAmount > 0) {
        trendPercentage = this.round2(
          ((amount - previousAmount) / previousAmount) * 100,
        );
      }

      const topMerchant = topMerchantByCat.get('__uncategorized__');
      let topMerchantAmount: number | null = null;
      if (topMerchant) {
        topMerchantAmount = this.round2(
          await this.exchangeRateService.convert(
            topMerchant.amount,
            topMerchant.currency,
            targetCurrency,
          ),
        );
      }

      const percentage =
        grandTotal > 0 ? this.round2((amount / grandTotal) * 100) : 0;
      const avgTransaction = txCount > 0 ? this.round2(amount / txCount) : 0;

      result.push({
        category_id: null,
        name: 'Uncategorized',
        icon: 'more-horizontal',
        color: '#6B7280',
        is_default: false,
        amount: this.round2(amount),
        transaction_count: txCount,
        percentage,
        budget_limit: null,
        previous_amount: this.round2(previousAmount),
        trend_percentage: trendPercentage,
        avg_transaction: avgTransaction,
        top_merchant: topMerchant?.merchant ?? null,
        top_merchant_amount: topMerchantAmount,
      });
    }

    // Sort descending by amount
    result.sort((a, b) => b.amount - a.amount);

    return result;
  }

  // ---------------------------------------------------------------------------
  // getCategoryTrend
  // ---------------------------------------------------------------------------

  async getCategoryTrend(
    userId: string,
    categoryId: string,
    startDate?: string,
    endDate?: string,
    targetCurrency = 'MYR',
  ) {
    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new RpcException('Category not found');
    }

    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = this.startOfDay(new Date(startDate));
      end = this.endOfDay(new Date(endDate));
    } else {
      // Default: current month
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      end = this.endOfDay(now);
    }

    // Daily spending for the category
    const dailyRows = await this.prisma.$queryRaw<
      { day: Date; currency: string; amount: number }[]
    >`
      SELECT date::date as day, currency, SUM(amount::numeric) as amount
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND category_id = ${categoryId}::uuid
        AND date >= ${start}
        AND date <= ${end}
        AND status != 'rejected'
      GROUP BY date::date, currency
      ORDER BY day
    `;

    // Group daily rows by day
    const dayMap = new Map<string, CurrencyAmount[]>();
    for (const row of dailyRows) {
      const dayStr = new Date(row.day).toISOString().split('T')[0];
      if (!dayMap.has(dayStr)) {
        dayMap.set(dayStr, []);
      }
      dayMap.get(dayStr)!.push({
        currency: row.currency,
        amount: Number(row.amount),
      });
    }

    // Cap end date at today so we don't fill future dates with zeros
    const todayCap = this.endOfDay(now);
    if (end > todayCap) {
      end = todayCap;
    }

    // Build continuous data points
    const dataPoints: { date: string; amount: number }[] = [];
    let totalAmount = 0;
    let peakAmount = 0;
    let peakDay = '';
    let dayCount = 0;

    const cursor = new Date(start);
    while (cursor <= end) {
      const dayStr = cursor.toISOString().split('T')[0];
      const label = this.formatDateLabel(cursor);
      const amounts = dayMap.get(dayStr);

      let dayAmount = 0;
      if (amounts && amounts.length > 0) {
        dayAmount = await this.convertAndSum(amounts, targetCurrency);
      }

      dataPoints.push({
        date: label,
        amount: this.round2(dayAmount),
      });

      totalAmount += dayAmount;
      dayCount++;

      if (dayAmount > peakAmount) {
        peakAmount = dayAmount;
        peakDay = label;
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Recent 10 transactions for this category
    const recentTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        categoryId,
        date: { gte: start, lte: end },
        status: { not: 'rejected' },
      },
      orderBy: { date: 'desc' },
      take: 10,
      include: { category: true },
    });

    const avgDaily = dayCount > 0 ? this.round2(totalAmount / dayCount) : 0;

    return {
      category_id: category.id,
      name: category.name,
      color: category.color,
      data_points: dataPoints,
      recent_transactions: recentTransactions.map((tx) => ({
        id: tx.id,
        merchant: tx.merchant,
        amount: Number(tx.amount),
        currency: tx.currency,
        date: tx.date.toISOString(),
        description: tx.description,
      })),
      total_amount: this.round2(totalAmount),
      avg_daily: avgDaily,
      peak_day: peakDay || null,
      peak_amount: this.round2(peakAmount),
    };
  }

  // ---------------------------------------------------------------------------
  // getMerchantBreakdown
  // ---------------------------------------------------------------------------

  async getMerchantBreakdown(
    userId: string,
    startDate?: string,
    endDate?: string,
    limit = 15,
    targetCurrency = 'MYR',
  ) {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = this.startOfDay(new Date(startDate));
      end = this.endOfDay(new Date(endDate));
    } else {
      // Default: current month
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      end = this.endOfDay(now);
    }

    const rows = await this.prisma.$queryRaw<
      {
        merchant: string;
        currency: string;
        amount: number;
        tx_count: bigint;
        last_date: Date;
      }[]
    >`
      SELECT
        merchant,
        currency,
        SUM(amount::numeric) as amount,
        COUNT(id) as tx_count,
        MAX(date) as last_date
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${start}
        AND date <= ${end}
        AND status != 'rejected'
      GROUP BY merchant, currency
      ORDER BY merchant
    `;

    // Aggregate by merchant (across currencies)
    const merchantMap = new Map<
      string,
      {
        amounts: CurrencyAmount[];
        txCount: number;
        lastDate: Date;
      }
    >();

    for (const row of rows) {
      if (!merchantMap.has(row.merchant)) {
        merchantMap.set(row.merchant, {
          amounts: [],
          txCount: 0,
          lastDate: new Date(row.last_date),
        });
      }
      const entry = merchantMap.get(row.merchant)!;
      entry.amounts.push({
        currency: row.currency,
        amount: Number(row.amount),
      });
      entry.txCount += Number(row.tx_count);
      const rowDate = new Date(row.last_date);
      if (rowDate > entry.lastDate) {
        entry.lastDate = rowDate;
      }
    }

    // Convert and build result
    const result: {
      merchant: string;
      amount: number;
      transaction_count: number;
      avg_transaction: number;
      last_date: string;
    }[] = [];

    for (const [merchant, data] of merchantMap.entries()) {
      const amount = await this.convertAndSum(data.amounts, targetCurrency);
      const avgTransaction =
        data.txCount > 0 ? this.round2(amount / data.txCount) : 0;

      result.push({
        merchant,
        amount: this.round2(amount),
        transaction_count: data.txCount,
        avg_transaction: avgTransaction,
        last_date: data.lastDate.toISOString(),
      });
    }

    // Sort descending by amount, take top N
    result.sort((a, b) => b.amount - a.amount);
    return result.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // getMonthlySummary
  // ---------------------------------------------------------------------------

  async getMonthlySummary(
    userId: string,
    months = 6,
    targetCurrency = 'MYR',
  ) {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1),
    );
    const end = this.endOfDay(now);

    const rows = await this.prisma.$queryRaw<
      {
        month: Date;
        currency: string;
        amount: number;
        tx_count: bigint;
      }[]
    >`
      SELECT
        date_trunc('month', date) as month,
        currency,
        SUM(amount::numeric) as amount,
        COUNT(id) as tx_count
      FROM transactions
      WHERE user_id = ${userId}::uuid
        AND date >= ${start}
        AND date <= ${end}
        AND status != 'rejected'
      GROUP BY date_trunc('month', date), currency
      ORDER BY month
    `;

    // Group by month
    const monthMap = new Map<
      string,
      { date: Date; amounts: CurrencyAmount[]; txCount: number }
    >();

    for (const row of rows) {
      const monthDate = new Date(row.month);
      const monthKey = monthDate.toISOString().substring(0, 7); // "2026-01"

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { date: monthDate, amounts: [], txCount: 0 });
      }
      const entry = monthMap.get(monthKey)!;
      entry.amounts.push({
        currency: row.currency,
        amount: Number(row.amount),
      });
      entry.txCount += Number(row.tx_count);
    }

    // Build result array (fill missing months with zero)
    const result: {
      month: string;
      amount: number;
      transaction_count: number;
    }[] = [];

    const cursor = new Date(start);
    while (cursor <= end) {
      const monthKey = cursor.toISOString().substring(0, 7);
      const label = this.formatMonthLabel(cursor);

      const entry = monthMap.get(monthKey);
      let amount = 0;
      let txCount = 0;

      if (entry) {
        amount = await this.convertAndSum(entry.amounts, targetCurrency);
        txCount = entry.txCount;
      }

      result.push({
        month: label,
        amount: this.round2(amount),
        transaction_count: txCount,
      });

      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return result;
  }
}
