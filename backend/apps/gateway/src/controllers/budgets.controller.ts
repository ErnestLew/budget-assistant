import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { CurrentUserId } from '../decorators/current-user.decorator';
import { normalizeQuery } from '../utils/normalize-query';

@Controller('budgets')
export class BudgetsController {
  constructor(
    @Inject('CORE_SERVICE') private coreClient: ClientProxy,
  ) {}

  @Get()
  async listBudgets(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.LIST_BUDGETS, { userId, ...normalizeQuery(query) }),
    );
  }

  // Static routes MUST be before /:id
  @Get('progress')
  async budgetProgress(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.BUDGET_PROGRESS, { userId, ...normalizeQuery(query) }),
    );
  }

  @Get('alerts')
  async listAlerts(@CurrentUserId() userId: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.LIST_ALERTS, { userId }),
    );
  }

  @Post()
  async createBudget(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.CREATE_BUDGET, { userId, data: body }),
    );
  }

  @Post('alerts')
  async createAlert(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.CREATE_ALERT, { userId, data: body }),
    );
  }

  // Dynamic routes AFTER static routes
  @Patch(':id')
  async updateBudget(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.UPDATE_BUDGET, { budgetId: id, data: body }),
    );
  }

  @Delete(':id')
  async deleteBudget(@CurrentUserId() userId: string, @Param('id') id: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.DELETE_BUDGET, { budgetId: id }),
    );
  }
}
