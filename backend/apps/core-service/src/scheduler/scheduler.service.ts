import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@budget-assistant-api/prisma-client';
import { SyncService } from '../gmail/sync.service';
import { ExchangeRateService } from '../exchange-rates/exchange-rate.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Runs every hour. For each active user with Gmail connected,
   * checks if it's 8 AM in their local timezone and triggers a sync.
   */
  @Cron('0 * * * *')
  async syncAllUsers() {
    const now = new Date();

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        googleAccessToken: { not: null },
      },
      select: { id: true, timezone: true },
    });

    let triggered = 0;
    for (const user of users) {
      try {
        const userHour = parseInt(
          new Intl.DateTimeFormat('en-US', {
            timeZone: user.timezone,
            hour: 'numeric',
            hour12: false,
          }).format(now),
        );

        if (userHour !== 8) continue;

        await this.syncService.startSync(user.id);
        triggered++;
      } catch (err) {
        this.logger.error(
          `Failed to trigger sync for user ${user.id}: ${err}`,
        );
      }
    }

    if (triggered > 0) {
      this.logger.log(
        `Daily sync triggered for ${triggered}/${users.length} users`,
      );
    }
  }

  // Daily at midnight UTC — refresh exchange rates
  @Cron('0 0 * * *')
  async refreshExchangeRates() {
    this.logger.log('Starting daily exchange rate refresh...');
    try {
      await this.exchangeRateService.refreshRates();
      this.logger.log('Exchange rates refreshed successfully');
    } catch (err) {
      this.logger.error(`Exchange rate refresh failed: ${err}`);
    }
  }
}
