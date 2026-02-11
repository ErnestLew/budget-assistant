import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '@budget-assistant-api/prisma-client';
import {
  AI_PATTERNS,
  SYNC_PROGRESS_TTL,
  MAX_RECEIPT_FETCH,
  MAX_EMAIL_BODY_LENGTH,
  TransactionStatus,
} from '@budget-assistant-api/shared';
import { GmailService } from './gmail.service';

// ---------------------------------------------------------------------------
// Provider batch configuration (mirrors AI service PROVIDERS config)
// ---------------------------------------------------------------------------

const PROVIDER_CONFIG: Record<
  string,
  { batchSize: number; batchDelay: number }
> = {
  groq: { batchSize: 1, batchDelay: 3000 },
  gemini: { batchSize: 100, batchDelay: 0 },
};

// ---------------------------------------------------------------------------
// Helper: sleep
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// SyncService
// ---------------------------------------------------------------------------

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmailService: GmailService,
    @Inject('AI_SERVICE') private readonly aiClient: ClientProxy,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      ...(process.env.REDIS_PASSWORD && { tls: {} }),
    });
  }

  // -----------------------------------------------------------------------
  // Redis progress helpers
  // -----------------------------------------------------------------------

  private progressKey(userId: string): string {
    return `sync_progress:${userId}`;
  }

  private cancelKey(userId: string): string {
    return `sync_cancel:${userId}`;
  }

  async updateProgress(
    userId: string,
    data: Record<string, any>,
  ): Promise<void> {
    const key = this.progressKey(userId);
    const raw = await this.redis.get(key);
    const current = raw ? JSON.parse(raw) : {};
    Object.assign(current, data);
    await this.redis.setex(key, SYNC_PROGRESS_TTL, JSON.stringify(current));
  }

  async getProgress(userId: string): Promise<any> {
    const raw = await this.redis.get(this.progressKey(userId));
    return raw ? JSON.parse(raw) : {};
  }

  async isCancelled(userId: string): Promise<boolean> {
    return (await this.redis.exists(this.cancelKey(userId))) > 0;
  }

  async setCancelled(userId: string): Promise<void> {
    await this.redis.setex(this.cancelKey(userId), SYNC_PROGRESS_TTL, '1');
  }

  async clearCancelled(userId: string): Promise<void> {
    await this.redis.del(this.cancelKey(userId));
  }

  // -----------------------------------------------------------------------
  // startSync — RPC entry point: validates & fires background task
  // -----------------------------------------------------------------------

  async startSync(
    userId: string,
    startDate?: string,
    endDate?: string,
    model?: string,
  ): Promise<{ message: string }> {
    // Check if already running (allow restart if stale > 10 minutes)
    const existing = await this.getProgress(userId);
    if (
      existing &&
      existing.status === 'running' &&
      existing.step !== 'error' &&
      existing.step !== 'complete'
    ) {
      const startedAt = existing.started_at
        ? new Date(existing.started_at).getTime()
        : 0;
      const staleThreshold = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - startedAt < staleThreshold) {
        throw new RpcException('Sync already in progress');
      }
      this.logger.warn(
        `Stale sync detected for user ${userId} (started ${existing.started_at}). Allowing restart.`,
      );
    }

    // Get user from DB
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new RpcException('User not found');
    }
    if (!user.googleAccessToken) {
      throw new RpcException(
        'Gmail not connected — no Google access token found',
      );
    }

    // Read user's encrypted API keys for forwarding to AI service
    const encryptedApiKey =
      model === 'gemini' ? user.geminiApiKey : user.groqApiKey;

    // Clear any previous cancel flag
    await this.clearCancelled(userId);

    // Initialize progress
    await this.updateProgress(userId, {
      status: 'running',
      step: 'starting',
      message: 'Starting Gmail sync...',
      total_emails: 0,
      processed: 0,
      saved: 0,
      skipped: 0,
      failed: 0,
      duplicates_found: 0,
      started_at: new Date().toISOString(),
    });

    // Parse date options
    const afterDate = startDate ? new Date(startDate) : undefined;
    const beforeDate = endDate ? new Date(endDate) : undefined;
    const provider = model || 'groq';

    // Fire-and-forget background task
    setImmediate(() => {
      this.syncUserEmails(
        userId,
        user.googleAccessToken!,
        user.googleRefreshToken || undefined,
        afterDate,
        beforeDate,
        provider,
        encryptedApiKey || undefined,
      ).catch((err) => {
        this.logger.error(`Background sync failed for ${userId}: ${err}`);
        this.updateProgress(userId, {
          status: 'error',
          step: 'error',
          message: `Sync failed: ${err.message || err}`,
        }).catch(() => {});
      });
    });

    return { message: 'Sync started' };
  }

  // -----------------------------------------------------------------------
  // syncUserEmails — full background pipeline
  // -----------------------------------------------------------------------

  private async syncUserEmails(
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    afterDate: Date | undefined,
    beforeDate: Date | undefined,
    provider: string,
    encryptedApiKey?: string,
  ): Promise<void> {
    try {
      // ── Step 1: Fetch email headers for AI triage ─────────────────────
      await this.updateProgress(userId, {
        step: 'fetching_headers',
        message: 'Fetching email headers from Gmail...',
      });

      if (await this.isCancelled(userId)) return this.handleCancelled(userId);

      const headers = await this.gmailService.fetchEmailHeaders(
        accessToken,
        refreshToken,
        {
          maxResults: 200,
          afterDate,
          beforeDate,
        },
      );

      this.logger.log(`Fetched ${headers.length} email headers for triage`);

      if (headers.length === 0) {
        await this.updateProgress(userId, {
          status: 'complete',
          step: 'complete',
          message: 'No emails found in the specified date range.',
          total_emails: 0,
        });
        return;
      }

      await this.updateProgress(userId, {
        total_emails: headers.length,
        message: `Found ${headers.length} emails. Running AI triage...`,
      });

      // ── Step 2: AI triage — identify receipt emails ───────────────────
      await this.updateProgress(userId, {
        step: 'triaging',
        message: 'AI is identifying receipt emails...',
      });

      if (await this.isCancelled(userId)) return this.handleCancelled(userId);

      let receiptIndices: number[];
      try {
        receiptIndices = await firstValueFrom(
          this.aiClient.send(AI_PATTERNS.TRIAGE_EMAILS, {
            provider,
            encryptedApiKey,
            emailHeaders: headers.map((h: any) => ({
              subject: h.subject,
              from: h.from,
              date: h.date,
              snippet: h.snippet,
            })),
          }),
        );
      } catch (err) {
        this.logger.warn(`AI triage failed, falling back to keyword filter: ${err}`);
        // Fallback: use receipt keyword matching on subject line
        receiptIndices = headers
          .map((h: any, i: number) => ({ h, i }))
          .filter(({ h }) => {
            const subjectLower = (h.subject || '').toLowerCase();
            return [
              'receipt', 'order confirmation', 'payment confirmation',
              'invoice', 'transaction', 'payment', 'charge',
            ].some((kw) => subjectLower.includes(kw));
          })
          .map(({ i }) => i);
      }

      this.logger.log(
        `AI triage identified ${receiptIndices.length} potential receipts out of ${headers.length} emails`,
      );

      if (receiptIndices.length === 0) {
        await this.updateProgress(userId, {
          status: 'complete',
          step: 'complete',
          message: 'No receipt emails found after AI triage.',
          total_emails: headers.length,
        });
        return;
      }

      // Cap receipts to MAX_RECEIPT_FETCH
      const cappedIndices = receiptIndices.slice(0, MAX_RECEIPT_FETCH);

      await this.updateProgress(userId, {
        total_emails: cappedIndices.length,
        message: `Found ${cappedIndices.length} receipt emails. Fetching full content...`,
      });

      // ── Step 3: Filter already-processed emails ───────────────────────
      const receiptHeaders = cappedIndices.map((i: number) => headers[i]);
      const receiptEmailIds = receiptHeaders.map((h: any) => h.id as string);

      const existingTransactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          emailId: { in: receiptEmailIds },
        },
        select: { emailId: true },
      });

      const processedEmailIds = new Set(
        existingTransactions.map((t) => t.emailId),
      );
      const newHeaders = receiptHeaders.filter(
        (h: any) => !processedEmailIds.has(h.id),
      );

      const skipped = receiptHeaders.length - newHeaders.length;
      this.logger.log(
        `Skipping ${skipped} already-processed emails, ${newHeaders.length} new emails to process`,
      );

      await this.updateProgress(userId, {
        skipped,
        total_emails: newHeaders.length,
        message: `${newHeaders.length} new receipt emails to process (${skipped} already synced).`,
      });

      if (newHeaders.length === 0) {
        await this.updateProgress(userId, {
          status: 'complete',
          step: 'complete',
          message: `All ${skipped} receipt emails were already synced.`,
        });
        return;
      }

      // ── Step 4: Fetch full email content ──────────────────────────────
      await this.updateProgress(userId, {
        step: 'fetching_content',
        message: 'Fetching full email content...',
      });

      if (await this.isCancelled(userId)) return this.handleCancelled(userId);

      const emailContents: any[] = [];
      for (const header of newHeaders) {
        try {
          const content = await this.gmailService.getEmailById(
            accessToken,
            refreshToken,
            header.id,
          );
          if (content) {
            emailContents.push(content);
          }
        } catch (err) {
          this.logger.warn(
            `Error fetching email content for ${header.id}: ${err}`,
          );
        }
      }

      this.logger.log(`Fetched full content for ${emailContents.length} emails`);

      if (emailContents.length === 0) {
        await this.updateProgress(userId, {
          status: 'complete',
          step: 'complete',
          message: 'Could not fetch any email content.',
        });
        return;
      }

      // ── Step 5: Parse receipts with AI (batched) ──────────────────────
      await this.updateProgress(userId, {
        step: 'parsing',
        message: 'Parsing receipts with AI...',
        total_emails: emailContents.length,
        processed: 0,
      });

      const providerCfg = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.groq;
      const parsedReceipts: {
        receipt: any;
        emailContent: any;
      }[] = [];
      let processed = 0;
      let failed = 0;

      for (let i = 0; i < emailContents.length; i += providerCfg.batchSize) {
        if (await this.isCancelled(userId))
          return this.handleCancelled(userId);

        const batch = emailContents.slice(i, i + providerCfg.batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((email: any) =>
            firstValueFrom(
              this.aiClient.send(AI_PATTERNS.PARSE_RECEIPT, {
                provider,
                encryptedApiKey,
                emailContent: {
                  subject: email.subject,
                  from: email.from,
                  date: email.date,
                  body: email.body
                    ? email.body.slice(0, MAX_EMAIL_BODY_LENGTH)
                    : '',
                  snippet: email.snippet,
                },
              }),
            ),
          ),
        );

        for (let j = 0; j < batchResults.length; j++) {
          processed++;
          const result = batchResults[j];
          if (result.status === 'fulfilled' && result.value) {
            parsedReceipts.push({
              receipt: result.value,
              emailContent: batch[j],
            });
          } else {
            failed++;
            if (result.status === 'rejected') {
              this.logger.warn(
                `Failed to parse email "${batch[j].subject}": ${result.reason}`,
              );
            }
          }
        }

        await this.updateProgress(userId, {
          processed,
          failed,
          message: `Parsed ${processed}/${emailContents.length} emails...`,
        });

        // Rate-limit delay between batches
        if (
          providerCfg.batchDelay > 0 &&
          i + providerCfg.batchSize < emailContents.length
        ) {
          await sleep(providerCfg.batchDelay);
        }
      }

      this.logger.log(
        `Parsed ${parsedReceipts.length} receipts (${failed} failed) from ${emailContents.length} emails`,
      );

      if (parsedReceipts.length === 0) {
        await this.updateProgress(userId, {
          status: 'complete',
          step: 'complete',
          message: `Processed ${emailContents.length} emails but found no valid receipts.`,
          processed,
          failed,
        });
        return;
      }

      // ── Step 6: Detect duplicates with AI ─────────────────────────────
      await this.updateProgress(userId, {
        step: 'deduplicating',
        message: 'Detecting duplicate transactions...',
      });

      if (await this.isCancelled(userId)) return this.handleCancelled(userId);

      const transactionsForDedup = parsedReceipts.map((pr, idx) => ({
        index: idx,
        merchant: pr.receipt.merchant,
        amount: pr.receipt.amount,
        currency: pr.receipt.currency,
        date: pr.receipt.date,
        email_subject: pr.emailContent.subject || '',
      }));

      let duplicateGroups: {
        indices: number[];
        primary_index: number;
        reason: string;
      }[] = [];

      if (parsedReceipts.length >= 2) {
        try {
          duplicateGroups = await firstValueFrom(
            this.aiClient.send(AI_PATTERNS.DETECT_DUPLICATES, {
              provider,
              encryptedApiKey,
              transactions: transactionsForDedup,
            }),
          );
        } catch (err) {
          this.logger.warn(`Duplicate detection failed: ${err}`);
          duplicateGroups = [];
        }
      }

      this.logger.log(
        `Found ${duplicateGroups.length} duplicate group(s)`,
      );

      await this.updateProgress(userId, {
        duplicates_found: duplicateGroups.length,
        message: `Found ${duplicateGroups.length} potential duplicate group(s). Saving transactions...`,
      });

      // ── Step 7: Build dedup lookup ────────────────────────────────────
      // Map each parsed receipt index to its group info
      const indexToGroup = new Map<
        number,
        { groupId: string; isPrimary: boolean; reason: string }
      >();

      for (const group of duplicateGroups) {
        const groupId = randomUUID();
        for (const idx of group.indices) {
          indexToGroup.set(idx, {
            groupId,
            isPrimary: idx === group.primary_index,
            reason: group.reason,
          });
        }
      }

      // ── Step 8: Resolve categories ────────────────────────────────────
      await this.updateProgress(userId, {
        step: 'saving',
        message: 'Resolving categories and saving transactions...',
      });

      const categoryMap = await this.getDefaultCategoryMap();

      // ── Step 9: Save transactions to DB ───────────────────────────────
      let saved = 0;
      let saveFailed = 0;

      for (let i = 0; i < parsedReceipts.length; i++) {
        if (await this.isCancelled(userId))
          return this.handleCancelled(userId);

        const { receipt, emailContent } = parsedReceipts[i];
        const groupInfo = indexToGroup.get(i);

        try {
          // Resolve category ID from name
          const categoryName = (receipt.category || 'Other').toLowerCase();
          const categoryId = categoryMap.get(categoryName) || null;

          // Build raw_data with dedup info
          const rawData: Record<string, any> = {
            ai_provider: provider,
            original_subject: emailContent.subject,
            original_from: emailContent.from,
          };
          if (groupInfo) {
            rawData._dedup_reason = groupInfo.reason;
          }

          await this.prisma.transaction.create({
            data: {
              userId,
              merchant: receipt.merchant,
              amount: receipt.amount,
              currency: receipt.currency || 'MYR',
              date: new Date(receipt.date),
              description: receipt.description || null,
              categoryId,
              emailId: emailContent.id,
              emailSubject: emailContent.subject || null,
              status: TransactionStatus.PROCESSED,
              confidence: receipt.confidence || 0.5,
              rawData: rawData as any,
              duplicateGroupId: groupInfo?.groupId || null,
              isPrimary: groupInfo ? groupInfo.isPrimary : true,
            },
          });

          saved++;
        } catch (err: any) {
          saveFailed++;
          // Unique constraint on emailId means it was already processed
          if (err?.code === 'P2002') {
            this.logger.debug(
              `Skipping duplicate email_id ${emailContent.id}`,
            );
          } else {
            this.logger.warn(
              `Error saving transaction for email "${emailContent.subject}": ${err}`,
            );
          }
        }

        if (i % 5 === 0) {
          await this.updateProgress(userId, {
            saved,
            message: `Saved ${saved}/${parsedReceipts.length} transactions...`,
          });
        }
      }

      // ── Step 10: Update last_sync_at on user ──────────────────────────
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSyncAt: new Date() },
      });

      // ── Step 11: Final progress update ────────────────────────────────
      await this.updateProgress(userId, {
        status: 'complete',
        step: 'complete',
        message: `Sync complete! Saved ${saved} transactions (${skipped} already synced, ${failed + saveFailed} failed, ${duplicateGroups.length} duplicate groups).`,
        saved,
        failed: failed + saveFailed,
        processed: emailContents.length,
        completed_at: new Date().toISOString(),
      });

      this.logger.log(
        `Sync complete for user ${userId}: saved=${saved}, failed=${failed + saveFailed}, duplicates=${duplicateGroups.length}`,
      );
    } catch (err) {
      this.logger.error(`Sync error for user ${userId}: ${err}`);
      await this.updateProgress(userId, {
        status: 'error',
        step: 'error',
        message: `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // -----------------------------------------------------------------------
  // cancelSync
  // -----------------------------------------------------------------------

  async cancelSync(userId: string): Promise<{ message: string }> {
    await this.setCancelled(userId);
    return { message: 'Sync cancellation requested' };
  }

  // -----------------------------------------------------------------------
  // getSyncStatus
  // -----------------------------------------------------------------------

  async getSyncStatus(
    userId: string,
  ): Promise<{ last_sync_at: string | null; gmail_connected: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastSyncAt: true,
        googleAccessToken: true,
      },
    });

    if (!user) {
      throw new RpcException('User not found');
    }

    return {
      last_sync_at: user.lastSyncAt
        ? user.lastSyncAt.toISOString()
        : null,
      gmail_connected: !!user.googleAccessToken,
    };
  }

  // -----------------------------------------------------------------------
  // testGmail — test Gmail connectivity
  // -----------------------------------------------------------------------

  async testGmail(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new RpcException('User not found');
    }
    if (!user.googleAccessToken) {
      throw new RpcException('Gmail not connected');
    }

    try {
      const emails = await this.gmailService.fetchEmailsRaw(
        user.googleAccessToken,
        user.googleRefreshToken || undefined,
        10,
        this.buildTestQuery(startDate, endDate),
      );

      return {
        success: true,
        email_count: emails.length,
        emails: emails.map((e: any) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          date: e.date,
          snippet: e.snippet,
        })),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // -----------------------------------------------------------------------
  // testReceipts — fetch receipt emails without AI
  // -----------------------------------------------------------------------

  async testReceipts(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new RpcException('User not found');
    }
    if (!user.googleAccessToken) {
      throw new RpcException('Gmail not connected');
    }

    const afterDate = startDate ? new Date(startDate) : undefined;
    const beforeDate = endDate ? new Date(endDate) : undefined;

    try {
      const receipts = await this.gmailService.fetchReceipts(
        user.googleAccessToken,
        user.googleRefreshToken || undefined,
        {
          maxResults: 20,
          afterDate,
          beforeDate,
        },
      );

      return {
        success: true,
        receipt_count: receipts.length,
        receipts: receipts.map((r: any) => ({
          id: r.id,
          subject: r.subject,
          from: r.from,
          date: r.date,
          snippet: r.snippet,
          body_length: r.body ? r.body.length : 0,
        })),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async handleCancelled(userId: string): Promise<void> {
    await this.clearCancelled(userId);
    await this.updateProgress(userId, {
      status: 'cancelled',
      step: 'cancelled',
      message: 'Sync was cancelled by user.',
      completed_at: new Date().toISOString(),
    });
    this.logger.log(`Sync cancelled for user ${userId}`);
  }

  private async getDefaultCategoryMap(): Promise<Map<string, string>> {
    const defaults = await this.prisma.category.findMany({
      where: { isDefault: true },
    });
    const map = new Map<string, string>();
    for (const cat of defaults) {
      map.set(cat.name.toLowerCase(), cat.id);
    }
    return map;
  }

  private buildTestQuery(startDate?: string, endDate?: string): string {
    const parts: string[] = [];
    if (startDate) {
      const d = new Date(startDate);
      parts.push(
        `after:${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      );
    }
    if (endDate) {
      const d = new Date(endDate);
      parts.push(
        `before:${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      );
    }
    if (parts.length === 0) {
      parts.push('newer_than:7d');
    }
    return parts.join(' ');
  }
}
