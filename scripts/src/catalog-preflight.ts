import { releaseManifest, validateSnapshot } from '@workspace/activity-catalog';
import type { CatalogRelease } from '@workspace/activity-catalog';

const regenerateInstruction =
  'Run `pnpm --filter @workspace/scripts catalog:bundle` to regenerate the bundle and reviewed release, then review it before applying.';

function asEnvelopeParts(bundle: unknown): { manifest: unknown; release: unknown } {
  if (!bundle || typeof bundle !== 'object') {
    throw new Error(`Catalog bundle is missing or malformed. ${regenerateInstruction}`);
  }
  const envelope = bundle as Record<string, unknown>;
  if (!('manifest' in envelope) || !('release' in envelope)) {
    throw new Error(`Catalog bundle is missing its manifest or release. ${regenerateInstruction}`);
  }
  return { manifest: envelope.manifest, release: envelope.release };
}

function matches(left: { contentVersion: string; checksum: string }, right: { contentVersion: string; checksum: string }) {
  return left.contentVersion === right.contentVersion && left.checksum === right.checksum;
}

/** Reject releases or checked-in bundles that no longer represent authored catalog content. */
export function assertCurrentCatalogRelease(selected: CatalogRelease, authored: CatalogRelease, bundle: unknown): void {
  const parts = asEnvelopeParts(bundle);
  let bundled;
  try {
    bundled = validateSnapshot(parts.manifest, parts.release);
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : '';
    throw new Error(`The checked-in offline catalog bundle is invalid or stale${detail}. ${regenerateInstruction}`);
  }

  const authoredManifest = releaseManifest(authored);
  if (!matches(authoredManifest, bundled.manifest)) {
    throw new Error(
      `The checked-in offline catalog bundle is behind the authored catalog ` +
      `(authored ${authoredManifest.contentVersion}, bundled ${bundled.manifest.contentVersion}). ${regenerateInstruction}`,
    );
  }

  const selectedManifest = releaseManifest(selected);
  if (!matches(selectedManifest, authoredManifest) || !matches(selectedManifest, bundled.manifest)) {
    throw new Error(
      `The selected catalog release is stale or has a checksum mismatch ` +
      `(selected ${selectedManifest.contentVersion}, current ${authoredManifest.contentVersion}). ${regenerateInstruction}`,
    );
  }
}
