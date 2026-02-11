import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @MessagePattern(CORE_PATTERNS.GET_STATS)
  async getStats(payload: {
    userId: string;
    startDate?: string;
    endDate?: string;
    targetCurrency?: string;
  }) {
    return this.analyticsService.getStats(
      payload.userId,
      payload.startDate,
      payload.endDate,
      payload.targetCurrency,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_SPENDING)
  async getSpending(payload: {
    userId: string;
    days?: number;
    startDate?: string;
    endDate?: string;
    targetCurrency?: string;
  }) {
    return this.analyticsService.getSpendingOverTime(
      payload.userId,
      payload.days,
      payload.startDate,
      payload.endDate,
      payload.targetCurrency,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_CATEGORIES_BREAKDOWN)
  async getCategoriesBreakdown(payload: {
    userId: string;
    days?: number;
    startDate?: string;
    endDate?: string;
    targetCurrency?: string;
  }) {
    return this.analyticsService.getCategoryBreakdown(
      payload.userId,
      payload.days,
      payload.startDate,
      payload.endDate,
      payload.targetCurrency,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_CATEGORIES_DETAILED)
  async getCategoriesDetailed(payload: {
    userId: string;
    startDate?: string;
    endDate?: string;
    targetCurrency?: string;
  }) {
    return this.analyticsService.getDetailedCategoryBreakdown(
      payload.userId,
      payload.startDate,
      payload.endDate,
      payload.targetCurrency,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_CATEGORY_TREND)
  async getCategoryTrend(payload: {
    userId: string;
    categoryId: string;
    startDate?: string;
    endDate?: string;
    targetCurrency?: string;
  }) {
    return this.analyticsService.getCategoryTrend(
      payload.userId,
      payload.categoryId,
      payload.startDate,
      payload.endDate,
      payload.targetCurrency,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_MERCHANTS)
  async getMerchants(payload: {
    userId: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    targetCurrency?: string;
  }) {
    return this.analyticsService.getMerchantBreakdown(
      payload.userId,
      payload.startDate,
      payload.endDate,
      payload.limit,
      payload.targetCurrency,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_MONTHLY_SUMMARY)
  async getMonthlySummary(payload: {
    userId: string;
    months?: number;
    targetCurrency?: string;
  }) {
    return this.analyticsService.getMonthlySummary(
      payload.userId,
      payload.months,
      payload.targetCurrency,
    );
  }
}
