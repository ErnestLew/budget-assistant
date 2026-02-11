import { extractJson, extractJsonArray } from './json-extract';

describe('extractJson', () => {
  it('parses a plain JSON object', () => {
    expect(extractJson('{"merchant":"Grab","amount":15.5}')).toEqual({
      merchant: 'Grab',
      amount: 15.5,
    });
  });

  it('parses JSON with leading/trailing whitespace', () => {
    expect(extractJson('  \n {"key":"value"} \n ')).toEqual({ key: 'value' });
  });

  it('extracts JSON from markdown code block', () => {
    const text = 'Here is the result:\n```json\n{"merchant":"TNG","amount":50}\n```\nDone.';
    expect(extractJson(text)).toEqual({ merchant: 'TNG', amount: 50 });
  });

  it('extracts JSON from surrounding prose', () => {
    const text = 'The parsed receipt is {"merchant":"Shopee","amount":120} from the email.';
    expect(extractJson(text)).toEqual({ merchant: 'Shopee', amount: 120 });
  });

  it('handles nested objects', () => {
    expect(extractJson('{"a":{"b":"c"}}')).toEqual({ a: { b: 'c' } });
  });

  it('returns null for an array (not an object)', () => {
    expect(extractJson('[1,2,3]')).toBeNull();
  });

  it('returns null for plain text', () => {
    expect(extractJson('This is not JSON at all')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractJson('')).toBeNull();
  });

  it('returns null for invalid JSON object', () => {
    expect(extractJson('{invalid json}')).toBeNull();
  });
});

describe('extractJsonArray', () => {
  it('parses a plain JSON array', () => {
    expect(extractJsonArray('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('parses array of objects', () => {
    const input = '[{"id":1},{"id":2}]';
    expect(extractJsonArray(input)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('extracts array from markdown code block', () => {
    const text = '```json\n["receipt","promo","newsletter"]\n```';
    expect(extractJsonArray(text)).toEqual(['receipt', 'promo', 'newsletter']);
  });

  it('extracts array from surrounding text', () => {
    const text = 'The categories are: [{"name":"Food"},{"name":"Transport"}] as identified.';
    expect(extractJsonArray(text)).toEqual([{ name: 'Food' }, { name: 'Transport' }]);
  });

  it('returns null for an object (not an array)', () => {
    expect(extractJsonArray('{"key":"value"}')).toBeNull();
  });

  it('returns null for plain text', () => {
    expect(extractJsonArray('no arrays here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractJsonArray('')).toBeNull();
  });
});
