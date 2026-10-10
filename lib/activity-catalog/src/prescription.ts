import { z } from 'zod';
import { distanceUnitSchema, idSchema, type Activity, type CatalogRelease } from './schema';

export const targetSchema = z.discriminatedUnion('metric', [
  z.object({ metric: z.literal('reps'), value: z.number().int().min(1).max(10000) }).strict(),
  z.object({ metric: z.literal('duration'), value: z.number().positive().max(86400), unit: z.literal('s') }).strict(),
  z.object({ metric: z.literal('breaths'), value: z.number().int().min(1).max(10000) }).strict(),
  z.object({ metric: z.literal('distance'), value: z.number().positive().max(1000000), unit: distanceUnitSchema }).strict(),
]);
export const prescriptionSchema = z.object({
  activityId: idSchema,
  target: targetSchema,
  sets: z.number().int().min(1).max(100),
  restSeconds: z.number().min(0).max(3600),
  load: z.object({ value: z.number().min(0).max(1000), unit: z.enum(['kg', 'lb']) }).strict().optional(),
  side: z.enum(['left', 'right', 'both', 'alternating', 'unspecified']),
  perSide: z.boolean(),
  locked: z.boolean(),
  priority: z.enum(['must', 'normal', 'optional']),
}).strict();
export type Prescription = z.infer<typeof prescriptionSchema>;
// Actual execution may be zero; prescription targets must remain positive.
export const actualTargetSchema = z.discriminatedUnion('metric', [
  z.object({ metric: z.literal('reps'), value: z.number().int().min(0).max(10000) }).strict(),
  z.object({ metric: z.literal('duration'), value: z.number().min(0).max(86400), unit: z.literal('s') }).strict(),
  z.object({ metric: z.literal('breaths'), value: z.number().int().min(0).max(10000) }).strict(),
  z.object({ metric: z.literal('distance'), value: z.number().min(0).max(1000000), unit: distanceUnitSchema }).strict(),
]);
export const actualSchema = z.object({
  target: actualTargetSchema,
  load: z.object({ value: z.number().min(0).max(1000), unit: z.enum(['kg', 'lb']) }).strict().optional(),
  side: z.enum(['left', 'right', 'both', 'alternating', 'unspecified']),
}).strict();

export function validatePrescription(input: unknown, activity: Activity): Prescription {
  const p = prescriptionSchema.parse(input);
  if (p.activityId !== activity.id) throw new Error('Target references a different activity');
  if (!activity.supportedMetrics.includes(p.target.metric)) throw new Error(`${activity.name} does not support ${p.target.metric}`);
  if (p.target.metric === 'distance' && !activity.distanceUnits.includes(p.target.unit)) throw new Error('Unsupported distance unit');
  if (p.load && !activity.loadUnits.includes(p.load.unit)) throw new Error('Activity does not support that load unit');
  if ((activity.laterality === 'bilateral' || activity.laterality === 'not-applicable') && ['left', 'right', 'alternating'].includes(p.side)) throw new Error('Activity does not support separate sides');
  if (p.perSide && !['unilateral', 'alternating'].includes(activity.laterality)) throw new Error('Per-side targets require known unilateral or alternating laterality');
  return p;
}

/** Never convert breaths or distance to seconds without an explicit user assumption. */
export function estimatePrescription(p: Prescription): { seconds: number | null; assumption: string } {
  const sides = p.perSide && p.side === 'both' ? 2 : 1;
  if (p.target.metric === 'breaths' || p.target.metric === 'distance') {
    return { seconds: null, assumption: 'Duration unknown: breath pace or travel speed was not supplied.' };
  }
  const seconds = p.target.value * (p.target.metric === 'reps' ? 3 : 1) * p.sets * sides + p.restSeconds * Math.max(0, p.sets - 1);
  return { seconds, assumption: p.target.metric === 'reps' ? 'Estimate assumes 3 seconds per repetition; rest between sets included.' : 'Duration targets as entered; rest between sets included.' };
}

/** Expands membership only; callers must obtain an explicit prescription for each leaf. */
export function expandSequence(release: CatalogRelease, id: string): { activityId: string; side: 'left' | 'right' | 'both' | 'unspecified' }[] {
  const path = new Set<string>();
  let leafCount = 0;
  const expand = (current: string, side: 'left' | 'right' | 'both' | 'unspecified'): ReturnType<typeof expandSequence> => {
    if (path.has(current)) throw new Error(`Sequence cycle at ${current}`);
    if (path.size >= 128) throw new Error('Sequence nesting exceeds 128 levels; simplify the membership.');
    const a = release.activities.find(a => a.id === current);
    if (!a) throw new Error(`Missing activity ${current}`);
    if (a.type !== 'sequence') {
      if (++leafCount > 5000) throw new Error('Sequence expands to more than 5000 activities; simplify repeated membership.');
      return [{ activityId: current, side }];
    }
    path.add(current);
    const members = release.sequences.filter(m => m.sequenceId === current).sort((a, b) => a.order - b.order);
    if (!members.length) throw new Error(`Empty sequence ${current}`);
    const leaves = members.flatMap(m => expand(m.activityId, m.side === 'unspecified' ? side : m.side));
    path.delete(current);
    return leaves;
  };
  return expand(id, 'unspecified');
}
