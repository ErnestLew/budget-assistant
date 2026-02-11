import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  extractJson,
  extractJsonArray,
  decrypt,
  MAX_EMAIL_BODY_LENGTH,
  MAX_TRANSACTION_AMOUNT,
  DEFAULT_CATEGORIES,
} from '@budget-assistant-api/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedReceipt {
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  description: string;
  confidence: number;
}

export interface DuplicateGroup {
  indices: number[];
  primary_index: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

const PROVIDERS: Record<
  string,
  {
    label: string;
    baseURL: string;
    apiKeyEnv: string;
    modelEnv: string;
    batchSize: number;
    batchDelay: number;
  }
> = {
  groq: {
    label: 'Groq (Free)',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    batchSize: 1,
    batchDelay: 3,
  },
  gemini: {
    label: 'Gemini (Paid)',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    batchSize: 100,
    batchDelay: 0,
  },
};

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseDelay = 5000,
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      const delay = Math.min(baseDelay * Math.pow(2, i), 30000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// ---------------------------------------------------------------------------
// Valid categories (derived from shared constants)
// ---------------------------------------------------------------------------

const VALID_CATEGORIES: string[] = DEFAULT_CATEGORIES.map((c) => c.name);

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const RECEIPT_SYSTEM_PROMPT = `You are a receipt/transaction parser for a Malaysian user. Given email content, extract transaction details.

You MUST return ONLY a valid JSON object with these fields:
- merchant: The name of the store/business (clean name, not codes)
- amount: The total amount paid (number only, no currency symbol)
- currency: The currency code (e.g., MYR, USD)
- date: The transaction date in ISO format (YYYY-MM-DD)
- category: One of: "Supermarket", "Food & Beverage", "Food Delivery", "Shopping", "Shopee", "Transport", "Bills & Utilities", "Subscriptions", "Entertainment", "Health", "Education", "Travel", "Other"
- description: A brief description of the purchase
- confidence: Your confidence in the extraction (0.0 to 1.0)

If this email is NOT a receipt/transaction (e.g. promotions, newsletters, investment statements, delivery notifications without payment, registration confirmations), return: {"merchant": null, "amount": null}

CATEGORY HINTS for Malaysian merchants:
- Jaya Grocer, Village Grocer, AEON, Tesco, Mydin, 99 Speedmart, Lotus's, Cold Storage = "Supermarket"
- Restaurants, cafes, mamak, Starbucks, McDonald's, KFC, Watsons (food section) = "Food & Beverage"
- GrabFood, foodpanda, ShopeeFood = "Food Delivery"
- Shopee (any Shopee purchase) = "Shopee"
- Lazada, Mr DIY, Uniqlo, H&M, IKEA, general retail = "Shopping"
- Grab (ride), TNG, Touch 'n Go, parking, petrol (Petronas, Shell, Petron), LRT, MRT = "Transport"
- TNB, TM, Unifi, Maxis, Digi, Celcom, water bill, Astro = "Bills & Utilities"
- Netflix, Spotify, iCloud, YouTube Premium, Adobe, Apple subscriptions = "Subscriptions"
- GSC, TGV, cinema, concerts, games = "Entertainment"
- Pharmacy, clinic, hospital, gym, Watsons (health products) = "Health"

IMPORTANT RULES:
- "Transaction Alert" from Standard Chartered = real purchase, extract it
- "Your Grab E-Receipt" = real purchase, extract it
- "Payment Confirmation" / "Payment Processed" = real purchase, extract it
- "Your payment has been confirmed" from Shopee = real purchase, extract it
- "Payment Success" from Fiuu = real purchase, extract it
- "out for delivery" / "has been delivered" from Shopee = NOT a purchase (delivery notification only), return null
- Investment/brokerage statements (Interactive Brokers, Moomoo) = NOT a purchase, return null
- Credit card e-statements = NOT individual purchases, return null
- Promotional emails, newsletters = NOT purchases, return null
- "Payment Overdue" reminders = NOT purchases unless it confirms a payment was made, return null
- Registration confirmations / auto-debit setup = NOT purchases, return null
- Order cancellations = NOT purchases, return null

Return ONLY the JSON object, no other text.

Example:
{"merchant": "Jaya Grocer", "amount": 45.60, "currency": "MYR", "date": "2026-01-20", "category": "Supermarket", "description": "Grocery shopping", "confidence": 0.95}`;

const TRIAGE_SYSTEM_PROMPT = `You are an email classifier for a Malaysian personal finance app. You will receive a numbered list of emails (subject line, sender, snippet).

Your job: identify which emails are receipts, transaction alerts, payment confirmations, invoices, or any other email that confirms a real monetary transaction/spending.

INCLUDE (return the index):
- Bank transaction alerts (Standard Chartered, Maybank, CIMB, RHB, HSBC, etc.)
- E-receipts from any merchant (Grab, Shopee, Lazada, food delivery, etc.)
- Payment confirmations (Fiuu, iPay88, online payments, etc.)
- Order confirmations that include a payment amount
- Utility bill payment confirmations (TNB, TM, water, etc.)
- Reload/top-up receipts (TNG, Touch 'n Go, prepaid, etc.)
- Cinema/entertainment ticket purchases
- Any email that confirms money was spent

EXCLUDE (do NOT return the index):
- Promotional emails, newsletters, marketing
- Delivery/shipping notifications (no payment info)
- Investment/brokerage statements or portfolio updates
- Job alerts, social media notifications
- Registration confirmations (no payment)
- Password reset, security alerts
- Subscription renewal REMINDERS (not actual charges)
- Order cancellations or refund notifications

Be INCLUSIVE — if an email MIGHT be a receipt, include it. False positives are OK (the parser will filter later). Missing a real receipt is worse.

Return ONLY a JSON array of indices of emails that are receipts/transactions.
Example: [0, 2, 5, 7]
If none found: []

Return ONLY the JSON array, no other text.`;

const DEDUP_SYSTEM_PROMPT = `You are a duplicate transaction detector for a personal finance app. You will receive a list of parsed transactions (each with an index, merchant, amount, currency, date, and email subject).

Your job: find groups of transactions that represent the SAME real-world purchase appearing in multiple emails.

Common duplicate patterns:
- Bank alert email + merchant receipt email for the same purchase (e.g. Standard Chartered "Transaction Alert" for "TNG-EWALLET" + Touch 'n Go "Reload Invoice" — same reload)
- Payment gateway confirmation + merchant confirmation (e.g. Fiuu payment success + merchant order confirmation)
- Multiple alerts from different banks/cards for one purchase

Rules:
- ONLY group transactions that are clearly the same real-world purchase (same amount, same or very close date, related merchants)
- Different amounts = NEVER duplicates (even if same merchant and date)
- Same merchant + same amount + same date but from different emails = likely duplicates
- Be CONSERVATIVE: if unsure, do NOT group them. False negatives are better than false positives.
- For each group, pick the "primary" transaction — prefer the merchant receipt over a bank alert, or the one with more detail.

Return ONLY a valid JSON array. Each element:
{"indices": [0, 3], "primary_index": 3, "reason": "Same MYR 101.00 TNG eWallet reload on 2026-02-01"}

If no duplicates found, return: []

Return ONLY the JSON array, no other text.`;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;
  private model = '';
  private provider = 'none';
  public batchSize = 1;
  public batchDelay = 0;

  /**
   * Initialise (or re-initialise) the OpenAI client for the given provider.
   * Falls back to any provider that has an API key configured.
   */
  init(providerKey: string = 'groq', encryptedApiKey?: string | null) {
    const cfg = PROVIDERS[providerKey];
    if (!cfg) throw new Error(`Unknown provider: ${providerKey}`);

    let apiKey = '';
    let usedCfg = cfg;
    let usedProvider = providerKey;

    // Priority 1: User-provided encrypted key
    if (encryptedApiKey) {
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (encryptionKey) {
        try {
          apiKey = decrypt(encryptedApiKey, encryptionKey);
        } catch (err) {
          this.logger.warn(`Failed to decrypt user API key for ${providerKey}: ${err}`);
        }
      }
    }

    // Priority 2: Environment variable for requested provider
    if (!apiKey) {
      apiKey = process.env[cfg.apiKeyEnv] || '';
    }

    // Priority 3: Fallback to any provider with an env key
    if (!apiKey) {
      for (const [key, fallbackCfg] of Object.entries(PROVIDERS)) {
        const fbKey = process.env[fallbackCfg.apiKeyEnv] || '';
        if (fbKey) {
          apiKey = fbKey;
          usedCfg = fallbackCfg;
          usedProvider = key;
          break;
        }
      }
    }

    if (apiKey) {
      this.client = new OpenAI({ baseURL: usedCfg.baseURL, apiKey });
      this.model = process.env[usedCfg.modelEnv] || '';
      this.provider = usedProvider;
      this.batchSize = usedCfg.batchSize;
      this.batchDelay = usedCfg.batchDelay;
      this.logger.log(
        `Initialised provider "${usedProvider}" with model "${this.model}"`,
      );
    } else {
      this.client = null;
      this.provider = 'none';
      this.logger.warn('No AI provider API key found');
    }
  }

  // -----------------------------------------------------------------------
  // Low-level chat helper
  // -----------------------------------------------------------------------

  private async chat(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!this.client || !this.model) {
      throw new Error('AI client not initialised — no API key configured');
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from AI provider');
    }
    return content;
  }

  // -----------------------------------------------------------------------
  // parseReceipt
  // -----------------------------------------------------------------------

  async parseReceipt(emailContent: {
    subject?: string;
    from?: string;
    date?: string;
    body?: string;
    snippet?: string;
  }): Promise<ParsedReceipt | null> {
    const parts: string[] = [];
    if (emailContent.subject) parts.push(`Subject: ${emailContent.subject}`);
    if (emailContent.from) parts.push(`From: ${emailContent.from}`);
    if (emailContent.date) parts.push(`Date: ${emailContent.date}`);

    let body = emailContent.body || emailContent.snippet || '';
    if (body.length > MAX_EMAIL_BODY_LENGTH) {
      body = body.slice(0, MAX_EMAIL_BODY_LENGTH);
    }
    if (body) parts.push(`\nBody:\n${body}`);

    const userPrompt = parts.join('\n');

    const rawResponse = await withRetry(() =>
      this.chat(RECEIPT_SYSTEM_PROMPT, userPrompt),
    );

    const parsed = extractJson(rawResponse);
    if (!parsed) {
      this.logger.warn('Could not extract JSON from AI response');
      return null;
    }

    // Null-merchant means "not a receipt"
    if (parsed.merchant === null || parsed.merchant === undefined) {
      return null;
    }

    // Validate merchant
    if (typeof parsed.merchant !== 'string' || parsed.merchant.trim() === '') {
      this.logger.warn(`Invalid merchant: ${parsed.merchant}`);
      return null;
    }

    // Validate amount
    const amount = Number(parsed.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= MAX_TRANSACTION_AMOUNT) {
      this.logger.warn(`Invalid amount: ${parsed.amount}`);
      return null;
    }

    // Validate currency (3 uppercase letters, default MYR)
    let currency = String(parsed.currency || 'MYR').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      currency = 'MYR';
    }

    // Validate date (ISO format YYYY-MM-DD)
    let date = String(parsed.date || '');
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) {
      // Try to use the email date or today's date
      date = emailContent.date
        ? new Date(emailContent.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
    } else {
      // Normalise to YYYY-MM-DD (strip any time component)
      date = date.slice(0, 10);
    }

    // Validate category
    let category = String(parsed.category || 'Other');
    if (!VALID_CATEGORIES.includes(category)) {
      category = 'Other';
    }

    // Confidence
    let confidence = Number(parsed.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      confidence = 0.5;
    }

    return {
      merchant: String(parsed.merchant).trim(),
      amount,
      currency,
      date,
      category,
      description: String(parsed.description || ''),
      confidence,
    };
  }

  // -----------------------------------------------------------------------
  // triageEmails
  // -----------------------------------------------------------------------

  async triageEmails(
    emailHeaders: {
      subject: string;
      from: string;
      date?: string;
      snippet: string;
    }[],
  ): Promise<number[]> {
    if (emailHeaders.length === 0) return [];

    const lines = emailHeaders.map(
      (h, i) =>
        `[${i}] Subject: ${h.subject}\n    From: ${h.from}\n    Snippet: ${h.snippet}`,
    );
    const userPrompt = lines.join('\n\n');

    const rawResponse = await withRetry(() =>
      this.chat(TRIAGE_SYSTEM_PROMPT, userPrompt),
    );

    const parsed = extractJsonArray(rawResponse);
    if (!parsed) {
      this.logger.warn('Could not extract JSON array from triage response');
      return [];
    }

    // Validate: keep only valid integer indices within range
    const maxIndex = emailHeaders.length - 1;
    const indices = parsed
      .filter(
        (v): v is number =>
          typeof v === 'number' &&
          Number.isInteger(v) &&
          v >= 0 &&
          v <= maxIndex,
      );

    return indices;
  }

  // -----------------------------------------------------------------------
  // detectDuplicates
  // -----------------------------------------------------------------------

  async detectDuplicates(
    transactions: {
      index: number;
      merchant: string;
      amount: number;
      currency: string;
      date: string;
      email_subject: string;
    }[],
  ): Promise<DuplicateGroup[]> {
    if (transactions.length < 2) return [];

    const lines = transactions.map(
      (t) =>
        `[${t.index}] ${t.merchant} | ${t.currency} ${t.amount} | ${t.date} | Subject: "${t.email_subject}"`,
    );
    const userPrompt = lines.join('\n');

    const rawResponse = await withRetry(() =>
      this.chat(DEDUP_SYSTEM_PROMPT, userPrompt),
    );

    const parsed = extractJsonArray(rawResponse);
    if (!parsed) {
      this.logger.warn(
        'Could not extract JSON array from dedup response',
      );
      return [];
    }

    // Validate structure
    const validIndices = new Set(transactions.map((t) => t.index));
    const groups: DuplicateGroup[] = [];

    for (const item of parsed) {
      if (
        typeof item !== 'object' ||
        item === null ||
        !Array.isArray((item as Record<string, unknown>).indices)
      ) {
        continue;
      }

      const raw = item as Record<string, unknown>;
      const indices = (raw.indices as unknown[]).filter(
        (v): v is number =>
          typeof v === 'number' && validIndices.has(v),
      );

      if (indices.length < 2) continue;

      let primaryIndex = Number(raw.primary_index);
      if (!indices.includes(primaryIndex)) {
        primaryIndex = indices[0];
      }

      groups.push({
        indices,
        primary_index: primaryIndex,
        reason: String(raw.reason || ''),
      });
    }

    return groups;
  }

  // -----------------------------------------------------------------------
  // categorizeTransaction
  // -----------------------------------------------------------------------

  async categorizeTransaction(
    merchant: string,
    description?: string,
  ): Promise<string> {
    const categoryList = VALID_CATEGORIES.join(', ');
    const systemPrompt = `You are a transaction categoriser for a Malaysian personal finance app. Given a merchant name and optional description, return the most appropriate category.

Valid categories: ${categoryList}

Return ONLY the category name, no other text.`;

    let userPrompt = `Merchant: ${merchant}`;
    if (description) {
      userPrompt += `\nDescription: ${description}`;
    }

    const rawResponse = await withRetry(() =>
      this.chat(systemPrompt, userPrompt),
    );

    const category = rawResponse.trim();
    if (VALID_CATEGORIES.includes(category)) {
      return category;
    }

    // Try to fuzzy-match: check if any valid category is contained
    const lower = category.toLowerCase();
    const match = VALID_CATEGORIES.find(
      (c) => lower.includes(c.toLowerCase()),
    );
    return match || 'Other';
  }

  // -----------------------------------------------------------------------
  // getAvailableProviders
  // -----------------------------------------------------------------------

  getAvailableProviders(
    userHasGroqKey?: boolean,
    userHasGeminiKey?: boolean,
  ): { id: string; label: string; source: string }[] {
    const available: { id: string; label: string; source: string }[] = [];
    for (const [id, cfg] of Object.entries(PROVIDERS)) {
      const hasUserKey = id === 'groq' ? userHasGroqKey : userHasGeminiKey;
      const hasEnvKey = !!process.env[cfg.apiKeyEnv];

      if (hasUserKey) {
        available.push({ id, label: cfg.label, source: 'user' });
      } else if (hasEnvKey) {
        available.push({ id, label: cfg.label, source: 'server' });
      }
    }
    return available;
  }
}
