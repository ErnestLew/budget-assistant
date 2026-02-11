/**
 * Extract a JSON object from AI model response text.
 * Handles cases where the model wraps JSON in markdown code blocks or extra text.
 */
export function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();

  // Try direct parse
  try {
    const result = JSON.parse(trimmed);
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      return result;
    }
  } catch {
    // Continue to regex extraction
  }

  // Try extracting from markdown code blocks or surrounding text
  const match = trimmed.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (match) {
    try {
      const result = JSON.parse(match[0]);
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        return result;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Extract a JSON array from AI model response text.
 */
export function extractJsonArray(text: string): unknown[] | null {
  const trimmed = text.trim();

  // Try direct parse
  try {
    const result = JSON.parse(trimmed);
    if (Array.isArray(result)) {
      return result;
    }
  } catch {
    // Continue to regex extraction
  }

  // Try extracting array from surrounding text
  const match = trimmed.match(/\[.*\]/s);
  if (match) {
    try {
      const result = JSON.parse(match[0]);
      if (Array.isArray(result)) {
        return result;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}
