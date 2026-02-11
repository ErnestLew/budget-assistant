export const AUTH_PATTERNS = {
  VALIDATE_TOKEN: 'auth.validateToken',
  GOOGLE_LOGIN: 'auth.googleLogin',
  REFRESH_TOKEN: 'auth.refreshToken',
  GET_USER: 'auth.getUser',
  UPDATE_USER: 'auth.updateUser',
  UPDATE_API_KEYS: 'auth.updateApiKeys',
  GET_API_KEYS: 'auth.getApiKeys',
  DELETE_API_KEY: 'auth.deleteApiKey',
} as const;

export const AI_PATTERNS = {
  PARSE_RECEIPT: 'ai.parseReceipt',
  TRIAGE_EMAILS: 'ai.triageEmails',
  DETECT_DUPLICATES: 'ai.detectDuplicates',
  CATEGORIZE: 'ai.categorize',
  GET_PROVIDERS: 'ai.getProviders',
} as const;

export const CORE_PATTERNS = {
  // Transactions
  LIST_TRANSACTIONS: 'core.transactions.list',
  CREATE_TRANSACTION: 'core.transactions.create',
  GET_TRANSACTION: 'core.transactions.get',
  UPDATE_TRANSACTION: 'core.transactions.update',
  DELETE_TRANSACTION: 'core.transactions.delete',
  BULK_STATUS: 'core.transactions.bulkStatus',
  WITH_DUPLICATES: 'core.transactions.withDuplicates',
  RESOLVE_DUPLICATE: 'core.transactions.resolveDuplicate',
  DISMISS_DUPLICATE: 'core.transactions.dismissDuplicate',
  // Categories
  LIST_CATEGORIES: 'core.categories.list',
  CREATE_CATEGORY: 'core.categories.create',
  UPDATE_CATEGORY: 'core.categories.update',
  DELETE_CATEGORY: 'core.categories.delete',
  // Budgets
  LIST_BUDGETS: 'core.budgets.list',
  CREATE_BUDGET: 'core.budgets.create',
  UPDATE_BUDGET: 'core.budgets.update',
  DELETE_BUDGET: 'core.budgets.delete',
  BUDGET_PROGRESS: 'core.budgets.progress',
  LIST_ALERTS: 'core.budgets.listAlerts',
  CREATE_ALERT: 'core.budgets.createAlert',
  // Analytics
  GET_STATS: 'core.analytics.stats',
  GET_SPENDING: 'core.analytics.spending',
  GET_CATEGORIES_BREAKDOWN: 'core.analytics.categories',
  GET_CATEGORIES_DETAILED: 'core.analytics.categoriesDetailed',
  GET_CATEGORY_TREND: 'core.analytics.categoryTrend',
  GET_MERCHANTS: 'core.analytics.merchants',
  GET_MONTHLY_SUMMARY: 'core.analytics.monthlySummary',
  // Sync
  START_SYNC: 'core.sync.start',
  GET_PROGRESS: 'core.sync.progress',
  CANCEL_SYNC: 'core.sync.cancel',
  TEST_GMAIL: 'core.sync.testGmail',
  TEST_RECEIPTS: 'core.sync.testReceipts',
  SYNC_STATUS: 'core.sync.status',
  // Exchange Rates
  GET_CURRENCIES: 'core.exchangeRates.currencies',
  GET_RATES: 'core.exchangeRates.rates',
} as const;
