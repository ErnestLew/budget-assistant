import { Injectable, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { PrismaService } from '@budget-assistant-api/prisma-client';
import { EVENTS } from '@budget-assistant-api/shared';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern(EVENTS.BUDGET_THRESHOLD_EXCEEDED)
  async handleBudgetThresholdExceeded(data: {
    alertId: string;
    budgetId: string;
    userId: string;
    threshold: number;
    currentSpend: number;
    budgetAmount: number;
  }) {
    this.logger.log(
      `Budget threshold exceeded: alert=${data.alertId}, budget=${data.budgetId}, ` +
        `user=${data.userId}, threshold=${data.threshold}%, ` +
        `spend=${data.currentSpend}/${data.budgetAmount}`,
    );

    try {
      await this.prisma.budgetAlert.update({
        where: { id: data.alertId },
        data: {
          isTriggered: true,
          triggeredAt: new Date(),
        },
      });

      this.logger.log(
        `Budget alert ${data.alertId} marked as triggered`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to update budget alert ${data.alertId}: ${err}`,
      );
    }

    // TODO: Send email/push notification
  }

  @EventPattern(EVENTS.SYNC_COMPLETED)
  async handleSyncCompleted(data: {
    userId: string;
    transactionCount: number;
    duplicateGroups: number;
    failed: number;
  }) {
    this.logger.log(
      `Sync completed: user=${data.userId}, ` +
        `transactions=${data.transactionCount}, ` +
        `duplicateGroups=${data.duplicateGroups}, ` +
        `failed=${data.failed}`,
    );

    // TODO: Send email/push notification
  }

  @EventPattern(EVENTS.TRANSACTION_CREATED)
  async handleTransactionCreated(data: {
    transactionId: string;
    userId: string;
    merchant: string;
    amount: number;
    currency: string;
  }) {
    this.logger.log(
      `Transaction created: id=${data.transactionId}, ` +
        `user=${data.userId}, ` +
        `merchant=${data.merchant}, ` +
        `amount=${data.amount} ${data.currency}`,
    );

    // TODO: Send email/push notification
  }
}
