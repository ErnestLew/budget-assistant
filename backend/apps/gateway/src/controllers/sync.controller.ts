import { Controller, Get, Post, Query, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import { firstValueFrom } from 'rxjs';
import {
  AI_PATTERNS,
  AUTH_PATTERNS,
  CORE_PATTERNS,
  RATE_LIMIT_SYNC,
  RATE_LIMIT_AUTH,
} from '@budget-assistant-api/shared';
import { CurrentUserId } from '../decorators/current-user.decorator';
import { normalizeQuery } from '../utils/normalize-query';

@Controller('sync')
export class SyncController {
  constructor(
    @Inject('CORE_SERVICE') private coreClient: ClientProxy,
    @Inject('AI_SERVICE') private aiClient: ClientProxy,
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}

  @Get('providers')
  async getProviders(@CurrentUserId() userId: string) {
    const keyStatus = await firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.GET_API_KEYS, { userId }),
    );
    return firstValueFrom(
      this.aiClient.send(AI_PATTERNS.GET_PROVIDERS, {
        userHasGroqKey: keyStatus.groq.configured,
        userHasGeminiKey: keyStatus.gemini.configured,
      }),
    );
  }

  @Get('status')
  async syncStatus(@CurrentUserId() userId: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.SYNC_STATUS, { userId }),
    );
  }

  @Get('progress')
  async getProgress(@CurrentUserId() userId: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_PROGRESS, { userId }),
    );
  }

  @Throttle({ default: RATE_LIMIT_SYNC })
  @Post('gmail')
  async startSync(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.START_SYNC, { userId, ...normalizeQuery(query) }),
    );
  }

  @Post('cancel')
  async cancelSync(@CurrentUserId() userId: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.CANCEL_SYNC, { userId }),
    );
  }

  @Throttle({ default: RATE_LIMIT_AUTH })
  @Get('gmail/test')
  async testGmail(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.TEST_GMAIL, { userId, ...normalizeQuery(query) }),
    );
  }

  @Throttle({ default: RATE_LIMIT_AUTH })
  @Get('gmail/receipts')
  async testReceipts(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.TEST_RECEIPTS, { userId, ...normalizeQuery(query) }),
    );
  }
}
