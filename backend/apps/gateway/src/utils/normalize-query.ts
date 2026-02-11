/**
 * Normalize HTTP query params for microservice consumption:
 * - Converts snake_case keys to camelCase (e.g. start_date → startDate)
 * - Parses numeric strings to numbers (e.g. "5" → 5)
 */
export function normalizeQuery(query: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(query)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camelKey] = typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : value;
  }
  return result;
}
