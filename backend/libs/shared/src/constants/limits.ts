// AI parsing
export const MAX_EMAIL_BODY_LENGTH = 3000;
export const MAX_RECEIPT_FETCH = 100;

// Validation
export const MAX_TRANSACTION_AMOUNT = 1_000_000;

// Sync progress (Redis)
export const SYNC_PROGRESS_TTL = 3600; // 1 hour auto-cleanup

// Rate limits (requests per minute)
export const RATE_LIMIT_AUTH = { limit: 10, ttl: 60000 };
export const RATE_LIMIT_SYNC = { limit: 5, ttl: 60000 };
export const RATE_LIMIT_MUTATIONS = { limit: 30, ttl: 60000 };
export const RATE_LIMIT_BULK = { limit: 10, ttl: 60000 };
export const RATE_LIMIT_REFRESH = { limit: 20, ttl: 60000 };

// Exchange rates
export const EXCHANGE_RATE_CACHE_TTL = 86400; // 24 hours
export const EXCHANGE_RATE_CACHE_KEY = 'exchange_rates:latest';
