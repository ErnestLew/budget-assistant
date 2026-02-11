import { Injectable, Logger } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const RECEIPT_KEYWORDS = [
  'receipt',
  'order confirmation',
  'payment confirmation',
  'invoice',
  'purchase',
  'transaction',
  'your order',
  'statement',
  'payment',
  'charge',
  'debit',
  'credit card',
  'transaction alert',
  'spending',
  'e-statement',
];

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  private createAuth(
    accessToken: string,
    refreshToken?: string,
  ): OAuth2Client {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    });
    return client;
  }

  private createGmailClient(auth: OAuth2Client): gmail_v1.Gmail {
    return google.gmail({ version: 'v1', auth });
  }

  buildReceiptQuery(afterDate?: Date, beforeDate?: Date): string {
    const queries: string[] = [];
    const keywordQuery = RECEIPT_KEYWORDS.map(
      (kw) => `subject:"${kw}"`,
    ).join(' OR ');
    queries.push(`(${keywordQuery})`);
    if (afterDate) queries.push(`after:${this.formatDate(afterDate)}`);
    if (beforeDate) queries.push(`before:${this.formatDate(beforeDate)}`);
    queries.push('-in:spam -in:trash');
    return queries.join(' ');
  }

  private formatDate(d: Date): string {
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  async fetchReceipts(
    accessToken: string,
    refreshToken: string | undefined,
    options: {
      maxResults?: number;
      afterDate?: Date;
      beforeDate?: Date;
    },
  ): Promise<any[]> {
    const auth = this.createAuth(accessToken, refreshToken);
    const gmail = this.createGmailClient(auth);
    const query = this.buildReceiptQuery(
      options.afterDate,
      options.beforeDate,
    );

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: options.maxResults || 100,
    });

    const messages = res.data.messages || [];
    const results: any[] = [];

    for (const msg of messages) {
      const content = await this.getEmailContent(gmail, msg.id!);
      if (content) results.push(content);
    }
    return results;
  }

  async fetchEmailHeaders(
    accessToken: string,
    refreshToken: string | undefined,
    options: {
      maxResults?: number;
      afterDate?: Date;
      beforeDate?: Date;
    },
  ): Promise<any[]> {
    const auth = this.createAuth(accessToken, refreshToken);
    const gmail = this.createGmailClient(auth);

    const queries: string[] = [];
    if (options.afterDate)
      queries.push(`after:${this.formatDate(options.afterDate)}`);
    if (options.beforeDate)
      queries.push(`before:${this.formatDate(options.beforeDate)}`);
    queries.push('-in:spam -in:trash');
    const q = queries.join(' ');

    // Paginate to collect message IDs
    const allIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q,
        maxResults: Math.min(
          (options.maxResults || 200) - allIds.length,
          500,
        ),
        pageToken,
      });
      const msgs = res.data.messages || [];
      allIds.push(...msgs.map((m) => m.id!));
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken && allIds.length < (options.maxResults || 200));

    // Fetch metadata only
    const headers: any[] = [];
    for (const id of allIds) {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        const hdrs: Record<string, string> = {};
        for (const h of msg.data.payload?.headers || []) {
          hdrs[h.name!] = h.value!;
        }
        headers.push({
          id,
          subject: hdrs['Subject'] || '',
          from: hdrs['From'] || '',
          date: hdrs['Date'] || '',
          snippet: msg.data.snippet || '',
        });
      } catch (err) {
        this.logger.warn(`Error fetching headers for ${id}: ${err}`);
      }
    }
    return headers;
  }

  async fetchEmailsRaw(
    accessToken: string,
    refreshToken: string | undefined,
    maxResults = 10,
    query?: string,
  ): Promise<any[]> {
    const auth = this.createAuth(accessToken, refreshToken);
    const gmail = this.createGmailClient(auth);
    const q = query || 'newer_than:7d';

    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults,
    });
    const messages = res.data.messages || [];
    const results: any[] = [];
    for (const msg of messages) {
      const content = await this.getEmailContent(gmail, msg.id!);
      if (content) results.push(content);
    }
    return results;
  }

  async getEmailById(
    accessToken: string,
    refreshToken: string | undefined,
    messageId: string,
  ): Promise<any | null> {
    const auth = this.createAuth(accessToken, refreshToken);
    const gmail = this.createGmailClient(auth);
    return this.getEmailContent(gmail, messageId);
  }

  private async getEmailContent(
    gmail: gmail_v1.Gmail,
    messageId: string,
  ): Promise<any | null> {
    try {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      const payload = msg.data.payload;
      const headers = payload?.headers || [];

      const subject =
        headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
      const from =
        headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
      const date =
        headers.find((h) => h.name?.toLowerCase() === 'date')?.value || '';

      const body = this.extractBody(payload);

      return {
        id: messageId,
        subject,
        from,
        date,
        body,
        snippet: msg.data.snippet || '',
      };
    } catch (err) {
      this.logger.warn(`Error fetching message ${messageId}: ${err}`);
      return null;
    }
  }

  private extractBody(payload: any): string {
    const textParts: string[] = [];
    const htmlParts: string[] = [];
    this.walkParts(payload, textParts, htmlParts);

    // Prefer plain text if substantial (>500 chars)
    if (textParts.length > 0 && textParts[0].length > 500) {
      return textParts[0];
    }
    if (htmlParts.length > 0) {
      let html = htmlParts[0];
      html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
      html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
      html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ');
      html = html.replace(/<[^>]+>/g, ' ');
      html = html
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      html = html.replace(/&#\d+;/g, ' ');
      html = html.replace(/\s+/g, ' ').trim();
      return html;
    }
    if (textParts.length > 0) return textParts[0];
    return '';
  }

  private walkParts(
    part: any,
    textOut: string[],
    htmlOut: string[],
  ): void {
    const mime = part?.mimeType || '';
    if (mime === 'text/plain' && textOut.length === 0) {
      const data = part?.body?.data;
      if (data)
        textOut.push(Buffer.from(data, 'base64url').toString('utf-8'));
    } else if (mime === 'text/html' && htmlOut.length === 0) {
      const data = part?.body?.data;
      if (data)
        htmlOut.push(Buffer.from(data, 'base64url').toString('utf-8'));
    } else if (part?.parts) {
      for (const sub of part.parts) {
        this.walkParts(sub, textOut, htmlOut);
      }
    }
  }
}
