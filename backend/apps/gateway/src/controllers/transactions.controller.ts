import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import { firstValueFrom } from 'rxjs';
import { CORE_PATTERNS, RATE_LIMIT_MUTATIONS, RATE_LIMIT_BULK } from '@budget-assistant-api/shared';
import { CurrentUserId } from '../decorators/current-user.decorator';
import { normalizeQuery } from '../utils/normalize-query';

@Controller('transactions')
export class TransactionsController {
  constructor(
    @Inject('CORE_SERVICE') private coreClient: ClientProxy,
  ) {}

  @Get()
  async listTransactions(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.LIST_TRANSACTIONS, { userId, ...normalizeQuery(query) }),
    );
  }

  @Throttle({ default: RATE_LIMIT_MUTATIONS })
  @Post()
  async createTransaction(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.CREATE_TRANSACTION, { userId, data: body }),
    );
  }

  // Static routes MUST be before /:id
  @Get('with-duplicates')
  async withDuplicates(@CurrentUserId() userId: string, @Query() query: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.WITH_DUPLICATES, { userId, ...normalizeQuery(query) }),
    );
  }

  @Patch('resolve-duplicate')
  async resolveDuplicate(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.RESOLVE_DUPLICATE, {
        userId,
        groupId: body.group_id,
        keepId: body.keep_id,
      }),
    );
  }

  @Patch('dismiss-duplicate')
  async dismissDuplicate(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.DISMISS_DUPLICATE, {
        userId,
        groupId: body.group_id,
      }),
    );
  }

  @Throttle({ default: RATE_LIMIT_BULK })
  @Patch('bulk-status')
  async bulkStatus(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.BULK_STATUS, {
        userId,
        transactionIds: body.transaction_ids,
        status: body.status,
      }),
    );
  }

  // Dynamic routes AFTER static routes
  @Get(':id')
  async getTransaction(@CurrentUserId() userId: string, @Param('id') id: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_TRANSACTION, { transactionId: id }),
    );
  }

  @Patch(':id')
  async updateTransaction(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.UPDATE_TRANSACTION, { transactionId: id, data: body }),
    );
  }

  @Throttle({ default: RATE_LIMIT_MUTATIONS })
  @Delete(':id')
  async deleteTransaction(@CurrentUserId() userId: string, @Param('id') id: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.DELETE_TRANSACTION, { transactionId: id }),
    );
  }
}
