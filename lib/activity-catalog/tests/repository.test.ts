import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import starter from '../src/starter.json';
import { authoredRelease } from '../src/content/release';
import { CatalogRepository, CATALOG_CACHE_PREFIX, validateSnapshot, releaseManifest, releaseChecksum, coverage, validateRelease, requireCoverage, canonicalJson, orderRelease,
  type CatalogEnvelope, type CatalogStorage, type CatalogTransport, type CatalogRelease } from '../src/index';

const bundle = starter as CatalogEnvelope;
class Memory implements CatalogStorage {
  values = new Map<string, string>([['tempo:v5', '{"personal":"must stay untouched"}']]);
  fail: string | null = null;
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) {
    if (!key.startsWith(CATALOG_CACHE_PREFIX)) throw new Error('Attempted personal-data write');
    if (this.fail && key.endsWith(this.fail)) throw new Error('Storage unavailable');
    this.values.set(key, value);
  }
}
const offline: CatalogTransport = { manifest: async () => { throw new Error('Offline'); }, release: async () => { throw new Error('Unexpected download'); } };
function next(version = 'catalog-test-next'): CatalogEnvelope {
  const release: CatalogRelease = structuredClone(bundle.release);
  release.contentVersion = version;
  // Archive one definition; remove another from a new version without erasing its previous reference.
  release.activities.find(a => a.name === 'Outdoor walking')!.archived = true;
  release.activities = release.activities.filter(a => a.name !== 'Dumbbell lateral raise');
  return { manifest: releaseManifest(release), release };
}
const transport = (envelope: CatalogEnvelope): CatalogTransport => ({ manifest: async () => envelope.manifest, release: async v => {
  assert.equal(v, envelope.manifest.contentVersion); return envelope.release;
} });

test('HTML server failures preserve the catalog and personal storage without displaying markup', async () => {
  const storage = new Memory();
  const original = new Map(storage.values);
  const repository = new CatalogRepository(storage, {
    manifest: async () => { throw new Error('HTTP 500: <!DOCTYPE html><html><body><pre>Internal Server Error</pre></body></html>'); },
    release: async () => { throw new Error('Unexpected download'); },
  }, bundle);
  await repository.initialize();
  await repository.refresh();
  assert.deepEqual(repository.getState().release, bundle.release);
  assert.deepEqual(storage.values, original);
  assert.match(repository.getState().error!, /HTTP 500/);
  assert.ok(!repository.getState().error!.includes('<'));
  assert.equal(repository.getState().checking, false);
});

test('source-reviewed authored inventory, bundle and portable checksum agree', () => {
  const release = authoredRelease();
  assert.deepEqual(release, bundle.release);
  assert.deepEqual(coverage(release), { strength: 240, ashtanga: 116, mobility: 36, conditioning: 16 });
  assert.equal(release.activities.filter(a => a.family === 'cars').length, 8);
  assert.ok(release.activities.some(a => a.seriesContext.some(s => s.label.includes('Advanced'))));
  assert.ok(release.activities.every(a => !a.adaptation.eligible));
  assert.equal(releaseChecksum(release), createHash('sha256').update(canonicalJson(orderRelease(release))).digest('hex'));
  validateSnapshot(bundle.manifest, release);
});
test('implement, support, load and safety metadata match independently inspected strength identities', () => {
  const byName = (name: string) => {
    const activity = bundle.release.activities.find(a => a.name === name);
    assert.ok(activity, name);
    return activity;
  };
  for (const name of ['Barbell deadlift', 'Barbell back squat', 'Barbell front raise',
    'Barbell biceps curl', 'Incline barbell bench press', 'Seated barbell military press']) {
    const a = byName(name);
    assert.ok(a.equipment?.includes('barbell'), name);
    assert.ok(!a.equipment.includes('none'), name);
    assert.deepEqual(a.loadUnits, ['kg', 'lb'], name);
    assert.ok(a.precautions.some(p => p.startsWith('Barbell safety:')), name);
    assert.equal(a.instructionNeeded, true, name);
    assert.equal(a.version, 2, name);
  }
  assert.deepEqual(byName('Barbell deadlift').equipment, ['barbell']);
  assert.deepEqual(byName('Barbell back squat').equipment, ['barbell', 'rack']);
  assert.ok(byName('Barbell bench press').equipment?.includes('bench'));
  assert.ok(byName('Smith back squat').equipment?.includes('machine'));
  assert.ok(!byName('Smith back squat').equipment?.includes('rack'));
  assert.ok(byName('T-bar row').equipment?.includes('machine'));
  assert.deepEqual(byName('T-bar row').loadUnits, ['kg', 'lb']);
  assert.deepEqual(byName('Bodyweight triceps dip').equipment, ['parallel-bars']);
  assert.deepEqual(byName('Band-assisted triceps dip').equipment, ['band', 'parallel-bars']);
  assert.deepEqual(byName('Machine-assisted triceps dip').equipment, ['machine']);
  assert.ok(byName('Single-leg box squat').equipment?.includes('box'));
  assert.ok(byName('Rear-foot-elevated bodyweight split squat').equipment?.includes('bench'));
  assert.ok(!byName('Incline machine chest press').equipment?.includes('bench'));
  assert.ok(byName('Dumbbell chest fly').equipment?.includes('bench'));
  assert.ok(byName('Pull-up').precautions.some(p => p.includes('load rating')));
  assert.deepEqual(byName('Front plank').supportedMetrics, ['duration']);
  assert.deepEqual(byName('Neck CARs').equipment, ['chair']);
  assert.deepEqual(byName('Spinal CARs').equipment, ['none']);
  const r = new CatalogRepository(new Memory(), offline, bundle);
  const expectedBarbells = bundle.release.activities.filter(a => /barbell|smith/i.test(a.name)).map(a => a.id).sort();
  assert.deepEqual(r.browse({ equipment: 'barbell' }).map(a => a.id).sort(), expectedBarbells);
  // The source-code crosscheck catches casing errors even when hashes and counts agree.
  for (const a of bundle.release.activities.filter(a => a.discipline === 'strength')) {
    const src = bundle.release.sources.find(s => s.id === a.sourceIds[0])!;
    const code = src.url.split('/').at(-1)!;
    const expected = /^BB/i.test(code) ? 'barbell' : /^DB/i.test(code) ? 'dumbbells' :
      /^CB/i.test(code) ? 'cable' : /^ST/i.test(code) ? 'suspension-trainer' :
      /^LV/i.test(code) ? 'machine' : null;
    if (expected) assert.ok(a.equipment?.includes(expected), `${a.name}: source implement ${expected}`);
  }
});
test('first offline launch works immediately, failures visible and personal data untouched', async () => {
  const storage = new Memory();
  const r = new CatalogRepository(storage, offline, bundle);
  assert.equal(r.browse().length, 409);
  await r.refresh();
  assert.equal(r.getState().origin, 'bundled');
  assert.match(r.getState().error!, /Offline/);
  assert.equal(r.browse({ family: 'cars' }).length, 8);
  assert.ok(r.browse({ q: 'paschimottanasana' }).length);
  assert.equal(storage.values.get('tempo:v5'), '{"personal":"must stay untouched"}');
});
test('complete version-pinned manifests reject checksum/schema/count/date/provenance mismatches', () => {
  for (const patch of [{ checksum: '0'.repeat(64) }, { schemaVersion: 2 }, { count: 3 },
    { publishedAt: '2026-10-11T00:00:00.000Z' }, { contentVersion: 'wrong' }]) {
    assert.throws(() => validateSnapshot({ ...bundle.manifest, ...patch }, bundle.release));
  }
  const r = structuredClone(bundle.release);
  r.sources[0].reviewedOn = null;
  assert.throws(() => validateSnapshot(releaseManifest(r), r), /source-check dates/);
  assert.throws(() => validateSnapshot(bundle.manifest, { ...bundle.release, privateUserRecords: [] }));
});
test('atomic activation, cached restart, archive retention and version pinning', async () => {
  const storage = new Memory(); const updated = next();
  const r = new CatalogRepository(storage, transport(updated), bundle);
  await r.refresh();
  assert.equal(r.getState().release.contentVersion, updated.release.contentVersion);
  assert.equal(r.getState().origin, 'network');
  assert.ok(!r.browse().some(a => a.archived));
  const oldRunning = bundle.release.activities.find(a => a.name === 'Dumbbell lateral raise')!;
  const resolved = await r.resolve(oldRunning.id);
  assert.equal(resolved!.contentVersion, bundle.release.contentVersion);
  assert.equal(resolved!.retained, true);
  assert.equal((await r.resolve(oldRunning.id, bundle.release.contentVersion))!.activity.name, oldRunning.name);
  assert.equal(await r.resolve(oldRunning.id, updated.release.contentVersion), null);
  const restarted = new CatalogRepository(storage, offline, bundle);
  await restarted.initialize();
  assert.equal(restarted.getState().origin, 'cache');
  assert.equal(restarted.getState().release.contentVersion, updated.release.contentVersion);
  await restarted.refresh();
  assert.match(restarted.getState().error!, /Offline/);
  assert.equal(restarted.getState().release.contentVersion, updated.release.contentVersion);
  assert.equal(storage.values.get('tempo:v5'), '{"personal":"must stay untouched"}');
});
test('payload write failure and atomic pointer write failure keep old active snapshot across restart', async () => {
  for (const fail of ['release/catalog-test-next', 'active', 'recovery']) {
    const storage = new Memory(); storage.fail = fail;
    const r = new CatalogRepository(storage, transport(next()), bundle);
    await r.refresh();
    assert.equal(r.getState().release.contentVersion, bundle.release.contentVersion);
    assert.match(r.getState().error!, /Storage unavailable/);
    const restarted = new CatalogRepository(storage, offline, bundle);
    await restarted.initialize();
    assert.equal(restarted.getState().release.contentVersion, bundle.release.contentVersion);
  }
});
test('partial corrupt cache falls back to validated last-known-good and corrupt pointer uses recovery', async () => {
  for (const corrupt of ['release/catalog-test-next', 'active']) {
    const storage = new Memory(); const r = new CatalogRepository(storage, transport(next()), bundle);
    await r.refresh();
    storage.values.set(`${CATALOG_CACHE_PREFIX}${corrupt}`, '{partial');
    const restarted = new CatalogRepository(storage, offline, bundle);
    await restarted.initialize();
    assert.equal(restarted.getState().release.contentVersion, bundle.release.contentVersion);
    assert.match(restarted.getState().error!, /last-known-good/);
  }
});
test('interrupted or dishonest download cannot activate, immutable versions cannot be rewritten', async () => {
  for (const remote of [
    { manifest: async () => next().manifest, release: async () => { throw new Error('Download interrupted'); } },
    { manifest: async () => next().manifest, release: async () => ({ ...next().release, activities: [] }) },
    { manifest: async () => ({ ...bundle.manifest, checksum: '0'.repeat(64) }), release: async () => next().release },
  ]) {
    const r = new CatalogRepository(new Memory(), remote, bundle);
    await r.refresh();
    assert.equal(r.getState().release.contentVersion, bundle.release.contentVersion);
    assert.ok(r.getState().error);
  }
});
test('corrupt newest payload falls back to a prior downloaded snapshot, not merely the bundle', async () => {
  const storage = new Memory(); let current = next();
  const r = new CatalogRepository(storage, {
    manifest: async () => current.manifest, release: async () => current.release,
  }, bundle);
  await r.refresh();
  current = next('catalog-test-later');
  await r.refresh();
  storage.values.set(`${CATALOG_CACHE_PREFIX}release/catalog-test-later`, '{partial');
  const restarted = new CatalogRepository(storage, offline, bundle);
  await restarted.initialize();
  assert.equal(restarted.getState().release.contentVersion, 'catalog-test-next');
  assert.equal(restarted.getState().origin, 'cache');
  assert.match(restarted.getState().error!, /last-known-good/);
  await assert.rejects(() => restarted.resolve('missing', 'catalog-test-later'));
});
test('concurrent refreshes are serialized and rollback keeps later archived references', async () => {
  const storage = new Memory(); let active = next(); let calls = 0;
  const r = new CatalogRepository(storage, { manifest: async () => { calls++; return active.manifest; }, release: async () => active.release }, bundle);
  const first = r.refresh(); assert.equal(first, r.refresh());
  await first; assert.equal(calls, 1);
  active = bundle; await r.refresh();
  assert.equal(r.getState().release.contentVersion, bundle.release.contentVersion);
  const original = bundle.release.activities.find(a => a.name === 'Outdoor walking')!;
  assert.equal((await r.resolve(original.id, 'catalog-test-next'))!.retained, true);
});
test('relation and sequence cycles, noncontiguous ordering, unsupported benefits and archive-padding fail', () => {
  const r = structuredClone(bundle.release);
  const [a, b] = r.activities;
  assert.throws(() => validateRelease({ ...r, relationships: [
    { from: a.id, to: b.id, type: 'variation-of' }, { from: b.id, to: a.id, type: 'regression-of' },
  ] }), /Relationship cycle/);
  assert.throws(() => validateRelease({ ...r, sequences: r.sequences.map(m => ({ ...m, order: m.order + 1 })) }), /contiguous/);
  a.benefits[0].sourceIds = ['fabricated-source'];
  assert.throws(() => validateRelease(r), /missing source/);
  for (const a of r.activities) if (a.discipline === 'strength') a.archived = true;
  assert.throws(() => requireCoverage(r), /strength 0\/200/);
});
