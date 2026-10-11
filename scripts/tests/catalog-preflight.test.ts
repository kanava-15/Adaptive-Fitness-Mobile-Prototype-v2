import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authoredRelease } from '@workspace/activity-catalog/authoring';
import { releaseManifest } from '@workspace/activity-catalog';
import { assertCurrentCatalogRelease } from '../src/catalog-preflight';

test('stale generated reviewed releases are rejected with bundle regeneration guidance', () => {
  const authored = authoredRelease();
  const bundle = { manifest: releaseManifest(authored), release: authored };
  const staleGeneratedRelease = structuredClone(authored);
  staleGeneratedRelease.contentVersion = 'tempo-catalog-2026-10-11-1';

  assert.throws(
    () => assertCurrentCatalogRelease(staleGeneratedRelease, authored, bundle),
    /selected catalog release is stale or has a checksum mismatch.*pnpm --filter @workspace\/scripts catalog:bundle/i,
  );
});

test('same-version content drift is rejected as a checksum mismatch', () => {
  const authored = authoredRelease();
  const bundle = { manifest: releaseManifest(authored), release: authored };
  const changedRelease = structuredClone(authored);
  changedRelease.activities[0]!.description += ' Changed after bundle generation.';

  assert.throws(
    () => assertCurrentCatalogRelease(changedRelease, authored, bundle),
    /stale or has a checksum mismatch.*catalog:bundle/i,
  );
});

test('a checked-in bundle that lags authored content is rejected before importing a release', () => {
  const authored = authoredRelease();
  const olderBundleRelease = structuredClone(authored);
  olderBundleRelease.contentVersion = 'tempo-catalog-2026-10-11-1';

  assert.throws(
    () => assertCurrentCatalogRelease(authored, authored, {
      manifest: releaseManifest(olderBundleRelease),
      release: olderBundleRelease,
    }),
    /offline catalog bundle is behind the authored catalog.*catalog:bundle/i,
  );
});
