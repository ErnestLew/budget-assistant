import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import {
  EXCHANGE_RATE_CACHE_KEY,
  EXCHANGE_RATE_CACHE_TTL,
  CURRENCY_INFO,
  SUPPORTED_CURRENCIES,
} from '@budget-assistant-api/shared';

type RateMatrix = Record<string, Record<string, number>>;

@Injectable()
export class ExchangeRateService implements OnModuleDestroy {
  private readonly logger = new Logger(ExchangeRateService.name);
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      ...(process.env.REDIS_PASSWORD && { tls: {} }),
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Fetch latest rates from the Frankfurter API (EUR base)
   * and build a full cross-rate matrix for all supported currencies.
   */
  async fetchRatesFromApi(): Promise<RateMatrix> {
    const currencies = SUPPORTED_CURRENCIES.filter((c) => c !== 'EUR').join(
      ',',
    );
    const url = `https://api.frankfurter.app/latest?from=EUR&to=${currencies}`;

    this.logger.log(`Fetching exchange rates from Frankfurter API`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Frankfurter API returned ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { rates: Record<string, number> };
    const eurRates: Record<string, number> = { EUR: 1.0, ...data.rates };

    // Build cross-rate matrix:
    // For each base currency, compute rate to every other currency
    // rate(base -> target) = eurRates[target] / eurRates[base]
    const matrix: RateMatrix = {};

    for (const base of SUPPORTED_CURRENCIES) {
      matrix[base] = {};
      for (const target of SUPPORTED_CURRENCIES) {
        if (base === target) {
          matrix[base][target] = 1.0;
        } else {
          const baseRate = eurRates[base];
          const targetRate = eurRates[target];
          if (baseRate && targetRate) {
            matrix[base][target] = targetRate / baseRate;
          }
        }
      }
    }

    return matrix;
  }

  /**
   * Cache the rate matrix to Redis with the configured TTL.
   */
  async cacheRates(rates: RateMatrix): Promise<void> {
    await this.redis.set(
      EXCHANGE_RATE_CACHE_KEY,
      JSON.stringify(rates),
      'EX',
      EXCHANGE_RATE_CACHE_TTL,
    );
    this.logger.log(
      `Cached exchange rates (TTL: ${EXCHANGE_RATE_CACHE_TTL}s)`,
    );
  }

  /**
   * Retrieve cached rates from Redis.
   */
  async getCachedRates(): Promise<RateMatrix | null> {
    const cached = await this.redis.get(EXCHANGE_RATE_CACHE_KEY);
    if (!cached) {
      return null;
    }
    try {
      return JSON.parse(cached) as RateMatrix;
    } catch {
      this.logger.warn('Failed to parse cached exchange rates');
      return null;
    }
  }

  /**
   * Get the exchange rate from one currency to another.
   * Uses cache first, falls back to fetching from API.
   */
  async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1.0;

    let rates = await this.getCachedRates();
    if (!rates) {
      rates = await this.refreshRates();
    }

    const fromRates = rates[from];
    if (!fromRates || fromRates[to] === undefined) {
      this.logger.warn(
        `No exchange rate found for ${from} -> ${to}, returning 1.0`,
      );
      return 1.0;
    }

    return fromRates[to];
  }

  /**
   * Convert an amount from one currency to another.
   */
  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const rate = await this.getRate(from, to);
    return amount * rate;
  }

  /**
   * Fetch fresh rates from the API and cache them.
   */
  async refreshRates(): Promise<RateMatrix> {
    const rates = await this.fetchRatesFromApi();
    await this.cacheRates(rates);
    return rates;
  }

  /**
   * Return the list of supported currencies with their names.
   */
  getSupportedCurrencies(): { code: string; name: string }[] {
    return CURRENCY_INFO;
  }
}
