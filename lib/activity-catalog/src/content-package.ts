import { z } from 'zod';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { activitySchema, idSchema, sourceSchema, type Activity } from './schema';
import { canonicalJson } from './canonical';

export const CONTENT_LIMITS = { bytes: 2 * 1024 * 1024, activities: 500, routines: 100, members: 500, depth: 32, expansion: 500 } as const;
const text = z.string().min(1).max(4000);
const side = z.enum(['left', 'right', 'both', 'alternating', 'unspecified']);
const portableSource = sourceSchema.extend({ url: z.string().url().refine(url => /^https?:\/\//i.test(url), 'Source URL must use HTTP or HTTPS.') });
export const contentItemSchema = z.object({
  activityRef: idSchema,
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(200).optional(),
  seconds: z.number().min(5).max(3600).optional(),
  breaths: z.number().int().min(1).max(10000).optional(),
  distance: z.number().positive().max(1000000).optional(),
  distanceUnit: z.enum(['m', 'km', 'mi', 'yd']).optional(),
  side: side.optional(),
  restSec: z.number().min(0).max(600),
  load: z.number().min(0).max(1000).optional(),
  unit: z.enum(['kg', 'lb']),
  perSide: z.boolean(),
  priority: z.enum(['must', 'normal', 'optional']),
  locked: z.boolean(),
  note: z.string().max(4000).optional(),
}).strict();
export const contentPackageSchema = z.object({
  format: z.literal('svasthic-content'),
  version: z.literal(1),
  title: text,
  author: text.nullable(),
  activities: z.array(z.object({
    ref: idSchema,
    origin: z.object({ id: idSchema, version: z.number().int().positive(), kind: z.enum(['catalog', 'local', 'legacy', 'external']) }).strict(),
    activity: activitySchema,
    sources: z.array(portableSource).max(100),
    attribution: z.object({ activity: activitySchema, sources: z.array(portableSource).max(100) }).strict().optional(),
    members: z.array(z.object({ activityRef: idSchema, side: z.enum(['left', 'right', 'both', 'unspecified']) }).strict()).max(CONTENT_LIMITS.members),
  }).strict()).max(CONTENT_LIMITS.activities),
  routines: z.array(z.object({
    ref: idSchema, originId: idSchema.nullable(), name: text, notes: z.string().max(4000),
    items: z.array(contentItemSchema).min(1).max(500),
  }).strict()).max(CONTENT_LIMITS.routines),
  selection: z.array(z.object({ kind: z.enum(['activity', 'routine']), ref: idSchema }).strict()).min(1).max(600),
}).strict();
export type ContentPackage = z.infer<typeof contentPackageSchema>;
export type ContentItem = z.infer<typeof contentItemSchema>;
export type ContentActivity = ContentPackage['activities'][number];
export const contentImportMetadataSchema = z.object({
  packageFingerprint: z.string().regex(/^[a-f0-9]{64}$/), entryRef: idSchema,
  importedAt: z.string().datetime(), author: text.nullable(),
  origin: contentPackageSchema.shape.activities.element.optional(),
}).strict();
export type ContentImportMetadata = z.infer<typeof contentImportMetadataSchema>;

export function contentFingerprint(value: unknown): string {
  return bytesToHex(sha256(new TextEncoder().encode(canonicalJson(value))));
}
export function utf8Size(text: string): number {
  return new TextEncoder().encode(text).length;
}
export function sourceReferences(a: Activity): string[] {
  return [...new Set([...a.sourceIds, ...a.seriesContext.map(s => s.sourceId), ...a.benefits.flatMap(b => b.sourceIds), ...(a.mediaReferences ?? []).map(m => m.sourceId)])];
}
/** Structural checks shared by files, paste and future reviewed adapters. No catalog coverage or local trust. */
export function validateContentPackage(input: unknown): ContentPackage {
  const p = contentPackageSchema.parse(input);
  if (utf8Size(canonicalJson(p)) > CONTENT_LIMITS.bytes) throw new Error('Content package exceeds 2 MiB.');
  const refs = new Set<string>();
  for (const entry of [...p.activities, ...p.routines]) {
    if (refs.has(entry.ref)) throw new Error(`Duplicate package reference: ${entry.ref}`);
    refs.add(entry.ref);
  }
  const activities = new Map(p.activities.map(a => [a.ref, a]));
  for (const e of p.activities) {
    const a = e.activity;
    if (a.id !== e.origin.id || a.version !== e.origin.version) throw new Error(`${e.ref}: origin ID/version must match knowledge.`);
    const sourceIds = new Set(e.sources.map(s => s.id));
    if (sourceIds.size !== e.sources.length) throw new Error(`${e.ref}: duplicate source ID.`);
    for (const id of sourceReferences(a)) if (!sourceIds.has(id)) throw new Error(`${e.ref}: missing source ${id}.`);
    if (e.attribution) {
      const attributionIds = new Set(e.attribution.sources.map(s => s.id));
      if (attributionIds.size !== e.attribution.sources.length) throw new Error(`${e.ref}: duplicate attribution source ID.`);
      for (const id of sourceReferences(e.attribution.activity)) if (!attributionIds.has(id)) throw new Error(`${e.ref}: missing attribution source ${id}.`);
    }
    for (const s of e.sources) if (!/^https?:\/\//i.test(s.url)) throw new Error(`${e.ref}: source URL must use HTTP or HTTPS.`);
    if (a.supportedMetrics.includes('distance') !== !!a.distanceUnits.length) throw new Error(`${e.ref}: distance capability requires distance units.`);
    for (const values of [a.supportedMetrics, a.distanceUnits, a.loadUnits, a.sourceIds]) if (new Set(values).size !== values.length) throw new Error(`${e.ref}: duplicate capability/unit/source reference.`);
    if ((a.type === 'asana' && a.discipline !== 'yoga') || (a.type === 'mobility-drill' && a.discipline !== 'mobility') ||
        (a.type === 'conditioning-activity' && a.discipline !== 'conditioning') || (a.type === 'sport' && a.discipline !== 'sports') ||
        (a.discipline === 'sports' && a.type !== 'sport') || (a.type === 'practice-element' && a.discipline !== 'yoga') ||
        (a.family === 'cars' && a.discipline !== 'mobility') || (a.family === 'ashtanga-vinyasa' && a.discipline !== 'yoga')) throw new Error(`${e.ref}: conflicting type/discipline/family.`);
    if (a.type === 'sport' && (a.loadUnits.length || a.supportedMetrics.some(m => !['duration', 'distance'].includes(m)))) throw new Error(`${e.ref}: sports cannot use load, reps or breaths.`);
    if (a.type !== 'sequence' && e.members.length) throw new Error(`${e.ref}: only sequences have members.`);
    if (a.type === 'sequence' && !e.members.length) throw new Error(`${e.ref}: empty sequence.`);
    for (const m of e.members) if (!activities.has(m.activityRef)) throw new Error(`${e.ref}: missing dependency ${m.activityRef}.`);
  }
  const expand = (ref: string, path: Set<string>): number => {
    if (path.has(ref)) throw new Error(`Sequence cycle at ${ref}.`);
    if (path.size >= CONTENT_LIMITS.depth) throw new Error('Sequence nesting exceeds 32 levels.');
    const entry = activities.get(ref)!;
    if (!entry.members.length) return 1;
    const next = new Set([...path, ref]);
    let count = 0;
    for (const m of entry.members) {
      count += expand(m.activityRef, next);
      if (count > CONTENT_LIMITS.expansion) throw new Error(`${ref}: sequence expands beyond 500 activities.`);
    }
    return count;
  };
  for (const e of p.activities) expand(e.ref, new Set());
  for (const r of p.routines) for (const it of r.items) {
    const a = activities.get(it.activityRef)?.activity;
    if (!a) throw new Error(`${r.ref}: missing dependency ${it.activityRef}.`);
    if (a.type === 'sequence') throw new Error(`${r.ref}: expand sequences into ordered leaf targets before prescribing a routine.`);
    const metrics = [['reps', it.reps], ['duration', it.seconds], ['breaths', it.breaths], ['distance', it.distance]] as const;
    const present = metrics.filter(([, value]) => value !== undefined);
    if (present.length > 1) throw new Error(`${r.ref}: choose one measurement per target.`);
    for (const [metric] of present) if (!a.supportedMetrics.includes(metric)) throw new Error(`${r.ref}: unsupported ${metric} target.`);
    if (it.distance !== undefined && !it.distanceUnit) throw new Error(`${r.ref}: distance target requires a unit.`);
    if (it.distanceUnit && !a.distanceUnits.includes(it.distanceUnit)) throw new Error(`${r.ref}: unsupported distance unit.`);
    if (it.load !== undefined && !a.loadUnits.includes(it.unit)) throw new Error(`${r.ref}: unsupported load unit.`);
    if ((it.perSide || ['left', 'right', 'alternating'].includes(it.side ?? '')) && !['unilateral', 'alternating'].includes(a.laterality)) throw new Error(`${r.ref}: unsupported separate-side prescription.`);
  }
  for (const s of p.selection) if (!(s.kind === 'activity' ? activities.has(s.ref) : p.routines.some(r => r.ref === s.ref))) throw new Error(`Missing selected ${s.kind}: ${s.ref}.`);
  return p;
}

export function parseContentPackage(raw: string): ContentPackage {
  if (utf8Size(raw) > CONTENT_LIMITS.bytes) throw new Error('Input exceeds 2 MiB. Export a smaller selection.');
  if (raw.includes('\uFFFD')) throw new Error('Invalid text encoding. Use a UTF-8 JSON file.');
  let value: unknown;
  try { value = JSON.parse(raw.replace(/^\uFEFF/, '')); }
  catch { throw new Error('Malformed JSON. Paste only the JSON object, without Markdown fences.'); }
  if (value && typeof value === 'object' && 'format' in value && value.format === 'svasthic-content' && 'version' in value && value.version !== 1) throw new Error('Unsupported content version. This app supports version 1.');
  if (!value || typeof value !== 'object' || !('format' in value) || value.format !== 'svasthic-content') throw new Error('Not a Svasthic content package. Device backups belong in You → Restore backup.');
  try { return validateContentPackage(value); }
  catch (e) {
    if (e instanceof z.ZodError) throw new Error(e.issues.slice(0, 12).map(i => `${i.path.join('.') || 'package'}: ${i.message}`).join('\n'));
    throw e;
  }
}
