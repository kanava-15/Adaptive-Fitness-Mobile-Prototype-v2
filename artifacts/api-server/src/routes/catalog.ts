import { Router, type IRouter } from 'express';
import { and, eq, ilike, or, sql, asc, count } from 'drizzle-orm';
import { z } from 'zod';
import {
  db, catalogReleases, catalogActivities, catalogAliases,
  catalogSources, catalogRelationships, catalogMemberships,
} from '@workspace/db';
import { idSchema, activityTypeSchema, disciplineSchema, activitySchema, validateRelease, orderRelease, normalizedIdentity } from '@workspace/activity-catalog';

const router: IRouter = Router();
const querySchema = z.object({
  version: idSchema,
  q: z.string().trim().max(120).optional(),
  discipline: disciplineSchema.optional(),
  type: activityTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
}).strict();

router.get('/catalog/manifest', async (_req, res): Promise<void> => {
  const [release] = await db.select().from(catalogReleases).where(eq(catalogReleases.active, true)).limit(1);
  if (!release) { res.status(503).json({ error: 'No reviewed catalog release has been published.' }); return; }
  const [total] = await db.select({ count: count() }).from(catalogActivities).where(eq(catalogActivities.release, release.version));
  res.set('Cache-Control', 'no-cache').json({
    schemaVersion: release.schemaVersion, contentVersion: release.version,
    checksum: release.checksum, publishedAt: release.publishedAt.toISOString(), count: total.count,
  });
});

router.get('/catalog/releases/:version', async (req, res): Promise<void> => {
  const parsed = idSchema.safeParse(req.params.version);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid content version.' }); return; }
  const version = parsed.data;
  const [release] = await db.select().from(catalogReleases).where(eq(catalogReleases.version, version)).limit(1);
  if (!release) { res.status(404).json({ error: 'Released catalog not found.' }); return; }
  const [activities, sources, relationships, sequences] = await Promise.all([
    db.select().from(catalogActivities).where(eq(catalogActivities.release, version)),
    db.select().from(catalogSources).where(eq(catalogSources.release, version)),
    db.select().from(catalogRelationships).where(eq(catalogRelationships.release, version)),
    db.select().from(catalogMemberships).where(eq(catalogMemberships.release, version)),
  ]);
  const result = orderRelease(validateRelease({
    schemaVersion: release.schemaVersion, contentVersion: version, status: 'released',
    publishedAt: release.publishedAt.toISOString(), reviewStatus: release.reviewStatus,
    activities: activities.map(a => a.definition), sources: sources.map(s => s.record),
    relationships: relationships.map(r => ({ from: r.fromId, to: r.toId, type: r.type })),
    sequences: sequences.map(m => ({ sequenceId: m.sequenceId, activityId: m.activityId, order: m.order, side: m.side })),
  }));
  res.set('ETag', `"${release.checksum}"`).set('Cache-Control', 'public, max-age=31536000, immutable').json(result);
});

router.get('/catalog/activities', async (req, res): Promise<void> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid catalog query.', details: parsed.error.flatten() }); return; }
  const { version, q, discipline, type, limit, offset } = parsed.data;
  const [release] = await db.select({ version: catalogReleases.version }).from(catalogReleases).where(eq(catalogReleases.version, version)).limit(1);
  if (!release) { res.status(404).json({ error: 'Released catalog not found.' }); return; }
  const conditions = [eq(catalogActivities.release, version)];
  if (discipline) conditions.push(eq(catalogActivities.discipline, discipline));
  if (type) conditions.push(eq(catalogActivities.type, type));
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const identity = normalizedIdentity(q);
    conditions.push(or(
      ilike(catalogActivities.name, pattern),
      sql`to_tsvector('simple', ${catalogActivities.retrievalText}) @@ plainto_tsquery('simple', ${q})`,
      identity ? sql`exists (select 1 from ${catalogAliases} where ${catalogAliases.release} = ${version}
        and ${catalogAliases.activityId} = ${catalogActivities.id} and ${catalogAliases.normalized} like ${`%${identity}%`})` : undefined,
      sql`exists (select 1 from ${catalogAliases} where ${catalogAliases.release} = ${version}
        and ${catalogAliases.activityId} = ${catalogActivities.id} and ${catalogAliases.alias} ilike ${pattern})`,
    )!);
  }
  const rows = await db.select({ definition: catalogActivities.definition }).from(catalogActivities)
    .where(and(...conditions)).orderBy(asc(catalogActivities.id)).limit(limit).offset(offset);
  res.json({ version, activities: rows.map(r => activitySchema.parse(r.definition)), limit, offset });
});

// No writes, authentication, profiles, prescriptions, or performance endpoints.
router.all(['/catalog/manifest', '/catalog/activities', '/catalog/releases/:version'], (_req, res) => {
  res.set('Allow', 'GET, HEAD').status(405).json({ error: 'Shared catalog is read-only.' });
});
export default router;
