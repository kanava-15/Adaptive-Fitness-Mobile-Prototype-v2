/**
 * Trusted, local CLI only. No startup DDL and no public write route.
 * DATABASE_URL comes from the explicitly selected runtime, never from arguments.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { canonicalJson, coverage, idSchema, normalizedIdentity, orderRelease, requireCoverage, retrievalText, validateRelease } from '@workspace/activity-catalog';
import { authoredRelease } from '@workspace/activity-catalog/authoring';
import { assertCurrentCatalogRelease } from './catalog-preflight';

const args = process.argv.slice(2);
const allowed = new Set(['--environment', '--file', '--rollback', '--apply', '--confirm-production']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error(`Unknown option: ${args[i]}`);
  if (['--environment', '--file', '--rollback'].includes(args[i])) i++;
}
const value = (flag: string) => {
  const at = args.indexOf(flag);
  if (at < 0) return undefined;
  if (!args[at + 1] || args[at + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return args[at + 1];
};
const environment = value('--environment');
if (environment !== 'development' && environment !== 'production') throw new Error('Select --environment development or production explicitly.');
const apply = args.includes('--apply');
const file = value('--file'), rollback = value('--rollback');
if (!!file === !!rollback) throw new Error('Supply exactly one of --file <release.json> or --rollback <version>.');
if (apply && environment === 'production' && !args.includes('--confirm-production')) throw new Error('Production content writes require --confirm-production.');
if (apply && environment !== process.env.NODE_ENV) throw new Error('Selected environment does not match NODE_ENV. Run inside the intended target runtime; do not relabel a development connection.');
if (apply && environment === 'development' && ['1', 'true'].includes(process.env.REPLIT_DEPLOYMENT ?? '')) throw new Error('Development content writes are not allowed in a published runtime.');

const input = file ? orderRelease(validateRelease(JSON.parse(await readFile(file, 'utf8')))) : null;
if (input) {
  if (input.status !== 'released') throw new Error('Release input must be reviewed and marked released with a publication date.');
  const bundle = JSON.parse(await readFile(new URL('../../lib/activity-catalog/src/starter.json', import.meta.url), 'utf8'));
  assertCurrentCatalogRelease(input, authoredRelease(), bundle);
  requireCoverage(input);
  console.info(JSON.stringify({ environment, apply, version: input.contentVersion, coverage: coverage(input) }));
}
if (rollback) idSchema.parse(rollback);
// Dry runs never connect to a database. They validate files and report the target.
if (!apply) {
  console.info(rollback ? `Dry run: would select previously published release ${rollback} in ${environment}; existence checked on apply.` : 'Dry run passed; no database connection or writes.');
} else {
  const { db, pool, catalogReleases, catalogActivities, catalogSources, catalogAliases, catalogRelationships, catalogMemberships } = await import('@workspace/db');
  try {
    await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(784231)`);
      if (rollback) {
        const [previous] = await tx.select().from(catalogReleases).where(eq(catalogReleases.version, rollback));
        if (!previous) throw new Error(`No published release ${rollback}.`);
        await tx.update(catalogReleases).set({ active: false }).where(eq(catalogReleases.active, true));
        await tx.update(catalogReleases).set({ active: true }).where(eq(catalogReleases.version, rollback));
        return;
      }
      if (!input) throw new Error('Missing release');
      const version = input.contentVersion;
      const checksum = createHash('sha256').update(canonicalJson(input)).digest('hex');
      const [existing] = await tx.select().from(catalogReleases).where(eq(catalogReleases.version, version));
      if (existing) {
        if (existing.checksum !== checksum) throw new Error('Immutable version already exists with different content. Use a new contentVersion.');
        console.info('Identical release already imported; no changes. Use --rollback to explicitly reactivate it.');
        return;
      }
      await tx.insert(catalogReleases).values({
        version, schemaVersion: input.schemaVersion, checksum, reviewStatus: input.reviewStatus,
        publishedAt: new Date(input.publishedAt!), active: false,
      });
      for (const source of input.sources) await tx.insert(catalogSources).values({ release: version, id: source.id, url: source.url, title: source.title, record: source });
      for (const activity of input.activities) {
        await tx.insert(catalogActivities).values({
          release: version, id: activity.id, version: activity.version, name: activity.name,
          discipline: activity.discipline, type: activity.type, definition: activity, retrievalText: retrievalText(activity),
        });
        for (const alias of new Set([activity.name, activity.englishName, activity.sanskritName, ...activity.aliases].filter((x): x is string => !!x))) {
          await tx.insert(catalogAliases).values({ release: version, activityId: activity.id, alias, normalized: normalizedIdentity(alias) });
        }
      }
      for (const r of input.relationships) await tx.insert(catalogRelationships).values({ release: version, fromId: r.from, toId: r.to, type: r.type });
      for (const m of input.sequences) await tx.insert(catalogMemberships).values({ release: version, ...m });
      await tx.update(catalogReleases).set({ active: false }).where(eq(catalogReleases.active, true));
      await tx.update(catalogReleases).set({ active: true }).where(eq(catalogReleases.version, version));
    });
    console.info(`Catalog content operation completed in ${environment}. No personal data or schema was changed.`);
  } finally { await pool.end(); }
}
