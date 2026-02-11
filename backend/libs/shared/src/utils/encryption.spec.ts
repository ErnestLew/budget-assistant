import { encrypt, decrypt, maskApiKey } from './encryption';
import { randomBytes } from 'crypto';

// 32-byte hex key for AES-256
const TEST_KEY = randomBytes(32).toString('hex');

describe('encrypt / decrypt', () => {
  it('roundtrips a simple string', () => {
    const plaintext = 'gsk_test_api_key_12345';
    const encrypted = encrypt(plaintext, TEST_KEY);
    expect(decrypt(encrypted, TEST_KEY)).toBe(plaintext);
  });

  it('roundtrips an empty string', () => {
    const encrypted = encrypt('', TEST_KEY);
    expect(decrypt(encrypted, TEST_KEY)).toBe('');
  });

  it('roundtrips unicode characters', () => {
    const plaintext = 'API key with special chars: @#$%^&*()';
    const encrypted = encrypt(plaintext, TEST_KEY);
    expect(decrypt(encrypted, TEST_KEY)).toBe(plaintext);
  });

  it('roundtrips a long string', () => {
    const plaintext = 'a'.repeat(1000);
    const encrypted = encrypt(plaintext, TEST_KEY);
    expect(decrypt(encrypted, TEST_KEY)).toBe(plaintext);
  });

  it('produces format iv:authTag:ciphertext', () => {
    const encrypted = encrypt('test', TEST_KEY);
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV = 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is non-empty
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const a = encrypt('same', TEST_KEY);
    const b = encrypt('same', TEST_KEY);
    expect(a).not.toBe(b);
  });

  it('throws on wrong decryption key', () => {
    const encrypted = encrypt('secret', TEST_KEY);
    const wrongKey = randomBytes(32).toString('hex');
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('secret', TEST_KEY);
    const tampered = encrypted.slice(0, -2) + 'ff';
    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });
});

describe('maskApiKey', () => {
  it('masks a normal API key', () => {
    expect(maskApiKey('gsk_1234567890abcdef')).toBe('gsk_...****cdef');
  });

  it('masks a key with exactly 9 characters', () => {
    expect(maskApiKey('123456789')).toBe('1234...****6789');
  });

  it('returns **** for a short key (8 chars)', () => {
    expect(maskApiKey('12345678')).toBe('****');
  });

  it('returns **** for a very short key', () => {
    expect(maskApiKey('abc')).toBe('****');
  });

  it('returns **** for empty string', () => {
    expect(maskApiKey('')).toBe('****');
  });
});
