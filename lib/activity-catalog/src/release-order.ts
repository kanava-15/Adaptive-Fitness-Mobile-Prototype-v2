import type { CatalogRelease } from './schema';

/** Stable ordering and timestamp precision match the PostgreSQL/JS read representation. */
export function orderRelease(r: CatalogRelease): CatalogRelease {
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  return {
    ...r,
    // Hash the same millisecond ISO representation that pg/Date will serve.
    // Inputs may omit fractional seconds or contain sub-millisecond precision.
    publishedAt: r.publishedAt === null ? null : new Date(r.publishedAt).toISOString(),
    sources: [...r.sources].sort((a, b) => compare(a.id, b.id)),
    activities: [...r.activities].sort((a, b) => compare(a.id, b.id)),
    relationships: [...r.relationships].sort((a, b) => compare(`${a.from}:${a.to}:${a.type}`, `${b.from}:${b.to}:${b.type}`)),
    sequences: [...r.sequences].sort((a, b) => compare(a.sequenceId, b.sequenceId) || a.order - b.order),
  };
}
