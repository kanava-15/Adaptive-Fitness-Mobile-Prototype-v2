/**
 * Opt-in development content/API integration checks. No DDL, personal tables or
 * production connection selection. Test versions are removed after restoring the authored release.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { authoredRelease } from '@workspace/activity-catalog/authoring';
import { manifestSchema, activitySchema, idSchema, validateSnapshot } from '@workspace/activity-catalog';
import { db, pool, catalogReleases, catalogActivities, catalogSources, catalogAliases, catalogRelationships, catalogMemberships } from '@workspace/db';

if (process.env.NODE_ENV !== 'development' || ['1', 'true'].includes(process.env.REPLIT_DEPLOYMENT ?? '')) throw new Error('Checks require the development runtime.');
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error('Development API domain is required.');
const cwd = fileURLToPath(new URL('..', import.meta.url));
const out = new URL('../../generated-artifacts/catalog/', import.meta.url);
const release = authoredRelease();
const version = `development-check-${Date.now()}`;
const partial = `${version}-interrupted`;
const base = `https://${process.env.REPLIT_DEV_DOMAIN}/api/catalog`;
const fixture = structuredClone(release);
fixture.contentVersion = version;
fixture.activities.find(a => a.name === 'Outdoor walking')!.archived = true;
const fixturePath = fileURLToPath(new URL(`${version}.json`, out));
const mainPath = fileURLToPath(new URL('reviewed-release.json', out));
const pageSchema = z.object({ version: idSchema, activities: z.array(activitySchema), limit: z.number(), offset: z.number() }).strict();
let mainImported = false;

async function cli(args: string[], expected = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['catalog', '--environment', 'development', ...args], { cwd, env: process.env });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('close', code => code === expected ? resolve(output) : reject(new Error(`Catalog CLI exit ${code}; expected ${expected}:\n${output}`)));
  });
}
async function active() {
  const rows = await db.select().from(catalogReleases).where(eq(catalogReleases.active, true));
  assert.equal(rows.length, 1, 'Exactly one active release');
  return rows[0];
}
async function get(path: string, expected = 200) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, expected, path);
  return response;
}
async function page(path: string) { return pageSchema.parse(await (await get(path)).json()); }
try {
  await mkdir(out, { recursive: true });
  await writeFile(mainPath, JSON.stringify(release));
  await writeFile(fixturePath, JSON.stringify(fixture));
  assert.match(await cli(['--file', mainPath]), /Dry run passed/);
  await cli(['--file', mainPath, '--apply']);
  mainImported = true;
  assert.equal((await active()).version, release.contentVersion);
  assert.match(await cli(['--file', mainPath, '--apply']), /Identical release/);
  // Duplicate concurrent imports must serialize, not leave partial children or multiple active rows.
  const concurrent = await Promise.all([
    cli(['--file', fixturePath, '--apply']), cli(['--file', fixturePath, '--apply']),
  ]);
  assert.ok(concurrent.some(output => output.includes('Identical release')));
  assert.equal((await active()).version, version);
  assert.equal((await db.select().from(catalogActivities).where(eq(catalogActivities.release, version))).length, fixture.activities.length);

  // Real PostgreSQL rollback after a mid-insert failure, with no schema changes.
  await assert.rejects(db.transaction(async tx => {
    await tx.insert(catalogReleases).values({ version: partial, schemaVersion: 1, checksum: '0'.repeat(64),
      publishedAt: new Date(release.publishedAt!), reviewStatus: 'source-checked', active: false });
    const a = fixture.activities[0];
    const row = { release: partial, id: a.id, version: a.version, name: a.name,
      discipline: a.discipline, type: a.type, retrievalText: a.name, definition: a };
    await tx.insert(catalogActivities).values(row);
    await tx.insert(catalogActivities).values(row); // Deliberate PK conflict, rolls back parent and child.
  }));
  assert.equal((await db.select().from(catalogReleases).where(eq(catalogReleases.version, partial))).length, 0);
  assert.equal((await active()).version, version);

  const manifest = manifestSchema.parse(await (await get('/manifest')).json());
  assert.equal(manifest.contentVersion, version);
  const response = await get(`/releases/${version}`);
  assert.equal(response.headers.get('etag'), `"${manifest.checksum}"`);
  assert.match(response.headers.get('cache-control')!, /immutable/);
  validateSnapshot(manifest, await response.json());
  const query = `/activities?version=${version}`;
  const cars = await page(`${query}&family=cars&joint=hip&limit=100`);
  assert.equal(cars.activities.length, 2);
  const dumbbells = await page(`${query}&equipment=dumbbells&discipline=strength`);
  assert.ok(dumbbells.activities.length);
  assert.ok(dumbbells.activities.every(a => a.equipment?.includes('dumbbells')));
  const barbells = await page(`${query}&equipment=barbell&discipline=strength&limit=100`);
  assert.deepEqual(barbells.activities.map(a => a.id).sort(),
    fixture.activities.filter(a => /barbell|smith/i.test(a.name)).map(a => a.id).sort());
  assert.ok(barbells.activities.every(a => a.loadUnits.includes('kg') && a.loadUnits.includes('lb') &&
    a.precautions.some(p => p.startsWith('Barbell safety:'))));
  const dipBars = await page(`${query}&equipment=parallel-bars`);
  assert.ok(dipBars.activities.some(a => a.name === 'Bodyweight triceps dip'));
  const advanced = await page(`${query}&difficulty=advanced`);
  assert.ok(advanced.activities.every((a: { instructionNeeded: boolean }) => a.instructionNeeded));
  const found = await page(`${query}&q=Paschimottanasana`);
  assert.equal(found.activities.length, 1, 'Sanskrit alias search');
  const hidden = await page(`${query}&q=Outdoor%20walking`);
  assert.ok(!hidden.activities.some(a => a.name === 'Outdoor walking'));
  const archived = await page(`${query}&q=Outdoor%20walking&includeArchived=true`);
  assert.equal(archived.activities.filter(a => a.name === 'Outdoor walking' && a.archived).length, 1);
  const page1 = await page(`${query}&limit=5`);
  const page2 = await page(`${query}&limit=5&offset=5`);
  assert.ok(page1.activities.every((a: { id: string }) => !page2.activities.some((b: { id: string }) => b.id === a.id)));
  for (const path of ['/activities', `${query}&limit=101`, `${query}&offset=10001`,
    `${query}&unexpected=true`, `${query}&joint=unknown-joint`, `${query}&includeArchived=maybe`,
    `${query}&q=${'a'.repeat(121)}`]) await get(path, 400);
  await get('/releases/catalog-missing', 404);
  await get('/activities?version=catalog-missing', 404);
  const write = await fetch(`${base}/manifest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(write.status, 405); assert.equal(write.headers.get('allow'), 'GET, HEAD');
  assert.equal((await active()).version, version);

  const changed = structuredClone(fixture);
  changed.activities[0].description += ' Invalid immutable version mutation for development rejection check.';
  const changedPath = fileURLToPath(new URL(`${version}-changed.json`, out));
  await writeFile(changedPath, JSON.stringify(changed));
  assert.match(await cli(['--file', changedPath, '--apply'], 1), /Immutable version/);
  assert.match(await cli(['--rollback', `${version}-missing`, '--apply'], 1), /No published release/);
  assert.equal((await active()).version, version);
  await cli(['--rollback', release.contentVersion, '--apply']);
  assert.equal((await active()).version, release.contentVersion);
  // Reimporting an inactive existing release must not silently reactivate it.
  assert.match(await cli(['--file', fixturePath, '--apply']), /Identical release/);
  assert.equal((await active()).version, release.contentVersion);
  validateSnapshot(await (await get('/manifest')).json(), await (await get(`/releases/${release.contentVersion}`)).json());
  console.info('Development CLI/API checks passed: dry run, concurrent idempotency, transactional failure, immutable releases, rollback, filters, aliases, pagination, invalid inputs and read-only enforcement.');
} finally {
  // Only our named temporary versions, never real catalog history or personal records.
  try {
    if (mainImported) await cli(['--rollback', release.contentVersion, '--apply']);
    await db.transaction(async tx => {
      for (const testVersion of [version, partial]) {
        await tx.delete(catalogMemberships).where(eq(catalogMemberships.release, testVersion));
        await tx.delete(catalogRelationships).where(eq(catalogRelationships.release, testVersion));
        await tx.delete(catalogAliases).where(eq(catalogAliases.release, testVersion));
        await tx.delete(catalogActivities).where(eq(catalogActivities.release, testVersion));
        await tx.delete(catalogSources).where(eq(catalogSources.release, testVersion));
        await tx.delete(catalogReleases).where(eq(catalogReleases.version, testVersion));
      }
    });
  } finally { await pool.end(); }
}
