import { z } from 'zod';
import type { Activity, CatalogRelease } from './schema';
import { normalizedIdentity, retrievalText } from './validation';
import { manifestSchema, validateSnapshot, type CatalogEnvelope, type CatalogManifest } from './integrity';

/** Catalog-only ports: no profile, routine, session or personal-record interface exists. */
export interface CatalogStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface CatalogTransport {
  manifest(): Promise<unknown>;
  release(version: string): Promise<unknown>;
}
export const CATALOG_CACHE_PREFIX = '@tempo/shared-catalog/v1/';
const pointerKey = `${CATALOG_CACHE_PREFIX}active`;
const recoveryKey = `${CATALOG_CACHE_PREFIX}recovery`;
const snapshotKey = (version: string) => `${CATALOG_CACHE_PREFIX}release/${version}`;
const pointerSchema = z.object({
  current: manifestSchema,
  retained: z.array(manifestSchema).max(1000),
  checkedAt: z.string().datetime().nullable(),
}).strict();
type Pointer = z.infer<typeof pointerSchema>;
export interface CatalogState {
  release: CatalogRelease;
  origin: 'bundled' | 'cache' | 'network';
  checkedAt: string | null;
  checking: boolean;
  error: string | null;
}
export interface CatalogFilter {
  q?: string; discipline?: Activity['discipline']; type?: Activity['type'];
  family?: Activity['family']; equipment?: NonNullable<Activity['equipment']>[number];
  joint?: NonNullable<Activity['joints']>[number]; difficulty?: Activity['difficulty'];
  includeArchived?: boolean;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
const message = (error: unknown) => {
  if (!(error instanceof Error)) return 'Catalog update failed.';
  // A proxy or an older server may return an HTML error page. Keep it out of
  // the Library while retaining the HTTP status for troubleshooting.
  if (/<(?:!doctype|html|head|body|pre)\b/i.test(error.message)) {
    const status = error.message.match(/\bHTTP\s+\d{3}\b/i)?.[0];
    return `Catalog update service is unavailable${status ? ` (${status})` : ''}. Please try again later.`;
  }
  return error.message;
};

/** Complete immutable payload first, ONE atomic pointer second. No cache deletion on failure. */
export class CatalogRepository {
  private bundled: CatalogEnvelope;
  private pointer: Pointer;
  private state: CatalogState;
  private listeners = new Set<() => void>();
  private initialization: Promise<void> | null = null;
  private update: Promise<void> | null = null;
  constructor(private storage: CatalogStorage, private transport: CatalogTransport, bundled: CatalogEnvelope) {
    this.bundled = freeze(validateSnapshot(bundled.manifest, bundled.release));
    this.pointer = { current: this.bundled.manifest, retained: [], checkedAt: null };
    // Synchronous bundled state makes the very first offline launch useful.
    this.state = { release: this.bundled.release, origin: 'bundled', checkedAt: null, checking: false, error: null };
  }
  getState = (): CatalogState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private emit(patch: Partial<CatalogState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l());
  }
  private async readSnapshot(manifest: CatalogManifest): Promise<CatalogEnvelope> {
    if (manifest.contentVersion === this.bundled.manifest.contentVersion) {
      if (manifest.checksum !== this.bundled.manifest.checksum) throw new Error('Immutable bundled version changed.');
      return this.bundled;
    }
    const text = await this.storage.getItem(snapshotKey(manifest.contentVersion));
    if (!text) throw new Error(`Retained catalog ${manifest.contentVersion} is unavailable.`);
    if (text.length > 8_000_000) throw new Error('Retained catalog exceeds the cache payload limit.');
    const envelope = JSON.parse(text);
    const embedded = manifestSchema.parse(envelope.manifest);
    if (JSON.stringify(embedded) !== JSON.stringify(manifest)) throw new Error('Retained catalog manifest differs from its pinned reference.');
    return freeze(validateSnapshot(manifest, envelope.release));
  }
  initialize(): Promise<void> {
    return this.initialization ??= this.hydrate();
  }
  private async hydrate() {
    const problems: string[] = [];
    const pointers: Pointer[] = [];
    for (const key of [pointerKey, recoveryKey]) {
      try {
        const text = await this.storage.getItem(key);
        if (text) pointers.push(pointerSchema.parse(JSON.parse(text)));
      } catch (error) { problems.push(message(error)); }
    }
    for (const pointer of pointers) {
      const candidates = [pointer.current, ...pointer.retained];
      for (const manifest of candidates) {
        try {
          const envelope = await this.readSnapshot(manifest);
          this.pointer = { current: manifest,
            retained: candidates.filter(m => m.contentVersion !== manifest.contentVersion), checkedAt: pointer.checkedAt };
          this.emit({ release: envelope.release, origin: envelope === this.bundled ? 'bundled' : 'cache',
            checkedAt: pointer.checkedAt, error: problems.length ? `Using last-known-good catalog. ${problems.join(' ')}` : null });
          return;
        } catch (error) { problems.push(message(error)); }
      }
    }
    if (problems.length) this.emit({ error: `Using bundled catalog. ${problems.join(' ')}` });
  }
  refresh(): Promise<void> {
    if (!this.update) this.update = this.check().finally(() => { this.update = null; });
    return this.update;
  }
  private async check() {
    await this.initialize();
    this.emit({ checking: true });
    try {
      const manifest = manifestSchema.parse(await this.transport.manifest());
      const known = [this.pointer.current, ...this.pointer.retained, this.bundled.manifest]
        .find(m => m.contentVersion === manifest.contentVersion);
      if (known && (known.checksum !== manifest.checksum || known.count !== manifest.count || known.publishedAt !== manifest.publishedAt)) {
        throw new Error('Server attempted to change an immutable catalog version.');
      }
      const checkedAt = new Date().toISOString();
      if (manifest.contentVersion === this.pointer.current.contentVersion) {
        // Revalidate even the same-version response; not just a version-string check.
        validateSnapshot(manifest, this.state.release);
        const next = { ...this.pointer, checkedAt };
        await this.storage.setItem(pointerKey, JSON.stringify(next));
        this.pointer = next;
        this.emit({ checkedAt, error: null });
        return;
      }
      const envelope = freeze(validateSnapshot(manifest, await this.transport.release(manifest.contentVersion)));
      // Persist and read back full data before changing the activation pointer.
      await this.storage.setItem(snapshotKey(manifest.contentVersion), JSON.stringify(envelope));
      await this.readSnapshot(manifest);
      // Keep all older payloads, including the bundle, for pinned/archived references.
      const retained = [this.pointer.current, ...this.pointer.retained]
        .filter((m, i, all) => m.contentVersion !== manifest.contentVersion && all.findIndex(n => n.contentVersion === m.contentVersion) === i);
      const next = pointerSchema.parse({ current: manifest, retained, checkedAt });
      await this.storage.setItem(recoveryKey, JSON.stringify(this.pointer));
      await this.storage.setItem(pointerKey, JSON.stringify(next));
      this.pointer = next;
      this.emit({ release: envelope.release, origin: 'network', checkedAt, error: null });
    } catch (error) {
      // A failed fetch, schema check, payload write or pointer write never replaces working state.
      this.emit({ error: `Update not activated; your catalog remains available. ${message(error)}` });
    } finally { this.emit({ checking: false }); }
  }
  browse(filter: CatalogFilter = {}): Activity[] {
    const query = normalizedIdentity((filter.q ?? '').slice(0, 120));
    return this.state.release.activities.filter(a =>
      (filter.includeArchived || !a.archived) &&
      (!filter.discipline || a.discipline === filter.discipline) &&
      (!filter.type || a.type === filter.type) &&
      (!filter.family || a.family === filter.family) &&
      (!filter.equipment || a.equipment?.includes(filter.equipment)) &&
      (!filter.joint || a.joints?.includes(filter.joint)) &&
      (!filter.difficulty || a.difficulty === filter.difficulty) &&
      (!query || normalizedIdentity(retrievalText(a)).includes(query)));
  }
  async resolve(id: string, pinnedVersion?: string): Promise<{ activity: Activity; contentVersion: string; retained: boolean } | null> {
    await this.initialize();
    const manifests = [this.pointer.current, ...this.pointer.retained, this.bundled.manifest];
    for (const manifest of manifests) {
      if (pinnedVersion && pinnedVersion !== manifest.contentVersion) continue;
      // Fail explicitly for a corrupt requested archive instead of substituting a new definition.
      const release = manifest.contentVersion === this.pointer.current.contentVersion ? this.state.release : (await this.readSnapshot(manifest)).release;
      const activity = release.activities.find(a => a.id === id);
      if (activity) return { activity, contentVersion: release.contentVersion,
        retained: activity.archived || release.contentVersion !== this.state.release.contentVersion };
    }
    return null;
  }
}
