/** Stable object key order for release checksums, idempotency and cache validation. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().filter(k => record[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(',')}}`;
}
