import { describe, it, expect } from 'vitest';
import {
  transactionSchema,
  budgetSchema,
  categorySchema,
  profileNameSchema,
  apiKeySchema,
} from './validations';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const validUUID = '550e8400-e29b-41d4-a716-446655440000';

function expectFail(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  expect(schema.safeParse(data).success).toBe(false);
}

function expectPass(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  expect(schema.safeParse(data).success).toBe(true);
}

// ---------------------------------------------------------------------------
// transactionSchema
// ---------------------------------------------------------------------------
describe('transactionSchema', () => {
  const valid = {
    merchant: 'Grab',
    amount: 15.5,
    currency: 'MYR',
    date: '2025-01-15',
  };

  it('accepts a valid transaction', () => {
    expectPass(transactionSchema, valid);
  });

  it('accepts optional fields', () => {
    expectPass(transactionSchema, {
      ...valid,
      categoryId: validUUID,
      description: 'Lunch',
    });
  });

  it('accepts empty string for optional fields', () => {
    expectPass(transactionSchema, { ...valid, categoryId: '', description: '' });
  });

  it('rejects missing merchant', () => {
    expectFail(transactionSchema, { ...valid, merchant: '' });
  });

  it('rejects negative amount', () => {
    expectFail(transactionSchema, { ...valid, amount: -10 });
  });

  it('rejects zero amount', () => {
    expectFail(transactionSchema, { ...valid, amount: 0 });
  });

  it('rejects lowercase currency', () => {
    expectFail(transactionSchema, { ...valid, currency: 'myr' });
  });

  it('rejects 2-letter currency', () => {
    expectFail(transactionSchema, { ...valid, currency: 'US' });
  });

  it('rejects invalid date format', () => {
    expectFail(transactionSchema, { ...valid, date: '15-01-2025' });
  });

  it('rejects invalid UUID for categoryId', () => {
    expectFail(transactionSchema, { ...valid, categoryId: 'not-a-uuid' });
  });

  it('rejects description over 1000 chars', () => {
    expectFail(transactionSchema, { ...valid, description: 'a'.repeat(1001) });
  });
});

// ---------------------------------------------------------------------------
// budgetSchema
// ---------------------------------------------------------------------------
describe('budgetSchema', () => {
  const valid = {
    name: 'Monthly Food',
    amount: 500,
    period: 'monthly' as const,
    startDate: '2025-01-01',
  };

  it('accepts a valid budget', () => {
    expectPass(budgetSchema, valid);
  });

  it('accepts all periods', () => {
    for (const period of ['weekly', 'monthly', 'yearly']) {
      expectPass(budgetSchema, { ...valid, period });
    }
  });

  it('accepts valid endDate after startDate', () => {
    expectPass(budgetSchema, { ...valid, endDate: '2025-12-31' });
  });

  it('accepts endDate equal to startDate', () => {
    expectPass(budgetSchema, { ...valid, endDate: '2025-01-01' });
  });

  it('rejects endDate before startDate', () => {
    expectFail(budgetSchema, { ...valid, endDate: '2024-12-31' });
  });

  it('rejects missing name', () => {
    expectFail(budgetSchema, { ...valid, name: '' });
  });

  it('rejects invalid period', () => {
    expectFail(budgetSchema, { ...valid, period: 'daily' });
  });

  it('rejects alert threshold over 100', () => {
    expectFail(budgetSchema, { ...valid, alertThreshold: 101 });
  });

  it('rejects negative alert threshold', () => {
    expectFail(budgetSchema, { ...valid, alertThreshold: -1 });
  });

  it('accepts alert threshold at boundaries', () => {
    expectPass(budgetSchema, { ...valid, alertThreshold: 0 });
    expectPass(budgetSchema, { ...valid, alertThreshold: 100 });
  });
});

// ---------------------------------------------------------------------------
// categorySchema
// ---------------------------------------------------------------------------
describe('categorySchema', () => {
  it('accepts a valid category', () => {
    expectPass(categorySchema, { name: 'Food & Beverage' });
  });

  it('accepts optional icon and color', () => {
    expectPass(categorySchema, { name: 'Transport', icon: 'car', color: '#FF5733' });
  });

  it('accepts empty string for optional fields', () => {
    expectPass(categorySchema, { name: 'Test', icon: '', color: '' });
  });

  it('rejects empty name', () => {
    expectFail(categorySchema, { name: '' });
  });

  it('rejects name over 100 chars', () => {
    expectFail(categorySchema, { name: 'a'.repeat(101) });
  });

  it('rejects invalid hex color', () => {
    expectFail(categorySchema, { name: 'Test', color: 'red' });
    expectFail(categorySchema, { name: 'Test', color: '#FFF' });
    expectFail(categorySchema, { name: 'Test', color: '#GGGGGG' });
  });

  it('accepts valid hex colors', () => {
    expectPass(categorySchema, { name: 'Test', color: '#000000' });
    expectPass(categorySchema, { name: 'Test', color: '#abcdef' });
    expectPass(categorySchema, { name: 'Test', color: '#ABCDEF' });
  });
});

// ---------------------------------------------------------------------------
// profileNameSchema
// ---------------------------------------------------------------------------
describe('profileNameSchema', () => {
  it('accepts a valid name', () => {
    expectPass(profileNameSchema, { name: 'Ethan' });
  });

  it('rejects empty / whitespace-only name', () => {
    expectFail(profileNameSchema, { name: '' });
    expectFail(profileNameSchema, { name: '   ' });
  });

  it('rejects name over 255 chars', () => {
    expectFail(profileNameSchema, { name: 'a'.repeat(256) });
  });
});

// ---------------------------------------------------------------------------
// apiKeySchema
// ---------------------------------------------------------------------------
describe('apiKeySchema', () => {
  it('accepts a valid groq key', () => {
    expectPass(apiKeySchema, { provider: 'groq', api_key: 'gsk_1234567890' });
  });

  it('accepts a valid gemini key', () => {
    expectPass(apiKeySchema, { provider: 'gemini', api_key: 'AIzaSyA1234567' });
  });

  it('rejects unknown provider', () => {
    expectFail(apiKeySchema, { provider: 'openai', api_key: 'sk-12345678901234' });
  });

  it('rejects api_key shorter than 10 chars', () => {
    expectFail(apiKeySchema, { provider: 'groq', api_key: 'short' });
  });

  it('accepts api_key at exactly 10 chars', () => {
    expectPass(apiKeySchema, { provider: 'groq', api_key: '1234567890' });
  });
});
