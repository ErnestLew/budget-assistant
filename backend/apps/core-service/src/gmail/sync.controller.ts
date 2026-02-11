import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { SyncService } from './sync.service';

@Controller()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @MessagePattern(CORE_PATTERNS.START_SYNC)
  async startSync(payload: {
    userId: string;
    start_date?: string;
    end_date?: string;
    model?: string;
  }) {
    return this.syncService.startSync(
      payload.userId,
      payload.start_date,
      payload.end_date,
      payload.model,
    );
  }

  @MessagePattern(CORE_PATTERNS.GET_PROGRESS)
  async getProgress(payload: { userId: string }) {
    const progress = await this.syncService.getProgress(payload.userId);
    if (!progress || Object.keys(progress).length === 0) {
      return { status: 'idle' };
    }
    return progress;
  }

  @MessagePattern(CORE_PATTERNS.CANCEL_SYNC)
  async cancelSync(payload: { userId: string }) {
    return this.syncService.cancelSync(payload.userId);
  }

  @MessagePattern(CORE_PATTERNS.TEST_GMAIL)
  async testGmail(payload: {
    userId: string;
    start_date?: string;
    end_date?: string;
  }) {
    return this.syncService.testGmail(
      payload.userId,
      payload.start_date,
      payload.end_date,
    );
  }

  @MessagePattern(CORE_PATTERNS.TEST_RECEIPTS)
  async testReceipts(payload: {
    userId: string;
    start_date?: string;
    end_date?: string;
  }) {
    return this.syncService.testReceipts(
      payload.userId,
      payload.start_date,
      payload.end_date,
    );
  }

  @MessagePattern(CORE_PATTERNS.SYNC_STATUS)
  async syncStatus(payload: { userId: string }) {
    return this.syncService.getSyncStatus(payload.userId);
  }
}
