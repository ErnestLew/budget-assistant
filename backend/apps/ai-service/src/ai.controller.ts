import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AI_PATTERNS } from '@budget-assistant-api/shared';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @MessagePattern(AI_PATTERNS.PARSE_RECEIPT)
  async parseReceipt(payload: {
    provider?: string;
    encryptedApiKey?: string | null;
    emailContent: {
      subject?: string;
      from?: string;
      date?: string;
      body?: string;
      snippet?: string;
    };
  }) {
    this.aiService.init(payload.provider || 'groq', payload.encryptedApiKey);
    return this.aiService.parseReceipt(payload.emailContent);
  }

  @MessagePattern(AI_PATTERNS.TRIAGE_EMAILS)
  async triageEmails(payload: {
    provider?: string;
    encryptedApiKey?: string | null;
    emailHeaders: { subject: string; from: string; date?: string; snippet: string }[];
  }) {
    this.aiService.init(payload.provider || 'groq', payload.encryptedApiKey);
    return this.aiService.triageEmails(payload.emailHeaders);
  }

  @MessagePattern(AI_PATTERNS.DETECT_DUPLICATES)
  async detectDuplicates(payload: {
    provider?: string;
    encryptedApiKey?: string | null;
    transactions: {
      index: number;
      merchant: string;
      amount: number;
      currency: string;
      date: string;
      email_subject: string;
    }[];
  }) {
    this.aiService.init(payload.provider || 'groq', payload.encryptedApiKey);
    return this.aiService.detectDuplicates(payload.transactions);
  }

  @MessagePattern(AI_PATTERNS.CATEGORIZE)
  async categorize(payload: {
    provider?: string;
    encryptedApiKey?: string | null;
    merchant: string;
    description?: string;
  }) {
    this.aiService.init(payload.provider || 'groq', payload.encryptedApiKey);
    return this.aiService.categorizeTransaction(
      payload.merchant,
      payload.description,
    );
  }

  @MessagePattern(AI_PATTERNS.GET_PROVIDERS)
  async getProviders(payload: {
    userHasGroqKey?: boolean;
    userHasGeminiKey?: boolean;
  }) {
    return this.aiService.getAvailableProviders(
      payload.userHasGroqKey,
      payload.userHasGeminiKey,
    );
  }
}
