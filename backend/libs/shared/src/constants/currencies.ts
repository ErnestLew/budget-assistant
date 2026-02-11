export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'SGD', 'JPY', 'AUD', 'CNY', 'THB',
  'IDR', 'PHP', 'INR', 'KRW', 'HKD', 'TWD', 'MYR',
] as const;

export const CURRENCY_INFO: { code: string; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
];

export const NO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'IDR', 'TWD']);
