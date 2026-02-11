import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HealthController } from './controllers/health.controller';
import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { CategoriesController } from './controllers/categories.controller';
import { BudgetsController } from './controllers/budgets.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { SyncController } from './controllers/sync.controller';
import { ExchangeRatesController } from './controllers/exchange-rates.controller';

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  ...(process.env.REDIS_PASSWORD && { tls: {} }),
};

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.REDIS,
        options: redisOptions,
      },
      {
        name: 'CORE_SERVICE',
        transport: Transport.REDIS,
        options: redisOptions,
      },
      {
        name: 'AI_SERVICE',
        transport: Transport.REDIS,
        options: redisOptions,
      },
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.REDIS,
        options: redisOptions,
      },
    ]),
  ],
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    TransactionsController,
    CategoriesController,
    BudgetsController,
    AnalyticsController,
    SyncController,
    ExchangeRatesController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
