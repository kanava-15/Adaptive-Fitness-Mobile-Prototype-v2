import { z } from 'zod';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { canonicalJson } from './canonical';
import { idSchema, type CatalogRelease } from './schema';
import { requireCoverage, validateRelease } from './validation';
import { orderRelease } from './release-order';

export const manifestSchema = z.object({
  schemaVersion: z.literal(1), contentVersion: idSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/), publishedAt: z.string().datetime(),
  count: z.number().int().min(1).max(10000),
}).strict();
export type CatalogManifest = z.infer<typeof manifestSchema>;
export type CatalogEnvelope = { manifest: CatalogManifest; release: CatalogRelease };
export function releaseChecksum(release: CatalogRelease): string {
  return bytesToHex(sha256(utf8ToBytes(canonicalJson(orderRelease(release)))));
}
export function releaseManifest(release: CatalogRelease): CatalogManifest {
  return manifestSchema.parse({ schemaVersion: release.schemaVersion, contentVersion: release.contentVersion,
    checksum: releaseChecksum(release), publishedAt: release.publishedAt, count: release.activities.length });
}
export function validateSnapshot(manifestInput: unknown, releaseInput: unknown): CatalogEnvelope {
  const manifest = manifestSchema.parse(manifestInput);
  const release = orderRelease(validateRelease(releaseInput));
  requireCoverage(release);
  if (release.status !== 'released' || release.schemaVersion !== manifest.schemaVersion ||
      release.contentVersion !== manifest.contentVersion || release.publishedAt !== manifest.publishedAt ||
      release.activities.length !== manifest.count) throw new Error('Catalog release does not match the pinned manifest.');
  if (releaseChecksum(release) !== manifest.checksum) throw new Error('Catalog checksum mismatch; update was not activated.');
  return { manifest, release };
}
