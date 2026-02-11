import { Controller, Get, Param, Query, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { CurrentUserId } from '../decorators/current-user.decorator';
import { normalizeQuery } from '../utils/normalize-query';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject('CORE_SERVICE') private coreClient: ClientProxy,
  ) {}

  @Get('stats')
  async getStats(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_STATS, { userId, ...normalizeQuery(query) }),
    );
  }

  @Get('spending')
  async getSpending(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_SPENDING, { userId, ...normalizeQuery(query) }),
    );
  }

  @Get('categories')
  async getCategoriesBreakdown(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_CATEGORIES_BREAKDOWN, { userId, ...normalizeQuery(query) }),
    );
  }

  @Get('categories/detailed')
  async getCategoriesDetailed(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_CATEGORIES_DETAILED, { userId, ...normalizeQuery(query) }),
    );
  }

  @Get('categories/:id/trend')
  async getCategoryTrend(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query() query: any,
  ) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_CATEGORY_TREND, { userId, categoryId: id, ...normalizeQuery(query) }),
    );
  }

  @Get('merchants')
  async getMerchants(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_MERCHANTS, { userId, ...normalizeQuery(query) }),
    );
  }

  @Get('monthly-summary')
  async getMonthlySummary(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_MONTHLY_SUMMARY, { userId, ...normalizeQuery(query) }),
    );
  }
}
