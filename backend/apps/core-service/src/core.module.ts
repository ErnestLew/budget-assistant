import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@budget-assistant-api/prisma-client';
import { CoreController } from './core.controller';
import { TransactionService } from './transactions/transaction.service';
import { CategoryService } from './categories/category.service';
import { BudgetService } from './budgets/budget.service';
import { ExchangeRateService } from './exchange-rates/exchange-rate.service';
import { ExchangeRatesController } from './exchange-rates/exchange-rates.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { GmailService } from './gmail/gmail.service';
import { SyncService } from './gmail/sync.service';
import { SyncController } from './gmail/sync.controller';
import { SchedulerService } from './scheduler/scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    ClientsModule.register([
      {
        name: 'AI_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
          ...(process.env.REDIS_PASSWORD && { tls: {} }),
        },
      },
    ]),
  ],
  controllers: [
    CoreController,
    ExchangeRatesController,
    AnalyticsController,
    SyncController,
  ],
  providers: [
    TransactionService,
    CategoryService,
    BudgetService,
    ExchangeRateService,
    AnalyticsService,
    GmailService,
    SyncService,
    SchedulerService,
  ],
})
export class CoreModule {}
