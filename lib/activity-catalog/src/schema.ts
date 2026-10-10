import { z } from 'zod';

export const CATALOG_SCHEMA_VERSION = 1;
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,95}$/);
const text = z.string().trim().min(1).max(4000);
const texts = z.array(text).max(100);
export const disciplineSchema = z.enum(['strength', 'yoga', 'mobility', 'conditioning']);
export const activityTypeSchema = z.enum(['exercise', 'asana', 'mobility-drill', 'conditioning-activity', 'sequence']);
export const metricSchema = z.enum(['reps', 'duration', 'breaths', 'distance']);
export const distanceUnitSchema = z.enum(['m', 'km', 'mi', 'yd']);
export const equipmentSchema = z.enum([
  'none', 'mat', 'block', 'strap', 'wall', 'chair', 'band', 'dumbbells',
  'kettlebell', 'barbell', 'plates', 'rack', 'bench', 'machine', 'cable',
  'pull-up-bar', 'rings', 'suspension-trainer', 'stability-ball', 'medicine-ball',
  'foam-roller', 'step', 'box', 'jump-rope', 'treadmill', 'bike', 'rower',
  'elliptical', 'sled', 'pool', 'parallel-bars',
]);
export const jointSchema = z.enum(['cervical-spine', 'thoracic-spine', 'lumbar-spine', 'scapula', 'shoulder', 'elbow', 'forearm', 'wrist', 'fingers', 'hip', 'knee', 'ankle', 'toes']);
export const muscleSchema = z.enum(['quadriceps', 'hamstrings', 'glutes', 'calves', 'tibialis', 'adductors', 'abductors', 'abdominals', 'obliques', 'spinal-erectors', 'lats', 'trapezius', 'rhomboids', 'pectorals', 'deltoids', 'rotator-cuff', 'biceps', 'triceps', 'forearms', 'neck', 'feet']);
export const actionSchema = z.enum(['flexion', 'extension', 'abduction', 'adduction', 'internal-rotation', 'external-rotation', 'circumduction', 'pronation', 'supination', 'dorsiflexion', 'plantarflexion', 'inversion', 'eversion', 'protraction', 'retraction', 'elevation', 'depression', 'lateral-flexion', 'rotation']);
export const reviewSchema = z.enum(['unreviewed', 'source-checked', 'expert-reviewed']);
export const sourceSchema = z.object({
  id: idSchema,
  url: z.string().url(),
  title: text,
  provenance: text,
  retrievedOn: z.string().date().nullable(),
  reviewedOn: z.string().date().nullable(),
  permittedUse: text,
  reviewStatus: reviewSchema,
}).strict();
const qualifiedFact = z.object({ text, sourceIds: z.array(idSchema).min(1), qualification: text }).strict();

/** Unknown is not an empty array: null means not established, [] means not applicable. */
export const activitySchema = z.object({
  id: idSchema,
  version: z.number().int().positive(),
  name: text,
  englishName: text.nullable(),
  sanskritName: text.nullable(),
  aliases: texts,
  type: activityTypeSchema,
  discipline: disciplineSchema,
  family: z.enum(['general', 'ashtanga-vinyasa', 'cars']),
  supportedMetrics: z.array(metricSchema).min(1),
  distanceUnits: z.array(distanceUnitSchema),
  loadUnits: z.array(z.enum(['kg', 'lb'])),
  laterality: z.enum(['bilateral', 'unilateral', 'alternating', 'not-applicable', 'unknown']),
  equipment: z.array(equipmentSchema).nullable(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'unknown']),
  primaryMuscles: z.array(muscleSchema).nullable(),
  secondaryMuscles: z.array(muscleSchema).nullable(),
  joints: z.array(jointSchema).nullable(),
  actions: z.array(actionSchema).nullable(),
  movementPatterns: z.array(z.enum(['squat', 'hinge', 'lunge', 'push', 'pull', 'carry', 'rotation', 'locomotion', 'balance', 'hold', 'joint-isolation'])).nullable(),
  description: text,
  setup: texts,
  execution: texts,
  cues: texts,
  commonMistakes: texts.nullable(),
  benefits: z.array(qualifiedFact),
  precautions: texts,
  modifications: texts,
  instructionNeeded: z.boolean(),
  seriesContext: z.array(z.object({ label: text, lineage: text, sourceId: idSchema }).strict()),
  mobility: z.object({
    position: text, stabilization: text, compensationCues: texts,
    comfortableRange: text, intensityCaution: text, regressions: texts,
  }).strict().nullable(),
  // Safety permission must be affirmative, never inferred from absent loading flags.
  adaptation: z.object({
    eligible: z.boolean(), loadingKnown: z.boolean(),
    loadedJoints: z.array(jointSchema), rationale: text,
  }).strict(),
  sourceIds: z.array(idSchema),
  authorship: z.enum(['maintainer', 'user']),
  reviewStatus: reviewSchema,
  archived: z.boolean(),
}).strict();
export const relationshipSchema = z.object({
  from: idSchema, to: idSchema,
  type: z.enum(['variation-of', 'regression-of', 'related-to']),
}).strict();
export const membershipSchema = z.object({
  sequenceId: idSchema, activityId: idSchema, order: z.number().int().nonnegative(),
  side: z.enum(['left', 'right', 'both', 'unspecified']),
}).strict();
export const releaseSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: idSchema,
  status: z.enum(['draft', 'released']),
  publishedAt: z.string().datetime().nullable(),
  reviewStatus: reviewSchema,
  sources: z.array(sourceSchema).max(10000),
  activities: z.array(activitySchema).min(1).max(10000),
  relationships: z.array(relationshipSchema).max(50000),
  sequences: z.array(membershipSchema).max(50000),
}).strict();
export type Activity = z.infer<typeof activitySchema>;
export type CatalogRelease = z.infer<typeof releaseSchema>;
export type Source = z.infer<typeof sourceSchema>;
