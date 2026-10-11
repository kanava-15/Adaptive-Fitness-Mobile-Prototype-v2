// Tempo domain v2 — exercise library, routines, dated schedule, recurrence,
// immutable snapshots, conservative adaptation, execution logs, migration and
// import validation. Pure TypeScript: no React Native imports, so it can be
// exercised directly by the Node regression tests in tests/domain.test.ts.

import { z } from 'zod';
import { activitySchema, equipmentSchema, membershipSchema, normalizedIdentity, type Activity, type CatalogRelease, type SequenceMembership, expandSequence } from '@workspace/activity-catalog';
import starter from '@workspace/activity-catalog/starter';
import {
  Category,
  Completion as V1Completion,
  DEFAULT_PROFILE,
  LIBRARY,
  STARTER_PRESETS,
  Plan,
  PlanEvent,
  Profile,
  Region,
  SessionPlan,
  addDays,
  newId,
  readiness,
  weekday,
} from './engine';

export const SCHEMA_VERSION = 3 as const;

// ---------------------------------------------------------------- types
export type Discipline = 'yoga' | 'mobility' | 'strength' | 'conditioning';
export type Area = 'hips' | 'spine' | 'shoulders' | 'knees' | 'ankles' | 'wrists' | 'core' | 'upper' | 'lower' | 'full';
export type Gear = Activity['equipment'] extends (infer T)[] | null ? T : never;
export type Tracking = 'reps' | 'time' | 'breaths' | 'distance';
export type Side = 'left' | 'right' | 'both' | 'alternating' | 'unspecified';
export type DistanceUnit = 'm' | 'km' | 'mi' | 'yd';
export type Unit = 'kg' | 'lb';
export type Priority = 'must' | 'normal' | 'optional';
export type Scope = 'one' | 'future';

export const DISCIPLINES: Discipline[] = ['yoga', 'mobility', 'strength', 'conditioning'];
export const AREAS: Area[] = ['hips', 'spine', 'shoulders', 'knees', 'ankles', 'wrists', 'core', 'upper', 'lower', 'full'];
export const GEARS: Gear[] = equipmentSchema.options;
export const REGIONS: Region[] = ['knees', 'wrists', 'shoulders', 'lowerBack', 'ankles'];

export const DISCIPLINE_LABEL: Record<Discipline, string> = { yoga: 'Yoga', mobility: 'Joint mobility', strength: 'Strength', conditioning: 'Warm-up & cardio' };
export const AREA_LABEL: Record<Area, string> = { hips: 'Hips', spine: 'Spine', shoulders: 'Shoulders', knees: 'Knees', ankles: 'Ankles', wrists: 'Wrists', core: 'Core', upper: 'Upper body', lower: 'Lower body', full: 'Full body' };
export const GEAR_LABEL = Object.fromEntries(GEARS.map(g => [g, g === 'none' ? 'No equipment' : g.replaceAll('-', ' ')])) as Record<Gear, string>;
export const PRIORITY_LABEL: Record<Priority, string> = { must: 'Must keep', normal: 'Normal', optional: 'Optional' };

export interface ExerciseDef {
  id: string;
  version: number;
  name: string;
  discipline: Discipline;
  gear: Gear[]; // all required
  areas: Area[];
  tracking: Tracking;
  defaultReps?: number;
  defaultSeconds?: number;
  perSide: boolean;
  loadable: boolean;
  stresses: Region[]; // areas this movement is known to load (used for exclusions)
  intensity: 1 | 2;
  instructions: string;
  cues: string[];
  custom: boolean;
  verified: boolean; // built-ins only; custom moves are never "verified"
  rehab: boolean; // user-marked prescribed rehabilitation: never auto-altered
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  activity?: Activity;
  sequenceMembers?: SequenceMembership[];
}

export interface RoutineItem {
  key: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  seconds?: number;
  breaths?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  side?: Side;
  definition?: ExerciseDef;
  confirmed?: boolean;
  restSec: number;
  load?: number;
  unit: Unit;
  perSide: boolean;
  priority: Priority;
  locked: boolean;
  note?: string;
}

export interface Routine {
  id: string;
  name: string;
  notes: string;
  items: RoutineItem[];
  version: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SnapItem extends RoutineItem {
  name: string;
  tracking: Tracking;
  discipline: Discipline;
  defVersion: number;
  stresses: Region[];
  gear: Gear[];
  loadable: boolean;
  custom: boolean;
  verified: boolean;
  rehab: boolean;
  intensity: 1 | 2;
  cues: string[];
  instructions: string;
}

export type SnapshotSource =
  | { kind: 'routine'; routineId: string; routineVersion: number }
  | { kind: 'exercise'; exerciseId: string }
  | { kind: 'generated'; sessionId: string }
  | { kind: 'edited' };

export interface Snapshot {
  id: string;
  title: string;
  source: SnapshotSource;
  items: SnapItem[];
  createdAt: string;
}

export interface Exception {
  deleted?: boolean;
  moveTo?: string;
  snapshot?: Snapshot;
}

export interface ScheduleEntry {
  id: string;
  rootId: string; // stable across "this and future" splits
  owner: 'user';
  start: string;
  weekdays: number[] | null; // null = one-off
  until: string | null;
  snapshot: Snapshot;
  exceptions: Record<string, Exception>;
  createdAt: string;
}

export interface Occurrence {
  key: string;
  entryId: string;
  rootId: string;
  originalDate: string;
  date: string;
  snapshot: Snapshot;
  recurring: boolean;
  weekdays: number[] | null;
  modified: boolean;
  createdAt: string;
}

export interface ActualSet {
  reps?: number;
  seconds?: number;
  load?: number;
  unit?: Unit;
  breaths?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  side?: Side;
}

export interface Planned {
  sets: number;
  reps?: number;
  seconds?: number;
  load?: number;
  unit?: Unit;
  perSide?: boolean;
  restSec?: number;
  breaths?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  side?: Side;
}

export interface LogV2 {
  itemKey: string;
  exerciseId: string;
  name: string;
  kind: Tracking;
  planned: Planned;
  sets: ActualSet[];
  done: boolean;
  skipped: boolean;
  added: boolean;
}

export interface CompletionV2 {
  id: string;
  date: string;
  occurrenceKey: string | null;
  sessionId: string;
  title: string;
  plannedMinutes: number;
  estimateSec: number | null;
  startedAt: string;
  finishedAt: string;
  activeSeconds: number;
  snapshot: Snapshot | null;
  executedItems?: SnapItem[]; // final execution knowledge, including explicit mid-session additions
  exercises: LogV2[];
  finishedEarly: boolean;
  stoppedForPain: boolean;
  difficulty: number | null;
  adaptation: string[];
}

export interface Clock {
  accMs: number;
  since: number | null;
}

export interface ActiveV2 {
  id: string;
  date: string;
  occurrenceKey: string | null;
  title: string;
  plannedMinutes: number;
  estimateSec: number | null;
  snapshot: Snapshot;
  items: SnapItem[];
  startedAt: string;
  clock: Clock;
  exClock: Clock;
  index: number;
  logs: LogV2[];
  adaptation: string[];
}

export interface StateV2 {
  schemaVersion: 3;
  profile: Profile;
  plan: Plan | null;
  events: PlanEvent[];
  completions: CompletionV2[];
  active: ActiveV2 | null;
  customExercises: ExerciseDef[];
  savedActivities: SavedActivity[];
  routines: Routine[];
  schedule: ScheduleEntry[];
  presets: Record<string, PersonalPreset>;
}

export interface PersonalPreset {
  defaultReps?: number;
  defaultSeconds?: number;
  defaultBreaths?: number;
  defaultDistance?: number;
  defaultDistanceUnit?: DistanceUnit;
}

/** Local bookmark keyed by the shared catalog ID; fallback contains knowledge only, never a dose. */
export interface SavedActivity {
  id: string;
  fallback: Activity;
  sequenceMembers?: SequenceMembership[];
  savedAt: string;
}

export const emptyState = (): StateV2 => ({ schemaVersion: 3, profile: DEFAULT_PROFILE, plan: null, events: [], completions: [], active: null, customExercises: [], savedActivities: [], routines: [], schedule: [], presets: {} });

// ---------------------------------------------------------------- built-in library
const T0 = '2024-01-01T00:00:00.000Z';
const CAT_DISC: Record<Category, Discipline> = { warm: 'conditioning', lower: 'strength', upper: 'strength', core: 'strength', mobility: 'mobility' };
const CAT_AREA: Record<Category, Area[]> = { warm: ['full'], lower: ['lower', 'hips'], upper: ['upper', 'shoulders'], core: ['core'], mobility: ['spine', 'hips'] };

const legacyPresets: StateV2['presets'] = {};
function def(p: Omit<ExerciseDef, 'version' | 'custom' | 'verified' | 'rehab' | 'archived' | 'createdAt' | 'updatedAt' | 'instructions'> & { instructions?: string }): ExerciseDef {
  const { defaultReps, defaultSeconds, ...knowledge } = p;
  legacyPresets[p.id] = { defaultReps, defaultSeconds };
  return { ...knowledge, instructions: p.instructions ?? p.cues.join(' '), version: 1, custom: false, verified: true, rehab: false, archived: false, createdAt: T0, updatedAt: T0 };
}

const FROM_V1: ExerciseDef[] = LIBRARY.map((e) =>
  def({
    id: e.id,
    name: e.name,
    discipline: CAT_DISC[e.category],
    gear: [e.equipment],
    areas: CAT_AREA[e.category],
    tracking: e.kind,
    defaultReps: STARTER_PRESETS[e.id].reps,
    defaultSeconds: STARTER_PRESETS[e.id].seconds,
    perSide: !!e.perSide,
    loadable: e.equipment === 'dumbbells' || e.equipment === 'band',
    stresses: e.stresses,
    intensity: e.intensity,
    cues: e.cues,
  }),
);

type X = [id: string, name: string, d: Discipline, gear: Gear[], areas: Area[], t: Tracking, amt: number, perSide: boolean, loadable: boolean, stresses: Region[], intensity: 1 | 2, cues: string[]];
const EXTRA: X[] = [
  // General yoga — common postures, not a lineage-specific or therapeutic program.
  ['y-down-dog', 'Downward-facing dog', 'yoga', ['mat'], ['shoulders', 'hips', 'wrists'], 'time', 30, false, false, ['wrists', 'shoulders'], 1, ['Hands shoulder-width, hips lift up and back.', 'Bend knees as much as you like.', 'Spread fingers to share load through the hand.']],
  ['y-child', 'Child’s pose', 'yoga', ['mat'], ['hips', 'spine'], 'time', 45, false, false, ['knees'], 1, ['Knees wide or together, hips toward heels.', 'Rest forehead on the mat or a block.', 'Breathe into the back of the ribs.']],
  ['y-cat-cow', 'Cat-cow on all fours', 'yoga', ['mat'], ['spine'], 'reps', 8, false, false, ['wrists', 'knees'], 1, ['Hands under shoulders, knees under hips.', 'Round on the exhale, lengthen on the inhale.', 'Move slowly through the whole spine.']],
  ['y-low-lunge', 'Low lunge', 'yoga', ['mat'], ['hips', 'lower'], 'time', 30, true, false, ['knees'], 1, ['Back knee down, padded if needed.', 'Shift hips forward gently.', 'Keep the front knee over the ankle.']],
  ['y-warrior2', 'Warrior II', 'yoga', ['none'], ['hips', 'lower'], 'time', 30, true, false, ['knees'], 2, ['Wide stance, front knee bent over the ankle.', 'Arms long, shoulders soft.', 'Gaze over the front hand.']],
  ['y-tree', 'Tree pose', 'yoga', ['none'], ['ankles', 'hips'], 'time', 30, true, false, ['ankles'], 1, ['Foot on ankle, calf or inner thigh, never the knee.', 'Hold a wall if needed.', 'Stand tall through the crown.']],
  ['y-fold', 'Seated forward fold', 'yoga', ['mat'], ['spine', 'hips'], 'time', 40, false, false, ['lowerBack'], 1, ['Sit tall, legs long, knees soft.', 'Hinge from the hips, not the upper back.', 'Stop at a mild stretch.']],
  ['y-twist', 'Supine twist', 'yoga', ['mat'], ['spine', 'hips'], 'time', 30, true, false, [], 1, ['Lie on your back, drop both knees to one side.', 'Arms wide, shoulders heavy.', 'Breathe slowly.']],
  ['y-bridge', 'Bridge pose', 'yoga', ['mat'], ['hips', 'spine'], 'time', 25, false, false, ['lowerBack'], 1, ['Feet under knees.', 'Lift hips and lengthen the front of the body.', 'Lower one vertebra at a time.']],
  // Controlled joint mobility — general controlled rotations, not certified or affiliated programming.
  ['m-hip-rot', 'Standing hip controlled rotation', 'mobility', ['none'], ['hips'], 'reps', 3, true, false, [], 1, ['Hold a wall, lift one knee.', 'Draw the biggest slow circle you can without the pelvis moving.', 'Reverse direction.']],
  ['m-shoulder-rot', 'Shoulder controlled rotation', 'mobility', ['none'], ['shoulders'], 'reps', 3, true, false, [], 1, ['Make a gentle fist on the working side.', 'Trace a slow, full circle with a straight arm.', 'Keep the ribs still.']],
  ['m-spine-wave', 'Segmental spine wave', 'mobility', ['none'], ['spine'], 'reps', 4, false, false, [], 1, ['Standing, hands on thighs.', 'Curl down one segment at a time, then roll back up.', 'Small and slow beats big and fast.']],
  ['m-ankle-circle', 'Ankle circles', 'mobility', ['none'], ['ankles'], 'reps', 6, true, false, [], 1, ['Seated or holding support.', 'Draw slow circles with the toes.', 'Both directions.']],
  ['m-wrist-circle', 'Wrist circles', 'mobility', ['none'], ['wrists'], 'reps', 8, false, false, [], 1, ['Interlace fingers or keep hands free.', 'Slow circles each way.', 'Stay in a comfortable range.']],
  ['m-9090', '90/90 hip switch', 'mobility', ['mat'], ['hips'], 'reps', 6, false, false, ['knees'], 1, ['Sit with both knees bent to 90 degrees.', 'Rotate both knees to the other side.', 'Use your hands behind you for support.']],
  ['m-thoracic', 'Quadruped thoracic rotation', 'mobility', ['mat'], ['spine', 'shoulders'], 'reps', 6, true, false, ['wrists', 'knees'], 1, ['On hands and knees, one hand behind head.', 'Rotate elbow up toward the ceiling.', 'Follow the elbow with your eyes.']],
  // Gym strength examples.
  ['g-back-squat', 'Barbell back squat', 'strength', ['barbell'], ['lower', 'hips', 'knees'], 'reps', 6, false, true, ['knees', 'lowerBack'], 2, ['Bar on upper back, feet shoulder-width.', 'Sit down between the heels, chest proud.', 'Drive up through the whole foot.']],
  ['g-bench', 'Barbell bench press', 'strength', ['barbell', 'bench'], ['upper', 'shoulders'], 'reps', 6, false, true, ['shoulders', 'wrists'], 2, ['Eyes under the bar, shoulder blades set.', 'Lower to mid-chest with control.', 'Use a spotter or safeties.']],
  ['g-deadlift', 'Barbell deadlift', 'strength', ['barbell'], ['lower', 'hips', 'spine'], 'reps', 5, false, true, ['lowerBack'], 2, ['Bar over mid-foot, hinge to grip.', 'Brace, push the floor away.', 'Stand tall, lower under control.']],
  ['g-goblet', 'Goblet squat', 'strength', ['dumbbells'], ['lower', 'knees'], 'reps', 10, false, true, ['knees'], 1, ['Hold one weight at the chest.', 'Squat between the heels.', 'Elbows inside knees at the bottom.']],
  ['g-ohp', 'Dumbbell overhead press', 'strength', ['dumbbells'], ['shoulders', 'upper'], 'reps', 8, false, true, ['shoulders'], 2, ['Weights at shoulder height.', 'Press up without arching the low back.', 'Lower slowly.']],
  ['g-pulldown', 'Lat pulldown', 'strength', ['machine'], ['upper', 'shoulders'], 'reps', 10, false, true, [], 1, ['Thighs under the pad.', 'Pull the bar toward the upper chest.', 'Return with control.']],
  ['g-leg-press', 'Leg press', 'strength', ['machine'], ['lower', 'knees'], 'reps', 10, false, true, ['knees'], 1, ['Feet hip-width on the platform.', 'Lower until hips stay down on the seat.', 'Do not lock the knees hard.']],
  ['g-cable-row', 'Seated cable row', 'strength', ['cable'], ['upper'], 'reps', 10, false, true, [], 1, ['Sit tall, slight knee bend.', 'Pull handle to the lower ribs.', 'Let shoulders reach forward on return.']],
  ['g-kb-swing', 'Kettlebell swing', 'conditioning', ['kettlebell'], ['hips', 'full'], 'reps', 12, false, true, ['lowerBack'], 2, ['Hinge, hike the bell back.', 'Snap hips forward to float it.', 'Arms stay relaxed.']],
  ['g-plank', 'Forearm plank', 'strength', ['mat'], ['core'], 'time', 30, false, false, ['shoulders'], 2, ['Elbows under shoulders.', 'Squeeze glutes, long line.', 'Stop when form fades.']],
];

export const BUILTIN: ExerciseDef[] = [
  ...FROM_V1,
  ...EXTRA.map(([id, name, discipline, gear, areas, tracking, amt, perSide, loadable, stresses, intensity, cues]) =>
    def({ id, name, discipline, gear, areas, tracking, defaultReps: tracking === 'reps' ? amt : undefined, defaultSeconds: tracking === 'time' ? amt : undefined, perSide, loadable, stresses, intensity, cues }),
  ),
];

let catalog: CatalogRelease = (starter as { release: CatalogRelease }).release;
export function useCatalogRelease(release: CatalogRelease) { catalog = release; }
const JOINT_REGION: Partial<Record<string, Region>> = { knee: 'knees', wrist: 'wrists', shoulder: 'shoulders', 'lumbar-spine': 'lowerBack', ankle: 'ankles' };
export function activityDef(a: Activity): ExerciseDef {
  return {
    id: a.id, version: a.version, name: a.name, discipline: a.discipline,
    gear: a.equipment ?? [], areas: ['full'], tracking: a.supportedMetrics[0] === 'duration' ? 'time' : a.supportedMetrics[0],
    perSide: a.laterality === 'unilateral', loadable: a.loadUnits.length > 0,
    stresses: a.adaptation.loadedJoints.flatMap(j => JOINT_REGION[j] ? [JOINT_REGION[j]!] : []),
    intensity: a.difficulty === 'advanced' ? 2 : 1, instructions: a.description,
    cues: a.execution, custom: a.authorship === 'user', verified: false, rehab: false,
    archived: a.archived, createdAt: T0, updatedAt: T0, activity: a,
  };
}
/** Legacy compatibility descriptions use the same dosage-free knowledge contract. */
export function knowledgeOf(d: ExerciseDef): Activity {
  if (d.activity) return d.activity;
  return {
    id: d.id, version: d.version, name: d.name, englishName: d.name, sanskritName: null, aliases: [],
    type: d.discipline === 'yoga' ? 'asana' : d.discipline === 'mobility' ? 'mobility-drill' : d.discipline === 'conditioning' ? 'conditioning-activity' : 'exercise',
    discipline: d.discipline, family: 'general', supportedMetrics: [d.tracking === 'time' ? 'duration' : d.tracking],
    distanceUnits: d.tracking === 'distance' ? ['m', 'km', 'mi', 'yd'] : [], loadUnits: d.loadable ? ['kg', 'lb'] : [],
    laterality: d.perSide ? 'unilateral' : 'bilateral', equipment: d.gear, difficulty: 'unknown',
    primaryMuscles: null, secondaryMuscles: null, joints: null, actions: null, movementPatterns: null,
    description: d.instructions || d.name, setup: [], execution: d.cues, cues: d.cues,
    commonMistakes: null, benefits: [], precautions: ['Stop if anything hurts.'], modifications: [],
    instructionNeeded: false, seriesContext: [], mobility: null,
    adaptation: { eligible: !d.custom && d.verified, loadingKnown: !d.custom && d.verified,
      loadedJoints: d.stresses.map(r => ({ knees: 'knee', wrists: 'wrist', shoulders: 'shoulder', lowerBack: 'lumbar-spine', ankles: 'ankle' } as const)[r]),
      rationale: d.custom || !d.verified ? 'Unknown suitability/loading: not eligible for automatic adaptation.' : 'Legacy conservative starter suitability and loaded-area metadata; not medical certification.' },
    sourceIds: [], authorship: d.custom ? 'user' : 'maintainer', reviewStatus: 'unreviewed', archived: d.archived,
  };
}
export function personalCatalog(custom: ExerciseDef[]): CatalogRelease {
  const ids = new Set(custom.map(d => d.id));
  return { ...catalog, activities: [...catalog.activities.filter(a => !ids.has(a.id)), ...custom.map(knowledgeOf), ...legacyExercises().filter(d => !ids.has(d.id)).map(knowledgeOf)],
    sequences: [...catalog.sequences.filter(m => !ids.has(m.sequenceId)), ...custom.flatMap(d => d.sequenceMembers ?? [])] };
}
export function sequenceDefinitions(id: string, custom: ExerciseDef[] = []): { definition: ExerciseDef; side: Side }[] {
  const release = personalCatalog(custom);
  const expanded = expandSequence(release, id);
  if (expanded.length > 500) throw new Error('Sequence expands to more than 500 activities. Reduce its nested membership.');
  return expanded.map(m => ({ definition: findExercise(custom, m.activityId)!, side: m.side }));
}

const activityNames = (a: Activity) => [a.name, a.englishName, a.sanskritName, ...a.aliases]
  .filter((name): name is string => !!name).map(normalizedIdentity).filter(Boolean);
function legacyExercises(): ExerciseDef[] {
  const sharedNames = catalog.activities.map(activityNames);
  return BUILTIN.filter(d => !catalog.activities.some(a => a.id === d.id) &&
    !sharedNames.some(names => names.includes(normalizedIdentity(d.name))));
}
export function exerciseSourceLabel(e: ExerciseDef): string {
  if (e.custom) return 'On this device · user-authored · unreviewed';
  if (e.activity) return `Shared catalog · ${e.activity.reviewStatus}`;
  return 'Legacy built-in · unreviewed';
}
export function allExercises(custom: ExerciseDef[]): ExerciseDef[] {
  return [...catalog.activities.map(activityDef), ...legacyExercises(), ...custom];
}
export function findExercise(custom: ExerciseDef[], id: string): ExerciseDef | undefined {
  return custom.find((e) => e.id === id) ?? (catalog.activities.find(a => a.id === id) ? activityDef(catalog.activities.find(a => a.id === id)!) : BUILTIN.find((e) => e.id === id));
}

export type ExerciseLibrarySource = 'all' | 'shared' | 'legacy' | 'local';
export interface LibraryFilter {
  query?: string;
  discipline?: Discipline | null;
  gear?: Gear | null;
  area?: Area | null;
  tracking?: Tracking | null;
  includeArchived?: boolean;
  source?: ExerciseLibrarySource | 'builtin' | 'custom';
  type?: Activity['type'] | null;
  muscle?: string | null;
  joint?: string | null;
  difficulty?: Activity['difficulty'] | null;
}
export function searchLibrary(custom: ExerciseDef[], f: LibraryFilter): ExerciseDef[] {
  const q = (f.query ?? '').trim().toLowerCase();
  return allExercises(custom)
    .filter((e) => (f.includeArchived ? true : !e.archived))
    .filter((e) => f.source === 'shared' ? !!e.activity && !e.custom :
      f.source === 'legacy' ? !e.activity && !e.custom :
      f.source === 'local' || f.source === 'custom' ? e.custom :
      f.source === 'builtin' ? !e.custom : true)
    .filter((e) => !f.discipline || e.discipline === f.discipline)
    .filter((e) => !f.gear || e.gear.includes(f.gear))
    .filter((e) => !f.area || e.areas.includes(f.area))
    .filter((e) => !f.tracking || knowledgeOf(e).supportedMetrics.includes(f.tracking === 'time' ? 'duration' : f.tracking))
    .filter(e => !f.type || knowledgeOf(e).type === f.type)
    .filter(e => !f.difficulty || knowledgeOf(e).difficulty === f.difficulty)
    .filter(e => !f.muscle || [...(knowledgeOf(e).primaryMuscles ?? []), ...(knowledgeOf(e).secondaryMuscles ?? [])].includes(f.muscle as never))
    .filter(e => !f.joint || knowledgeOf(e).joints?.includes(f.joint as never))
    .filter((e) => !q || [e.name, e.instructions, knowledgeOf(e).englishName, knowledgeOf(e).sanskritName, ...knowledgeOf(e).aliases].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) || e.areas.some((a) => AREA_LABEL[a].toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Catalog search filters are intentionally separate from legacy picker filters. */
export interface CatalogSearchFilters {
  discipline: Activity['discipline'][];
  equipment: Gear | null;
  difficulty: Activity['difficulty'] | null;
  area: Area | null;
  muscle: string | null;
  joint: string | null;
  type: Activity['type'] | null;
  family: Activity['family'] | null;
  metric: Activity['supportedMetrics'][number] | null;
}

export const emptyCatalogSearchFilters = (): CatalogSearchFilters => ({
  discipline: [], equipment: null, difficulty: null, area: null, muscle: null,
  joint: null, type: null, family: null, metric: null,
});

/** Normalize user input and catalog text equally, including accents and Sanskrit diacritics. */
export function normalizeCatalogSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim().replace(/\s+/g, ' ');
}

/** Infer broad areas only from explicit joint/muscle metadata; null metadata stays unknown. */
export function catalogAreas(activity: Activity): Area[] {
  const areas = new Set<Area>();
  for (const joint of activity.joints ?? []) {
    if (['cervical-spine', 'thoracic-spine', 'lumbar-spine'].includes(joint)) areas.add('spine');
    if (['scapula', 'shoulder'].includes(joint)) areas.add('shoulders');
    if (joint === 'wrist') areas.add('wrists');
    if (joint === 'knee') areas.add('knees');
    if (joint === 'ankle' || joint === 'toes') areas.add('ankles');
    if (joint === 'hip') areas.add('hips');
  }
  for (const muscle of [...(activity.primaryMuscles ?? []), ...(activity.secondaryMuscles ?? [])]) {
    if (['quadriceps', 'hamstrings', 'glutes', 'calves', 'tibialis', 'adductors', 'abductors', 'feet'].includes(muscle)) areas.add('lower');
    if (['abdominals', 'obliques', 'spinal-erectors'].includes(muscle)) areas.add('core');
    if (['lats', 'trapezius', 'rhomboids', 'pectorals', 'deltoids', 'rotator-cuff', 'biceps', 'triceps', 'forearms', 'neck'].includes(muscle)) areas.add('upper');
  }
  if (areas.size > 1) areas.add('full');
  return [...areas];
}

export function catalogActivityMatches(activity: Activity, filters: CatalogSearchFilters, query = ''): boolean {
  if (activity.archived) return false;
  if (filters.discipline.length && !filters.discipline.includes(activity.discipline)) return false;
  if (filters.equipment && !activity.equipment?.includes(filters.equipment)) return false;
  if (filters.difficulty && activity.difficulty !== filters.difficulty) return false;
  if (filters.area && !catalogAreas(activity).includes(filters.area)) return false;
  if (filters.muscle && ![...(activity.primaryMuscles ?? []), ...(activity.secondaryMuscles ?? [])].includes(filters.muscle as never)) return false;
  if (filters.joint && !activity.joints?.includes(filters.joint as never)) return false;
  if (filters.type && activity.type !== filters.type) return false;
  if (filters.family && activity.family !== filters.family) return false;
  if (filters.metric && !activity.supportedMetrics.includes(filters.metric)) return false;
  const q = normalizeCatalogSearchText(query);
  if (q) {
    const names = [activity.name, activity.englishName, activity.sanskritName, ...activity.aliases]
      .filter((name): name is string => !!name)
      .map(normalizeCatalogSearchText);
    if (!names.some(name => name.includes(q))) return false;
  }
  return true;
}

export function searchCatalog(activities: Activity[], filters: CatalogSearchFilters, query = ''): Activity[] {
  return activities.filter(activity => catalogActivityMatches(activity, filters, query))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type CatalogFilterFacet = keyof CatalogSearchFilters;
/** Count a prospective option against the full local catalog while preserving other facets. */
export function catalogFacetCount(
  activities: Activity[],
  filters: CatalogSearchFilters,
  facet: CatalogFilterFacet,
  value: string,
  query = '',
): number {
  const candidate = { ...filters, [facet]: facet === 'discipline' ? [] : null } as CatalogSearchFilters;
  if (facet === 'discipline') {
    const selected = filters.discipline.includes(value as Activity['discipline'])
      ? filters.discipline
      : [...filters.discipline, value as Activity['discipline']];
    candidate.discipline = selected;
  } else {
    (candidate as unknown as Record<string, unknown>)[facet] = value;
  }
  return searchCatalog(activities, candidate, query).length;
}

// ---------------------------------------------------------------- validation
export function validateExercise(e: Pick<ExerciseDef, 'name' | 'tracking' | 'defaultReps' | 'defaultSeconds' | 'areas' | 'gear'>): string[] {
  const errs: string[] = [];
  if (!e.name.trim()) errs.push('Give the activity a name.');
  if (e.name.trim().length > 60) errs.push('Keep the name under 60 characters.');
  if (!e.areas.length) errs.push('Pick at least one movement area.');
  if (!e.gear.length) errs.push('Pick equipment, or “No equipment”.');
  return errs;
}

export function validateItem(i: RoutineItem, tracking: Tracking): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(i.sets) || i.sets < 1 || i.sets > 20) errs.push('Sets must be 1 to 20.');
  if (tracking === 'reps' && (!Number.isInteger(i.reps) || !i.reps || i.reps < 1 || i.reps > 200)) errs.push('Reps must be a whole count from 1 to 200.');
  if (tracking === 'time' && (!i.seconds || i.seconds < 5 || i.seconds > 3600)) errs.push('Time must be 5 s to 60 min.');
  if (tracking === 'breaths' && (!Number.isInteger(i.breaths) || (i.breaths ?? 0) < 1 || (i.breaths ?? 0) > 10000)) errs.push('Enter a whole breath count from 1 to 10000.');
  if (tracking === 'distance' && (!i.distance || i.distance < 0 || !Number.isFinite(i.distance) || i.distance > 1000000 || !i.distanceUnit)) errs.push('Enter a positive distance and select m, km, mi or yd.');
  const measurement = tracking === 'time' ? 'seconds' : tracking;
  if (['reps', 'seconds', 'breaths', 'distance'].some(k => k !== measurement && i[k as 'reps'] != null)) errs.push('Choose one measurement per target; clear the incompatible amount.');
  if (i.confirmed === false) errs.push('Enter and confirm an explicit target for this activity.');
  if (i.definition?.activity) {
    const a = i.definition.activity;
    if (a.type === 'sequence') errs.push('Expand the sequence into ordered activities and enter an explicit target for each member.');
    if (!a.supportedMetrics.includes(tracking === 'time' ? 'duration' : tracking)) errs.push('Choose a supported measurement.');
    if (tracking === 'distance' && !a.distanceUnits.includes(i.distanceUnit!)) errs.push('Choose a supported distance unit.');
    if (i.load != null && !a.loadUnits.includes(i.unit)) errs.push('This activity does not support external load.');
    if (i.perSide && !['unilateral', 'alternating'].includes(a.laterality)) errs.push('Per-side targets need known unilateral or alternating laterality.');
    if (['left', 'right', 'alternating'].includes(i.side ?? '') && !['unilateral', 'alternating'].includes(a.laterality)) errs.push('This activity does not support separate sides.');
  }
  if (!Number.isFinite(i.restSec) || i.restSec < 0 || i.restSec > 600) errs.push('Rest must be 0 to 600 s.');
  if (i.load != null && (i.load < 0 || i.load > 1000 || Number.isNaN(i.load))) errs.push('Load must be 0 to 1000.');
  return errs;
}

export function validateRoutine(r: Pick<Routine, 'name' | 'items'>, custom: ExerciseDef[]): string[] {
  const errs: string[] = [];
  if (!r.name.trim()) errs.push('Name the routine.');
  if (!r.items.length) errs.push('Add at least one activity.');
  r.items.forEach((it, n) => {
    const d = it.definition ?? findExercise(custom, it.exerciseId);
    if (!d) errs.push(`Activity ${n + 1} is missing from the library.`);
    else validateItem(it, d.activity ? trackingOf(it, d.tracking) : d.tracking).forEach((e) => errs.push(`${d.name}: ${e}`));
  });
  return errs;
}

/** Low-energy timed holds shrink ~25% (rounded to 5 s, floor 10 s) but never exceed the original. */
export function lowEnergySeconds(orig: number): number {
  return Math.min(orig, Math.max(10, Math.round((orig * 0.75) / 5) * 5));
}

/** True when an item's stored target doesn't fit the exercise's current tracking kind. */
export function targetMismatch(it: Pick<RoutineItem, 'reps' | 'seconds' | 'breaths' | 'distance'>, tracking: Tracking): boolean {
  const amounts = { reps: it.reps, time: it.seconds, breaths: it.breaths, distance: it.distance };
  return !amounts[tracking] || Object.entries(amounts).some(([k, v]) => k !== tracking && v != null);
}
/** Explicit reconciliation: drop the stale target and adopt the exercise's current default. */
export function reconcileItem(it: RoutineItem, d: ExerciseDef): RoutineItem {
  if (!targetMismatch(it, d.tracking)) return it;
  const target = { reps: undefined, seconds: undefined, breaths: undefined, distance: undefined };
  if (d.tracking === 'reps') return { ...it, ...target, reps: d.defaultReps || 8, confirmed: true };
  if (d.tracking === 'time') return { ...it, ...target, seconds: d.defaultSeconds || 30, confirmed: true };
  if (d.tracking === 'breaths') return { ...it, ...target, confirmed: false };
  return { ...it, ...target, distanceUnit: d.activity?.distanceUnits[0] ?? 'm', confirmed: false };
}
/** Items whose targets need reconciling after an activity's measurement changes. */
export function routineMismatches(r: Pick<Routine, 'items'>, custom: ExerciseDef[]): { key: string; name: string; tracking: Tracking }[] {
  return r.items.flatMap((it) => {
    if (it.definition) return [];
    const d = findExercise(custom, it.exerciseId);
    return d && targetMismatch(it, d.tracking) ? [{ key: it.key, name: d.name, tracking: d.tracking }] : [];
  });
}
/** Boundary check before scheduling or starting: every item needs a valid target for its own tracking kind. */
export function snapshotErrors(items: SnapItem[]): string[] {
  if (!items.length) return ['There are no activities to do.'];
  return items.flatMap((i) => {
    if (i.definition?.activity && targetMismatch(i, i.tracking)) return [`${i.name}: enter a supported target in the routine or date editor first.`];
    if (targetMismatch(i, i.tracking)) return [`${i.name} now tracks ${trackingLabel(i.tracking)}, but its target needs reconciling. Open the routine and confirm a new target first.`];
    return validateItem(itemOf(i), i.tracking).map((e) => `${i.name}: ${e}`);
  });
}

/** Load + unit for the next set: resumes from the last logged set (both together), else the plan. */
export function nextLoad(item: Pick<SnapItem, 'load' | 'unit'>, sets: ActualSet[]): { load: number; unit: Unit } {
  const last = [...sets].reverse().find((x) => x.load != null);
  if (last) return { load: last.load as number, unit: last.unit ?? item.unit };
  return { load: item.load ?? 0, unit: item.unit };
}
/** Single path for building a logged set: timed or reps, manual or automatic. */
export function buildSet(item: Pick<SnapItem, 'tracking' | 'loadable' | 'load' | 'unit'> & Partial<Pick<SnapItem, 'distanceUnit' | 'side'>>, amount: number, loadState: { load: number; unit: Unit }): ActualSet {
  const extra = item as SnapItem;
  const base: ActualSet = { ...(item.tracking === 'reps' ? { reps: amount } : item.tracking === 'time' ? { seconds: amount } : item.tracking === 'breaths' ? { breaths: amount } : { distance: amount, distanceUnit: extra.distanceUnit }), ...(extra.side ? { side: extra.side } : {}) };
  const showLoad = item.loadable || item.load != null;
  return showLoad ? { ...base, load: loadState.load, unit: loadState.unit } : base;
}

// ---------------------------------------------------------------- items & snapshots
export function makeItem(d: ExerciseDef, unit: Unit = 'kg', preset?: StateV2['presets'][string]): RoutineItem {
  const dose = preset ?? legacyPresets[d.id] ?? { defaultReps: d.defaultReps, defaultSeconds: d.defaultSeconds };
  return {
    key: newId('it'),
    exerciseId: d.id,
    sets: d.discipline === 'yoga' || d.discipline === 'mobility' ? 1 : 3,
    reps: d.tracking === 'reps' ? dose.defaultReps : undefined,
    seconds: d.tracking === 'time' ? dose.defaultSeconds : undefined,
    breaths: d.tracking === 'breaths' ? dose.defaultBreaths : undefined,
    distance: d.tracking === 'distance' ? dose.defaultDistance : undefined,
    distanceUnit: d.tracking === 'distance' ? dose.defaultDistanceUnit ?? d.activity?.distanceUnits[0] ?? 'm' : undefined,
    restSec: d.discipline === 'strength' ? 60 : 20,
    unit,
    perSide: d.perSide,
    priority: 'normal',
    locked: false,
    side: 'unspecified',
    definition: dosageFree(d),
    confirmed: d.activity ? false : undefined,
  };
}

function trackingLabel(tracking: Tracking): string {
  return tracking;
}

export function makeSavedActivity(id: string, a: Activity, sequenceMembers?: SequenceMembership[], savedAt = new Date().toISOString()): SavedActivity {
  return {
    id,
    fallback: activitySchema.parse(JSON.parse(JSON.stringify(a))),
    ...(sequenceMembers ? { sequenceMembers: sequenceMembers.map(m => membershipSchema.parse(m)) } : {}),
    savedAt,
  };
}

export function setSavedActivity(state: StateV2, id: string, saved: boolean, release: CatalogRelease, savedAt?: string): StateV2 {
  const exists = state.savedActivities.some(item => item.id === id);
  if (!saved) return exists ? { ...state, savedActivities: state.savedActivities.filter(item => item.id !== id) } : state;
  if (exists) return state;
  const activity = release.activities.find(item => item.id === id);
  if (!activity || activity.authorship !== 'maintainer') return state;
  const members = release.sequences.filter(item => item.sequenceId === id);
  return { ...state, savedActivities: [...state.savedActivities, makeSavedActivity(id, activity, members, savedAt)] };
}

export function resolveSavedActivity(saved: SavedActivity, release: CatalogRelease): { activity: Activity; unavailable: boolean } {
  const current = release.activities.find(activity => activity.id === saved.id);
  return { activity: current ?? saved.fallback, unavailable: !current };
}

export function snapItem(it: RoutineItem, d: ExerciseDef): SnapItem {
  d = it.definition ?? d;
  return {
    ...it,
    cues: [...d.cues],
    name: d.name,
    tracking: d.activity ? trackingOf(it, d.tracking) : d.tracking,
    discipline: d.discipline,
    defVersion: d.version,
    stresses: [...d.stresses],
    gear: [...d.gear],
    loadable: d.loadable,
    custom: d.custom,
    verified: d.verified,
    rehab: d.rehab,
    intensity: d.intensity,
    instructions: d.instructions,
  };
}

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

function mkSnap(title: string, source: SnapshotSource, items: SnapItem[], now: string): Snapshot {
  return deepFreeze(JSON.parse(JSON.stringify({ id: newId('snap'), title, source, items, createdAt: now })));
}

export function snapshotFromRoutine(r: Routine, custom: ExerciseDef[], now = new Date().toISOString()): Snapshot {
  const items = r.items.flatMap((it) => {
    const d = it.definition ?? findExercise(custom, it.exerciseId);
    return d ? [snapItem(it, d)] : [];
  });
  return mkSnap(r.name, { kind: 'routine', routineId: r.id, routineVersion: r.version }, items, now);
}
/** Build a complete, validated launch snapshot; never launch only the resolvable subset. */
export function routineLaunchSnapshot(r: Routine, custom: ExerciseDef[], now = new Date().toISOString()): { snapshot: Snapshot; errors: string[] } {
  const snapshot = snapshotFromRoutine(r, custom, now);
  const missing = snapshot.items.length === r.items.length ? [] : ['An activity is missing from the library. Edit the routine before starting.'];
  return { snapshot, errors: [...missing, ...snapshotErrors(snapshot.items)] };
}
export function snapshotFromExercise(d: ExerciseDef, now = new Date().toISOString()): Snapshot {
  return mkSnap(d.name, { kind: 'exercise', exerciseId: d.id }, [snapItem(makeItem(d), d)], now);
}
export function snapshotFromItems(title: string, items: SnapItem[], source: SnapshotSource = { kind: 'edited' }, now = new Date().toISOString()): Snapshot {
  return mkSnap(title, source, items, now);
}
export function snapshotFromGenerated(s: SessionPlan, now = new Date().toISOString()): Snapshot {
  const items = s.exercises.map((e, n) => {
    const d = BUILTIN.find((b) => b.id === e.exerciseId);
    const base: RoutineItem = { key: `${e.exerciseId}-${n}`, exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, seconds: e.seconds, restSec: e.restSec, unit: 'kg', perSide: !!e.perSide, priority: 'normal', locked: false };
    if (d) return snapItem(base, d);
    return { ...base, name: e.name, tracking: e.kind, discipline: 'strength' as Discipline, defVersion: 1, stresses: [], gear: ['none' as Gear], loadable: false, custom: false, verified: true, rehab: false, intensity: 1 as const, cues: [], instructions: '' };
  });
  return mkSnap(s.title, { kind: 'generated', sessionId: s.id }, items, now);
}

/** Convert a snapshot item back to an editable routine item (used when editing a scheduled occurrence). */
export function itemOf(s: SnapItem): RoutineItem {
  return { key: s.key, exerciseId: s.exerciseId, sets: s.sets, reps: s.reps, seconds: s.seconds, breaths: s.breaths, distance: s.distance, distanceUnit: s.distanceUnit, side: s.side, definition: s.definition, confirmed: s.confirmed, restSec: s.restSec, load: s.load, unit: s.unit, perSide: s.perSide, priority: s.priority, locked: s.locked, note: s.note };
}
export function trackingOf(it: Partial<RoutineItem>, fallback: Tracking): Tracking {
  return it.breaths != null ? 'breaths' : it.distance != null ? 'distance' : it.seconds != null ? 'time' : it.reps != null ? 'reps' : fallback;
}
export function definitionOfSnap(s: SnapItem): ExerciseDef {
  return s.definition ?? { ...s, id: s.exerciseId, version: s.defVersion, areas: ['full'], archived: false, createdAt: '', updatedAt: '' };
}

// ---------------------------------------------------------------- time estimate (rest included)
export const EST = { secPerRep: 3, transitionSec: 15 };
export const EST_EXPLAIN = `Estimate: ${EST.secPerRep} s per rep, timed holds as written, both sides counted unless one side is selected, rest after every set, ${EST.transitionSec} s to set up each activity. Breath counts and distances have unknown duration; no pace or speed is assumed.`;

type Estimable = { tracking: Tracking; reps?: number; seconds?: number; side?: Side; perSide: boolean; sets: number; restSec: number };
export function workSec(i: Estimable): number {
  if (i.tracking === 'breaths' || i.tracking === 'distance') return NaN;
  if (i.tracking === 'reps' ? i.reps == null : i.seconds == null) return NaN;
  const sides = i.perSide && !['left', 'right'].includes(i.side ?? '') ? 2 : 1;
  return (i.tracking === 'reps' ? (i.reps ?? 0) * EST.secPerRep : i.seconds ?? 0) * sides;
}
export function estimateSec(items: Estimable[]): number {
  if (!items.length) return 0;
  const total = items.reduce((n, i) => n + i.sets * workSec(i) + i.sets * i.restSec + EST.transitionSec, 0);
  return total - items[items.length - 1].restSec; // no rest after the final set
}
export const minutesLabel = (sec: number | null) => sec == null || !Number.isFinite(sec) ? 'Duration unknown' : `${Math.max(1, Math.round(sec / 60))} min`;
export function targetLabel(i: Partial<ActualSet & Planned>): string {
  const amount = i.reps != null ? `${i.reps} reps` : i.seconds != null ? `${i.seconds}s` : i.breaths != null ? `${i.breaths} breaths` : i.distance != null ? `${i.distance} ${i.distanceUnit ?? '(choose unit)'}` : 'Target required';
  return `${amount}${i.side && i.side !== 'unspecified' ? ` · ${i.side}` : ''}${i.perSide ? ' / side' : ''}${i.load != null ? ` @ ${i.load} ${i.unit ?? ''}` : ''}`;
}

// ---------------------------------------------------------------- recurrence
export function seriesHas(e: Pick<ScheduleEntry, 'start' | 'weekdays' | 'until'>, d: string): boolean {
  if (d < e.start) return false;
  if (e.weekdays === null) return d === e.start;
  if (e.until && d > e.until) return false;
  return e.weekdays.includes(weekday(d));
}

function occOf(e: ScheduleEntry, orig: string): Occurrence {
  const ex = e.exceptions[orig];
  return {
    key: `${e.rootId}@${orig}`,
    entryId: e.id,
    rootId: e.rootId,
    originalDate: orig,
    date: ex?.moveTo ?? orig,
    snapshot: ex?.snapshot ?? e.snapshot,
    recurring: e.weekdays !== null,
    weekdays: e.weekdays,
    modified: !!ex && (!!ex.snapshot || !!ex.moveTo),
    createdAt: e.createdAt,
  };
}

export function occurrencesBetween(schedule: ScheduleEntry[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const e of schedule) {
    if (e.weekdays === null) {
      const ex = e.exceptions[e.start];
      if (ex?.deleted) continue;
      const d = ex?.moveTo ?? e.start;
      if (d >= from && d <= to) out.push(occOf(e, e.start));
      continue;
    }
    if (e.weekdays.length) {
      let d = from > e.start ? from : e.start;
      const end = e.until && e.until < to ? e.until : to;
      let guard = 0;
      while (d <= end && guard++ < 1500) {
        if (seriesHas(e, d)) {
          const ex = e.exceptions[d];
          if (!ex?.deleted && !ex?.moveTo) out.push(occOf(e, d));
        }
        d = addDays(d, 1);
      }
    }
    for (const [orig, ex] of Object.entries(e.exceptions)) {
      if (ex.moveTo && !ex.deleted && seriesHas(e, orig) && ex.moveTo >= from && ex.moveTo <= to) out.push(occOf(e, orig));
    }
  }
  return out.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.createdAt !== b.createdAt ? (a.createdAt < b.createdAt ? -1 : 1) : a.key < b.key ? -1 : 1));
}

export function findOccurrence(schedule: ScheduleEntry[], key: string): Occurrence | null {
  const at = key.lastIndexOf('@');
  if (at < 0) return null;
  const rootId = key.slice(0, at);
  const orig = key.slice(at + 1);
  const e = schedule.find((x) => x.rootId === rootId && seriesHas(x, orig));
  if (!e || e.exceptions[orig]?.deleted) return null;
  return occOf(e, orig);
}

export function scheduleEntry(snapshot: Snapshot, start: string, weekdays: number[] | null = null, until: string | null = null, now = new Date().toISOString()): ScheduleEntry {
  const id = newId('sch');
  const wd = weekdays && weekdays.length ? [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort() : null;
  return { id, rootId: id, owner: 'user', start, weekdays: wd, until: wd ? until : null, snapshot, exceptions: {}, createdAt: now };
}

const setEx = (e: ScheduleEntry, orig: string, patch: Exception): ScheduleEntry => {
  const next: Exception = { ...(e.exceptions[orig] ?? {}), ...patch };
  if (next.moveTo === orig) delete next.moveTo;
  return { ...e, exceptions: { ...e.exceptions, [orig]: next } };
};
const pickEx = (ex: Record<string, Exception>, keep: (d: string) => boolean) => Object.fromEntries(Object.entries(ex).filter(([d]) => keep(d)));

export function moveOccurrence(schedule: ScheduleEntry[], occ: Occurrence, to: string): ScheduleEntry[] {
  return schedule.map((e) => (e.id === occ.entryId ? setEx(e, occ.originalDate, { moveTo: to }) : e));
}

export function deleteOccurrence(schedule: ScheduleEntry[], occ: Occurrence, scope: Scope): ScheduleEntry[] {
  const e = schedule.find((x) => x.id === occ.entryId);
  if (!e) return schedule;
  if (!occ.recurring) return schedule.filter((x) => x.id !== e.id);
  if (scope === 'one') return schedule.map((x) => (x.id === e.id ? setEx(x, occ.originalDate, { deleted: true }) : x));
  const cut = occ.originalDate;
  return schedule.flatMap((x) => {
    if (x.rootId !== e.rootId) return [x];
    if (x.start >= cut) return [];
    if (x.id !== e.id) return [x];
    return [{ ...x, until: addDays(cut, -1), exceptions: pickEx(x.exceptions, (d) => d < cut) }];
  });
}

export function editOccurrence(schedule: ScheduleEntry[], occ: Occurrence, snapshot: Snapshot, scope: Scope, weekdays?: number[], now = new Date().toISOString()): ScheduleEntry[] {
  const e = schedule.find((x) => x.id === occ.entryId);
  if (!e) return schedule;
  if (scope === 'one' || !occ.recurring) {
    if (!occ.recurring) return schedule.map((x) => (x.id === e.id ? { ...x, snapshot } : x));
    return schedule.map((x) => (x.id === e.id ? setEx(x, occ.originalDate, { snapshot }) : x));
  }
  const cut = occ.originalDate;
  const wd = weekdays && weekdays.length ? [...new Set(weekdays)].sort() : null;
  const stripSnap = (ex: Record<string, Exception>) =>
    Object.fromEntries(Object.entries(ex).map(([d, v]) => {
      const { snapshot: _s, ...rest } = v;
      return [d, rest];
    }).filter(([, v]) => Object.keys(v as object).length > 0));
  return schedule.flatMap((x) => {
    if (x.rootId !== e.rootId) return [x];
    if (x.start >= cut) return [{ ...x, snapshot, weekdays: wd ?? x.weekdays, exceptions: stripSnap(x.exceptions) }];
    if (x.id !== e.id) return [x];
    const head: ScheduleEntry = { ...x, until: addDays(cut, -1), exceptions: pickEx(x.exceptions, (d) => d < cut) };
    const tail: ScheduleEntry = { ...x, id: newId('sch'), start: cut, weekdays: wd ?? x.weekdays, snapshot, exceptions: stripSnap(pickEx(x.exceptions, (d) => d >= cut)), createdAt: x.createdAt };
    void now;
    return [head, tail];
  });
}

/** Scheduled entries built from a routine that still have occurrences on/after `from` (90-day horizon). */
export function futureRoutineUses(schedule: ScheduleEntry[], routineId: string, from: string): number {
  return occurrencesBetween(schedule, from, addDays(from, 90)).filter((o) => o.snapshot.source.kind === 'routine' && o.snapshot.source.routineId === routineId).length;
}

/**
 * Explicit, opt-in: refresh future occurrences of a routine with a new snapshot.
 * Past dates, completed logs and per-occurrence edits are left untouched.
 */
export function applyRoutineToFuture(schedule: ScheduleEntry[], routineId: string, snapshot: Snapshot, from: string): { schedule: ScheduleEntry[]; changed: number } {
  let changed = 0;
  const isMine = (e: ScheduleEntry) => e.snapshot.source.kind === 'routine' && e.snapshot.source.routineId === routineId;
  const next = schedule.flatMap((e) => {
    if (!isMine(e)) return [e];
    if (e.weekdays === null) {
      const ex = e.exceptions[e.start];
      const d = ex?.moveTo ?? e.start;
      if (ex?.deleted || d < from) return [e];
      changed++;
      return [{ ...e, snapshot }];
    }
    if (e.until && e.until < from) return [e];
    changed++;
    if (e.start >= from) return [{ ...e, snapshot }];
    const head: ScheduleEntry = { ...e, until: addDays(from, -1), exceptions: pickEx(e.exceptions, (d) => d < from) };
    const tail: ScheduleEntry = { ...e, id: newId('sch'), start: from, snapshot, exceptions: pickEx(e.exceptions, (d) => d >= from) };
    return [head, tail];
  });
  return { schedule: next, changed };
}

// ---------------------------------------------------------------- adaptation
export interface AdaptOptions {
  targetMinutes: number | null;
  lowEnergy: boolean;
  approvedSubs: Record<string, string>; // itemKey -> replacement exerciseId (user approved)
}
export interface Suggestion {
  itemKey: string;
  itemName: string;
  reason: string;
  options: { id: string; name: string }[];
}
export interface AdaptResult {
  items: SnapItem[];
  notes: string[];
  safety: string[];
  estimateBefore: number;
  estimateAfter: number;
  fits: boolean;
  infeasible: string | null;
  suggestions: Suggestion[];
  changed: boolean;
}

function availableGear(p: Profile): Set<Gear> {
  return new Set<Gear>(['none', ...p.equipment]);
}
function permitted(d: ExerciseDef): boolean {
  const a = knowledgeOf(d);
  return a.adaptation.eligible && a.adaptation.loadingKnown && a.equipment !== null && a.difficulty !== 'advanced' && !a.instructionNeeded && a.type !== 'sequence' && !d.custom && !d.rehab;
}

function subOptions(item: SnapItem, p: Profile, custom: ExerciseDef[]): { id: string; name: string }[] {
  const gear = availableGear(p);
  return allExercises(custom).filter((d) => d.id !== item.exerciseId && !d.archived && permitted(d))
    .filter((d) => !d.stresses.some((r) => p.exclusions.includes(r)))
    .filter((d) => d.gear.every((g) => gear.has(g)))
    .filter(d => knowledgeOf(d).supportedMetrics.includes(item.tracking === 'time' ? 'duration' : item.tracking))
    .filter(d => validateItem({ ...itemOf(item), exerciseId: d.id, definition: dosageFree(d) }, item.tracking).length === 0)
    .map((d) => ({ d, score: (d.discipline === item.discipline ? 2 : 0) + d.areas.filter((a) => (findExercise(custom, item.exerciseId)?.areas ?? []).includes(a)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.d.name.localeCompare(b.d.name))
    .slice(0, 3)
    .map((x) => ({ id: x.d.id, name: x.d.name }));
}

export function adapt(snapshot: Snapshot, p: Profile, custom: ExerciseDef[], opts: AdaptOptions, history: Parameters<typeof readiness>[0] = [], date?: string): AdaptResult {
  const notes: string[] = [];
  const safety: string[] = [];
  const suggestions: Suggestion[] = [];
  const estimateBefore = estimateSec(snapshot.items);
  let items: SnapItem[] = [];
  const gear = availableGear(p);

  if (date) {
    const r = readiness(history, date);
    if (r.note) notes.push(`${r.note} Nothing was changed automatically; use Low energy or a shorter window if you want it lighter.`);
  }

  // 1. Safety first: exclusions override locks and priorities.
  for (const it of snapshot.items) {
    const hit = it.stresses.filter((r) => p.exclusions.includes(r));
    if (hit.length) {
      const approved = opts.approvedSubs[it.key];
      const replacement = approved ? findExercise(custom, approved) : undefined;
      if (replacement && !it.locked && !it.rehab && permitted(replacement) && replacement.gear.every(g => gear.has(g)) && !replacement.stresses.some((r) => p.exclusions.includes(r))) {
        const base = { ...itemOf(it), exerciseId: replacement.id, definition: dosageFree(replacement) };
        if (validateItem(base, it.tracking).length) { safety.push(`${it.name}: replacement target is incompatible. Edit the activity and its target first.`); continue; }
        items.push(snapItem(base, replacement));
        notes.push(`Replaced ${it.name} with ${replacement.name} because you approved it.`);
        continue;
      }
      const why = `${it.name} loads ${hit.join(', ')}, which you asked to avoid.`;
      safety.push(`${why}${it.locked ? ' Your exclusion overrides the lock.' : ''}${it.rehab ? ' It is marked as rehabilitation: please check with the professional who prescribed it before doing it.' : ''} Left out.`);
      if (!it.custom && !it.rehab && !it.locked) {
        const options = subOptions(it, p, custom);
        if (options.length) suggestions.push({ itemKey: it.key, itemName: it.name, reason: 'Excluded area', options });
      }
      continue;
    }
    if ((it.custom && it.stresses.length === 0) || it.definition?.activity?.adaptation.loadingKnown === false) notes.push(`${it.name}: loading or suitability is not established. Tempo cannot fully check your exclusions. Kept as you chose it; not automatically adjusted.`);
    const missing = it.gear.filter((g) => !gear.has(g));
    if (missing.length) {
      notes.push(`${it.name} needs ${missing.join(', ')}, which isn’t in your setup. Kept because you chose it.`);
      if (!it.custom && !it.rehab && !it.locked) {
        const approved = opts.approvedSubs[it.key];
        const replacement = approved ? findExercise(custom, approved) : undefined;
        if (replacement && !it.locked && permitted(replacement) && replacement.gear.every(g => gear.has(g)) && !replacement.stresses.some(r => p.exclusions.includes(r))) {
          const base = { ...itemOf(it), exerciseId: replacement.id, definition: dosageFree(replacement) };
          if (!validateItem(base, it.tracking).length) {
            items.push(snapItem(base, replacement));
            notes.push(`Replaced ${it.name} with ${replacement.name} because you approved it. Your entered targets were preserved.`);
            continue;
          }
          notes.push(`${replacement.name} needs a different target. Edit explicitly; ${it.name} was kept.`);
        }
        const options = subOptions(it, p, custom);
        if (options.length) suggestions.push({ itemKey: it.key, itemName: it.name, reason: 'Equipment', options });
      }
    }
    items.push({ ...it });
  }

  const adjustable = (i: SnapItem) => !i.locked && !i.rehab && permitted(definitionOfSnap(i)) && (i.tracking === 'time' || i.tracking === 'reps');

  // 2. Low energy: trim reps/time on unlocked, non-rehab items. Load never increases.
  if (opts.lowEnergy) {
    let n = 0;
    items = items.map((i) => {
      if (!adjustable(i)) return i;
      n++;
      return i.tracking === 'reps' ? { ...i, reps: Math.max(1, Math.round((i.reps ?? 0) * 0.75)) } : { ...i, seconds: lowEnergySeconds(i.seconds ?? 0) };
    });
    if (n) notes.push(`Low energy: about a quarter fewer reps or seconds on ${n} suitable unlocked activit${n === 1 ? 'y' : 'ies'}.`);
  }

  // 3. Time window: reduce sets first (optional, then normal, then must), drop optional moves last.
  let infeasible: string | null = null;
  if (opts.targetMinutes && !Number.isFinite(estimateSec(items))) infeasible = 'Duration unknown: breath pace or travel speed was not supplied. Tempo cannot claim this fits your time window.';
  if (opts.targetMinutes) {
    const budget = opts.targetMinutes * 60;
    const tiers: Priority[] = ['optional', 'normal', 'must'];
    let guard = 0;
    while (estimateSec(items) > budget && guard++ < 500) {
      let reduced = false;
      for (const t of tiers) {
        const cands = items.filter((i) => adjustable(i) && i.priority === t && i.sets > 1);
        if (cands.length) {
          const pick = cands.reduce((a, b) => (b.sets > a.sets ? b : a));
          items = items.map((i) => (i.key === pick.key ? { ...i, sets: i.sets - 1 } : i));
          reduced = true;
          break;
        }
      }
      if (reduced) continue;
      const drop = [...items].reverse().find((i) => adjustable(i) && i.priority === 'optional');
      if (drop) {
        items = items.filter((i) => i.key !== drop.key);
        notes.push(`Left out optional activity ${drop.name} to fit the window.`);
        continue;
      }
      break;
    }
    const setDiff = snapshot.items.reduce((n, i) => n + i.sets, 0) - items.reduce((n, i) => n + i.sets, 0);
    if (setDiff > 0) notes.push('Reduced sets before removing anything. Must-keep activities were trimmed last.');
    const after = estimateSec(items);
    if (after > budget) {
      const fixed = items.filter((i) => !adjustable(i)).length;
      infeasible = `This still needs about ${minutesLabel(after)} with rest, over your ${opts.targetMinutes}-minute window. ${fixed ? `${fixed} locked or rehabilitation activit${fixed === 1 ? 'y' : 'ies'} can’t be trimmed automatically. ` : ''}Tempo won’t claim it fits: unlock something, pick a longer window, or start anyway.`;
    }
  }

  const estimateAfter = estimateSec(items);
  const changed = JSON.stringify(items.map((i) => [i.exerciseId, i.sets, i.reps, i.seconds])) !== JSON.stringify(snapshot.items.map((i) => [i.exerciseId, i.sets, i.reps, i.seconds]));
  return { items, notes, safety, estimateBefore, estimateAfter, fits: !infeasible, infeasible, suggestions, changed };
}

// ---------------------------------------------------------------- execution
export function logsFor(items: SnapItem[], added = false): LogV2[] {
  return items.map((i) => ({
    itemKey: i.key,
    exerciseId: i.exerciseId,
    name: i.name,
    kind: i.tracking,
    planned: { sets: i.sets, reps: i.reps, seconds: i.seconds, breaths: i.breaths, distance: i.distance, distanceUnit: i.distanceUnit, side: i.side, load: i.load, unit: i.unit, perSide: i.perSide, restSec: i.restSec },
    sets: [],
    done: false,
    skipped: false,
    added,
  }));
}
export function actualErrors(set: ActualSet, item: SnapItem): string[] {
  const errors: string[] = [];
  const field = item.tracking === 'time' ? 'seconds' : item.tracking;
  const amount = set[field];
  if (amount == null || !Number.isFinite(amount) || amount < 0) errors.push('Enter a non-negative actual amount.');
  if ((field === 'reps' || field === 'breaths') && !Number.isInteger(amount)) errors.push('Use a whole count.');
  if (['reps', 'seconds', 'breaths', 'distance'].some(k => k !== field && set[k as keyof ActualSet] != null)) errors.push('Log one measurement per set.');
  const a = knowledgeOf(definitionOfSnap(item));
  if (field === 'distance' && (!set.distanceUnit || !a.distanceUnits.includes(set.distanceUnit))) errors.push('Choose a supported distance unit (m, km, mi or yd).');
  if (set.load != null && (!Number.isFinite(set.load) || set.load < 0 || set.load > 1000 || !set.unit)) errors.push('Load must be 0–1000 with kg or lb.');
  if (set.load != null && item.definition?.activity && !a.loadUnits.includes(set.unit!)) errors.push('This activity does not support external load.');
  if (set.side && ['left', 'right', 'alternating'].includes(set.side) && !['unilateral', 'alternating'].includes(a.laterality)) errors.push('This activity does not support separate sides.');
  return errors;
}

export function startActive(args: { date: string; occurrenceKey: string | null; snapshot: Snapshot; items: SnapItem[]; title?: string; plannedMinutes?: number; adaptation?: string[] }, nowMs = Date.now()): ActiveV2 {
  const est = estimateSec(args.items);
  return {
    id: newId('run'),
    date: args.date,
    occurrenceKey: args.occurrenceKey,
    title: args.title ?? args.snapshot.title,
    plannedMinutes: Number.isFinite(args.plannedMinutes ?? est) ? args.plannedMinutes ?? Math.max(1, Math.round(est / 60)) : 0,
    estimateSec: Number.isFinite(est) ? est : null,
    snapshot: args.snapshot,
    items: args.items.map((i) => ({ ...i })),
    startedAt: new Date(nowMs).toISOString(),
    clock: { accMs: 0, since: nowMs },
    exClock: { accMs: 0, since: null },
    index: 0,
    logs: logsFor(args.items),
    adaptation: args.adaptation ?? [],
  };
}

export function addToActive(a: ActiveV2, d: ExerciseDef, target?: RoutineItem): ActiveV2 {
  const it = snapItem({ ...(target ?? makeItem(d)), key: newId('add') }, d);
  const items = [...a.items, it];
  const est = estimateSec(items);
  return { ...a, items, estimateSec: Number.isFinite(est) ? est : null, logs: [...a.logs, ...logsFor([it], true)] };
}

export function logSetOn(a: ActiveV2, set: ActualSet): ActiveV2 {
  const logs = a.logs.map((l, i) => {
    if (i !== a.index) return l;
    const sets = [...l.sets, set];
    return { ...l, sets, done: sets.length >= l.planned.sets ? true : l.done, skipped: false };
  });
  return { ...a, logs, exClock: { accMs: 0, since: null } };
}

export const clockMs = (c: Clock, now = Date.now()) => c.accMs + (c.since ? now - c.since : 0);

export function completeActive(a: ActiveV2, opts: { difficulty: number | null; stoppedForPain?: boolean }, nowMs = Date.now()): CompletionV2 {
  const allDone = a.logs.every((l) => l.done);
  return deepFreeze({
    id: newId('done'),
    date: a.date,
    occurrenceKey: a.occurrenceKey,
    sessionId: a.snapshot.id,
    title: a.title,
    plannedMinutes: a.plannedMinutes,
    estimateSec: Number.isFinite(estimateSec(a.items)) ? estimateSec(a.items) : null,
    startedAt: a.startedAt,
    finishedAt: new Date(nowMs).toISOString(),
    activeSeconds: Math.round(clockMs(a.clock, nowMs) / 1000),
    snapshot: a.snapshot,
    executedItems: JSON.parse(JSON.stringify(a.items)),
    exercises: a.logs.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })), planned: { ...l.planned }, done: l.done || l.sets.length > 0 })),
    finishedEarly: !allDone,
    stoppedForPain: !!opts.stoppedForPain,
    difficulty: opts.difficulty,
    adaptation: [...a.adaptation],
  });
}

// Remove obsolete automatic plans, never user-owned workouts or past records.
export function withoutAutomaticSuggestions(s: StateV2): StateV2 {
  return s.plan === null ? s : { ...s, plan: null };
}

/** Compatibility for old rollover callers; no day or profile change generates workouts. */
export function rolloverState(s: StateV2, _today: string, _kind: 'starter' | 'rollover' | 'setup' | 'profile', _reason: string, _nowIso = new Date().toISOString()): StateV2 {
  return withoutAutomaticSuggestions(s);
}

// ---------------------------------------------------------------- migration
type AnyRec = Record<string, unknown>;
const isObj = (v: unknown): v is AnyRec => !!v && typeof v === 'object' && !Array.isArray(v);
export function dosageFree(d: ExerciseDef): ExerciseDef {
  const { defaultReps: _r, defaultSeconds: _s, ...definition } = d;
  return JSON.parse(JSON.stringify(definition));
}
/** The basic content inputs write canonical knowledge, not a competing copy. */
export function editActivityText(a: Activity, patch: { notes?: string; steps?: string }): Activity {
  return { ...a,
    ...(patch.notes !== undefined ? { description: patch.notes } : {}),
    ...(patch.steps !== undefined ? { execution: patch.steps.split('\n').map(s => s.trim()).filter(Boolean) } : {}) };
}
export function userAuthoredDefinition(e: ExerciseDef, previous: ExerciseDef | undefined, now: string): ExerciseDef {
  const version = previous ? previous.version + 1 : 1;
  const activity: Activity = { ...knowledgeOf(e), id: e.id, version, name: e.name, authorship: 'user', reviewStatus: 'unreviewed', archived: e.archived,
    adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'User-authored and unreviewed; never automatically adapted.' } };
  return { ...dosageFree(e), ...activityDef(activity), stresses: e.stresses, areas: e.areas, rehab: e.rehab, activity,
    custom: true, verified: false, version, createdAt: previous?.createdAt ?? now, updatedAt: now };
}
/** One-way migration; never resnapshot a dated workout or rewrite logged targets. */
export function migrateV2(raw: AnyRec): StateV2 {
  const s = JSON.parse(JSON.stringify(raw)) as StateV2;
  const presets = { ...legacyPresets, ...(s.presets ?? {}) };
  s.customExercises = s.customExercises.map(d => {
    presets[d.id] = { ...presets[d.id], ...(d.defaultReps != null ? { defaultReps: d.defaultReps } : {}), ...(d.defaultSeconds != null ? { defaultSeconds: d.defaultSeconds } : {}) };
    return { ...dosageFree(d), activity: { ...knowledgeOf(d), authorship: 'user', reviewStatus: 'unreviewed', adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'User-authored and unreviewed; unknown suitability/loading.' } } };
  });
  s.routines = s.routines.map(r => ({ ...r, items: r.items.map(it => {
    const d = it.definition ?? findExercise(s.customExercises, it.exerciseId);
    return d ? { ...it, definition: dosageFree(d) } : it;
  }) }));
  s.schemaVersion = 3;
  s.savedActivities = Array.isArray(s.savedActivities) ? s.savedActivities : [];
  s.presets = presets;
  return freezeSaved(s);
}
function normalizeCurrentState(s: StateV2): StateV2 {
  return freezeSaved({ ...s, savedActivities: s.savedActivities ?? [], presets: s.presets ?? {} });
}
function freezeSaved(s: StateV2): StateV2 {
  s.schedule.forEach(e => { deepFreeze(e.snapshot); Object.values(e.exceptions).forEach(x => x.snapshot && deepFreeze(x.snapshot)); });
  s.completions.forEach(deepFreeze);
  if (s.active) deepFreeze(s.active.snapshot);
  return s;
}

function v1LogToV2(l: AnyRec, n: number): LogV2 {
  const kind = (l.kind === 'time' ? 'time' : 'reps') as Tracking;
  const reps = Array.isArray(l.reps) ? (l.reps as unknown[]).filter((x): x is number => typeof x === 'number') : [];
  return {
    itemKey: `${String(l.exerciseId ?? 'ex')}-${n}`,
    exerciseId: String(l.exerciseId ?? 'unknown'),
    name: String(l.name ?? 'Exercise'),
    kind,
    planned: { sets: typeof l.plannedSets === 'number' ? l.plannedSets : reps.length },
    sets: reps.map((v) => (kind === 'reps' ? { reps: v } : { seconds: v })),
    done: !!l.done,
    skipped: !!l.skipped,
    added: false,
  };
}

export function migrateV1(raw: AnyRec): StateV2 {
  const base = emptyState();
  const completions: CompletionV2[] = (Array.isArray(raw.completions) ? raw.completions : []).filter(isObj).map((c) => {
    const v = c as unknown as V1Completion & AnyRec;
    return {
      id: String(v.id),
      date: String(v.date),
      occurrenceKey: null,
      sessionId: String(v.sessionId ?? ''),
      title: String(v.title ?? 'Session'),
      plannedMinutes: Number(v.plannedMinutes ?? 0),
      estimateSec: null,
      startedAt: String(v.startedAt ?? v.finishedAt ?? ''),
      finishedAt: String(v.finishedAt ?? ''),
      activeSeconds: Number(v.activeSeconds ?? 0),
      snapshot: null,
      exercises: (Array.isArray(v.exercises) ? (v.exercises as unknown[]) : []).filter(isObj).map(v1LogToV2),
      finishedEarly: !!v.finishedEarly,
      stoppedForPain: !!v.stoppedForPain,
      difficulty: typeof v.difficulty === 'number' ? v.difficulty : null,
      adaptation: [],
    };
  });
  let active: ActiveV2 | null = null;
  if (isObj(raw.active) && isObj(raw.active.session)) {
    const a = raw.active as AnyRec;
    const sess = a.session as unknown as SessionPlan;
    const snapshot = snapshotFromGenerated(sess, String(a.startedAt ?? new Date().toISOString()));
    const oldLogs = (Array.isArray(a.logs) ? (a.logs as unknown[]) : []).filter(isObj).map(v1LogToV2);
    const logs = snapshot.items.map((it, n) => ({ ...(oldLogs[n] ?? logsFor([it])[0]), itemKey: it.key, planned: { sets: it.sets, reps: it.reps, seconds: it.seconds, perSide: it.perSide, restSec: it.restSec, unit: it.unit } }));
    active = {
      id: String(a.id ?? newId('run')),
      date: String(a.date),
      occurrenceKey: null,
      title: sess.title,
      plannedMinutes: sess.minutes,
      estimateSec: estimateSec(snapshot.items),
      snapshot,
      items: snapshot.items.map((i) => ({ ...i })),
      startedAt: String(a.startedAt ?? new Date().toISOString()),
      clock: (isObj(a.clock) ? a.clock : { accMs: 0, since: null }) as unknown as Clock,
      exClock: (isObj(a.exClock) ? a.exClock : { accMs: 0, since: null }) as unknown as Clock,
      index: Math.max(0, Math.min(logs.length - 1, Number(a.index ?? 0))),
      logs,
      adaptation: [],
    };
  }
  return {
    ...base,
    profile: isObj(raw.profile) ? ({ ...DEFAULT_PROFILE, ...(raw.profile as unknown as Profile) }) : DEFAULT_PROFILE,
    plan: isObj(raw.plan) ? (raw.plan as unknown as Plan) : null,
    events: Array.isArray(raw.events) ? (raw.events as PlanEvent[]) : [],
    completions,
    active,
  };
}

// ---------------------------------------------------------------- validation schemas
const dateZ = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const regionZ = z.enum(['knees', 'wrists', 'shoulders', 'lowerBack', 'ankles']);
const minutesZ = z.union([z.literal(10), z.literal(20), z.literal(30)]);
const profileZ = z.object({ setupDone: z.boolean(), goal: z.enum(['consistency', 'strength', 'mobility', 'energy']), equipment: z.array(equipmentSchema), exclusions: z.array(regionZ), availability: z.array(z.number().int().min(0).max(6)), defaultMinutes: minutesZ });
const plannedZ = z.object({ exerciseId: z.string(), name: z.string(), kind: z.enum(['reps', 'time']), sets: z.number(), reps: z.number().optional(), seconds: z.number().optional(), perSide: z.boolean().optional(), restSec: z.number() });
const sessionZ = z.object({ id: z.string(), title: z.string(), minutes: minutesZ, lowEnergy: z.boolean(), noEquipment: z.boolean(), exercises: z.array(plannedZ), note: z.string() });
const dayZ = z.object({ date: dateZ, type: z.enum(['session', 'rest']), session: sessionZ.optional(), reason: z.string() });
const planZ = z.object({ version: z.number(), generatedOn: z.string(), days: z.array(dayZ) }).nullable();
const eventZ = z.object({ id: z.string(), at: z.string(), kind: z.enum(['starter', 'setup', 'rollover', 'adjusted', 'profile']), date: z.string(), planVersion: z.number(), reason: z.string(), before: dayZ.nullable(), after: dayZ.nullable() });
const v1LogZ = z.object({ exerciseId: z.string(), name: z.string(), kind: z.enum(['reps', 'time']), plannedSets: z.number(), reps: z.array(z.number()), done: z.boolean(), skipped: z.boolean() });
const v1CompletionZ = z.object({ id: z.string(), date: z.string(), sessionId: z.string(), title: z.string(), plannedMinutes: z.number(), startedAt: z.string(), finishedAt: z.string(), activeSeconds: z.number(), exercises: z.array(v1LogZ), finishedEarly: z.boolean(), stoppedForPain: z.boolean(), difficulty: z.number().min(1).max(5).nullable() });
const clockZ = z.object({ accMs: z.number(), since: z.number().nullable() });
const v1ActiveZ = z.object({ id: z.string(), date: dateZ, session: sessionZ, startedAt: z.string(), clock: clockZ, exClock: clockZ, index: z.number(), logs: z.array(v1LogZ) }).nullable().optional();
export const v1StateZ = z.object({ schemaVersion: z.literal(1), profile: profileZ, plan: planZ, events: z.array(eventZ), completions: z.array(v1CompletionZ), active: v1ActiveZ });

const tracking = z.enum(['reps', 'time', 'breaths', 'distance']);
const unitZ = z.enum(['kg', 'lb']);
const gearZ = equipmentSchema;
const areaZ = z.enum(['hips', 'spine', 'shoulders', 'knees', 'ankles', 'wrists', 'core', 'upper', 'lower', 'full']);
const disciplineZ = z.enum(['yoga', 'mobility', 'strength', 'conditioning']);
const posInt = z.number().int().min(1);
const sideZ = z.enum(['left', 'right', 'both', 'alternating', 'unspecified']);
const measurements = { breaths: z.number().int().min(0).max(10000).optional(), distance: z.number().min(0).max(1000000).optional(), distanceUnit: z.enum(['m', 'km', 'mi', 'yd']).optional(), side: sideZ.optional() };
const exerciseZ = z.object({ id: z.string().min(1), version: posInt, name: z.string().min(1), discipline: disciplineZ, gear: z.array(gearZ), areas: z.array(areaZ).min(1), tracking, defaultReps: z.number().optional(), defaultSeconds: z.number().optional(), perSide: z.boolean(), loadable: z.boolean(), stresses: z.array(regionZ), intensity: z.union([z.literal(1), z.literal(2)]), instructions: z.string(), cues: z.array(z.string()), custom: z.boolean(), verified: z.boolean(), rehab: z.boolean(), archived: z.boolean(), createdAt: z.string(), updatedAt: z.string(), activity: activitySchema.optional(), sequenceMembers: z.array(membershipSchema).max(500).optional() }).strict();
const itemZ = z.object({ key: z.string().min(1), exerciseId: z.string().min(1), sets: posInt.max(20), reps: z.number().min(0).max(200).optional(), seconds: z.number().min(0).max(3600).optional(), ...measurements, definition: exerciseZ.optional(), confirmed: z.boolean().optional(), restSec: z.number().min(0).max(600), load: z.number().min(0).max(1000).optional(), unit: unitZ, perSide: z.boolean(), priority: z.enum(['must', 'normal', 'optional']), locked: z.boolean(), note: z.string().optional() }).strict();
const snapItemZ = itemZ.extend({ name: z.string(), tracking, discipline: disciplineZ, defVersion: z.number(), stresses: z.array(regionZ), gear: z.array(gearZ), loadable: z.boolean(), custom: z.boolean(), verified: z.boolean(), rehab: z.boolean(), intensity: z.union([z.literal(1), z.literal(2)]), cues: z.array(z.string()), instructions: z.string() });
const sourceZ = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('routine'), routineId: z.string(), routineVersion: z.number() }),
  z.object({ kind: z.literal('exercise'), exerciseId: z.string() }),
  z.object({ kind: z.literal('generated'), sessionId: z.string() }),
  z.object({ kind: z.literal('edited') }),
]);
const snapshotZ = z.object({ id: z.string(), title: z.string(), source: sourceZ, items: z.array(snapItemZ), createdAt: z.string() });
const exceptionZ = z.object({ deleted: z.boolean().optional(), moveTo: dateZ.optional(), snapshot: snapshotZ.optional() });
const entryZ = z.object({ id: z.string(), rootId: z.string(), owner: z.literal('user'), start: dateZ, weekdays: z.array(z.number().int().min(0).max(6)).nullable(), until: dateZ.nullable(), snapshot: snapshotZ, exceptions: z.record(dateZ, exceptionZ), createdAt: z.string() });
const routineZ = z.object({ id: z.string().min(1), name: z.string().min(1), notes: z.string(), items: z.array(itemZ), version: posInt, archived: z.boolean(), createdAt: z.string(), updatedAt: z.string() });
const actualZ = z.object({ reps: z.number().min(0).optional(), seconds: z.number().min(0).optional(), ...measurements, load: z.number().min(0).optional(), unit: unitZ.optional() }).strict();
const logZ = z.object({ itemKey: z.string(), exerciseId: z.string(), name: z.string(), kind: tracking, planned: z.object({ sets: z.number(), reps: z.number().optional(), seconds: z.number().optional(), ...measurements, load: z.number().optional(), unit: unitZ.optional(), perSide: z.boolean().optional(), restSec: z.number().optional() }).strict(), sets: z.array(actualZ), done: z.boolean(), skipped: z.boolean(), added: z.boolean() });
const completionZ = z.object({ id: z.string(), date: dateZ, occurrenceKey: z.string().nullable(), sessionId: z.string(), title: z.string(), plannedMinutes: z.number(), estimateSec: z.number().nullable(), startedAt: z.string(), finishedAt: z.string(), activeSeconds: z.number().min(0), snapshot: snapshotZ.nullable(), executedItems: z.array(snapItemZ).optional(), exercises: z.array(logZ), finishedEarly: z.boolean(), stoppedForPain: z.boolean(), difficulty: z.number().min(1).max(5).nullable(), adaptation: z.array(z.string()) });
const activeZ = z.object({ id: z.string(), date: dateZ, occurrenceKey: z.string().nullable(), title: z.string(), plannedMinutes: z.number(), estimateSec: z.number().nullable(), snapshot: snapshotZ, items: z.array(snapItemZ), startedAt: z.string(), clock: clockZ, exClock: clockZ, index: z.number().int().min(0), logs: z.array(logZ), adaptation: z.array(z.string()) }).nullable();
const personalPresetZ = z.object({
  // Keep legacy fields as permissive as the previous v3 backup contract.
  defaultReps: z.number().optional(),
  defaultSeconds: z.number().optional(),
  defaultBreaths: z.number().int().min(1).max(10000).optional(),
  defaultDistance: z.number().positive().max(1000000).optional(),
  defaultDistanceUnit: z.enum(['m', 'km', 'mi', 'yd']).optional(),
}).strict();
const savedActivityZ = z.object({
  id: z.string().min(1),
  fallback: activitySchema,
  sequenceMembers: z.array(membershipSchema).max(500).optional(),
  savedAt: z.string().min(1),
}).strict();
export const stateZ = z.object({ schemaVersion: z.union([z.literal(2), z.literal(3)]), profile: profileZ, plan: planZ, events: z.array(eventZ), completions: z.array(completionZ), active: activeZ, customExercises: z.array(exerciseZ), savedActivities: z.array(savedActivityZ).optional(), routines: z.array(routineZ), schedule: z.array(entryZ), presets: z.record(z.string(), personalPresetZ).optional() }).strict();

/** Cross-entity checks zod can't express. Returns the first problem, or null. */
export function integrityError(s: StateV2): string | null {
  if (!s.presets) return 'The export is missing its personal presets object. Restore the full export; nothing was changed.';
  const dup = (ids: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) return `Duplicate ${what} id “${id}”.`;
      seen.add(id);
    }
    return null;
  };
  const builtinIds = new Set(allExercises([]).map((b) => b.id));
  for (const e of s.customExercises) if (builtinIds.has(e.id)) return `Custom exercise “${e.name}” reuses a built-in id.`;
  const d = dup(s.customExercises.map((e) => e.id), 'exercise') ?? dup(s.savedActivities.map((a) => a.id), 'saved activity') ?? dup(s.routines.map((r) => r.id), 'routine') ?? dup(s.schedule.map((e) => e.id), 'schedule') ?? dup(s.completions.map((c) => c.id), 'session');
  if (d) return d;
  for (const saved of s.savedActivities) {
    if (saved.fallback.id !== saved.id) return `Saved activity “${saved.id}” has a mismatched fallback identity.`;
    if (saved.fallback.authorship !== 'maintainer') return `Saved activity “${saved.fallback.name}” is not a shared catalog entry.`;
    if (saved.sequenceMembers?.some((m, n) => m.sequenceId !== saved.id || m.order !== n)) return `Saved sequence “${saved.fallback.name}” has invalid membership order.`;
  }
  for (const d of s.customExercises) {
    if (!d.custom || d.verified || d.activity?.authorship !== 'user' || d.activity?.reviewStatus !== 'unreviewed') return `Custom activity “${d.name}” must be user-authored and unreviewed.`;
    if (d.defaultReps != null || d.defaultSeconds != null) return `Move dosage for “${d.name}” into personal presets.`;
    if (d.activity?.id !== d.id || d.activity.version !== d.version) return `${d.name}: canonical identity/version and personal definition do not match.`;
    if (d.sequenceMembers?.some((m, n) => m.sequenceId !== d.id || m.order !== n)) return `${d.name}: sequence memberships must use its ID with consecutive order starting at 0.`;
  }
  for (const r of s.routines) for (const it of r.items) {
    if (!it.definition && !findExercise(s.customExercises, it.exerciseId)) return `Routine “${r.name}” uses an activity (${it.exerciseId}) that isn’t in the file.`;
    if (it.definition && it.definition.id !== it.exerciseId) return `Routine “${r.name}” has an activity/definition mismatch.`;
  }
  const saved = [...s.schedule.flatMap(e => [e.snapshot, ...Object.values(e.exceptions).flatMap(x => x.snapshot ? [x.snapshot] : [])]), ...s.completions.flatMap(c => [...(c.snapshot ? [c.snapshot] : []), ...(c.executedItems ? [{ items: c.executedItems }] : [])]), ...(s.active ? [s.active.snapshot, { items: s.active.items }] : [])];
  for (const snap of saved) for (const it of snap.items) {
    if (it.definition && it.definition.id !== it.exerciseId) return `${it.name}: saved activity and definition IDs do not match.`;
    if (it.definition?.defaultReps != null || it.definition?.defaultSeconds != null) return `${it.name}: dosage belongs in personal targets, not saved definitions.`;
    if (it.tracking === 'distance' || it.tracking === 'breaths' || it.definition?.activity) {
      const errors = validateItem(it, it.tracking);
      if (errors.length) return `${it.name}: ${errors[0]}`;
    }
  }
  for (const log of [...s.completions.flatMap(c => c.exercises), ...(s.active?.logs ?? [])]) for (const set of [log.planned, ...log.sets]) {
    if (log.kind === 'distance' && (set.distance == null || !set.distanceUnit)) return `${log.name}: distance requires a value and m/km/mi/yd unit.`;
    if (log.kind === 'breaths' && (set.breaths == null || !Number.isInteger(set.breaths))) return `${log.name}: enter a whole breath count.`;
    if (set.load != null && !set.unit) return `${log.name}: choose kg or lb for load.`;
    const metric = log.kind === 'time' ? 'seconds' : log.kind;
    if (['reps', 'seconds', 'breaths', 'distance'].some(k => k !== metric && set[k as 'reps'] != null)) return `${log.name}: ${log.kind} logs cannot also contain a different measurement.`;
    if (log.kind === 'reps' && set.reps != null && !Number.isInteger(set.reps)) return `${log.name}: repetitions must be whole counts.`;
  }
  for (const e of s.schedule) {
    if (e.until && e.until < e.start && e.weekdays) return `A recurring schedule ends before it starts (${e.start}).`;
    if (e.weekdays && e.weekdays.length === 0) return `A recurring schedule from ${e.start} has no weekdays.`;
  }
  if (s.active && s.active.logs.length !== s.active.items.length) return 'The in-progress session is inconsistent (logs and activities differ).';
  if (s.active && s.active.index >= Math.max(1, s.active.logs.length)) return 'The in-progress session points past its last activity.';
  if (s.active) for (let n = 0; n < s.active.items.length; n++) {
    const item = s.active.items[n], log = s.active.logs[n];
    if (item.key !== log.itemKey || item.exerciseId !== log.exerciseId || item.tracking !== log.kind) return `Running activity ${n + 1}: its log does not match the saved activity.`;
    for (const actual of log.sets) {
      const errors = actualErrors(actual, item);
      if (errors.length) return `${item.name}: ${errors[0]}`;
    }
  }
  for (const c of s.completions) for (const log of c.exercises) {
    const item = (c.executedItems ?? c.snapshot?.items)?.find(it => it.key === log.itemKey);
    if (item) for (const actual of log.sets) {
      const errors = actualErrors(actual, item);
      if (errors.length) return `${c.title} / ${log.name}: ${errors[0]}`;
    }
  }
  return null;
}

export type ImportCheck = { ok: true; data: StateV2; summary: string; migratedFrom: 1 | 2 | 3 } | { ok: false; error: string };

export function checkImport(raw: string): ImportCheck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'That isn’t valid JSON. Paste the full export, including the outer braces.' };
  }
  if (!isObj(parsed) || parsed.app !== 'tempo' || !isObj(parsed.data)) return { ok: false, error: 'Not a Tempo export: expected {"app": "tempo", "data": {...}}.' };
  const ver = parsed.data.schemaVersion;
  let data: StateV2;
  let from: 1 | 2 | 3;
  if (ver === 1) {
    const r = v1StateZ.safeParse(parsed.data);
    if (!r.success) {
      const i = r.error.issues[0];
      return { ok: false, error: `Old Tempo export is damaged (${i.path.join('.') || 'root'}: ${i.message}). Nothing was changed.` };
    }
    data = migrateV2(migrateV1(r.data as unknown as AnyRec) as unknown as AnyRec);
    from = 1;
  } else if (ver === 2 || ver === 3) {
    const r = stateZ.safeParse(parsed.data);
    if (!r.success) {
      const i = r.error.issues[0];
      return { ok: false, error: `Tempo export is damaged (${i.path.join('.') || 'root'}: ${i.message}). Nothing was changed.` };
    }
    data = ver === 2 ? migrateV2(r.data as unknown as AnyRec) : normalizeCurrentState(r.data as StateV2);
    from = ver;
  } else {
    return { ok: false, error: `Unsupported export version (${String(ver)}). This app reads versions 1, 2 and 3. Nothing was changed.` };
  }
  const bad = integrityError(data);
  if (bad) return { ok: false, error: `${bad} Nothing was changed.` };
  data = withoutAutomaticSuggestions(data);
  const summary = [
    `${data.completions.length} completed session${data.completions.length === 1 ? '' : 's'}`,
    `${data.routines.length} routine${data.routines.length === 1 ? '' : 's'}`,
    `${data.customExercises.length} custom activit${data.customExercises.length === 1 ? 'y' : 'ies'}`,
    `${data.schedule.length} scheduled item${data.schedule.length === 1 ? '' : 's'}`,
    data.active ? 'one session in progress' : null,
    from === 1 ? 'upgraded from an older export' : null,
  ]
    .filter(Boolean)
    .join(', ');
  return { ok: true, data, summary, migratedFrom: from };
}

/** Load whatever is in storage. Never throws; returns an explicit error instead of silently discarding. */
export function loadStored(v2raw: string | null, v1raw: string | null): { state: StateV2 | null; migrated: boolean; error: string | null } {
  if (v2raw) {
    try {
      const r = stateZ.safeParse(JSON.parse(v2raw));
      if (r.success) {
        const state = r.data.schemaVersion === 2 ? migrateV2(r.data as unknown as AnyRec) : normalizeCurrentState(r.data as StateV2);
        const bad = integrityError(state);
        if (bad) return { state: null, migrated: false, error: `${bad} A backup copy was kept.` };
        return { state: withoutAutomaticSuggestions(state), migrated: r.data.schemaVersion === 2, error: null };
      }
      const i = r.error.issues[0];
      return { state: null, migrated: false, error: `Saved data failed a check (${i.path.join('.')}: ${i.message}). A backup copy was kept.` };
    } catch {
      return { state: null, migrated: false, error: 'Saved data could not be read. A backup copy was kept.' };
    }
  }
  if (v1raw) {
    try {
      const obj = JSON.parse(v1raw);
      const checked = v1StateZ.safeParse(obj);
      if (!checked.success) {
        const issue = checked.error.issues[0];
        return { state: null, migrated: false, error: `Older saved data failed a check (${issue.path.join('.')}: ${issue.message}). It was left untouched.` };
      }
      return { state: withoutAutomaticSuggestions(migrateV2(migrateV1(checked.data as unknown as AnyRec) as unknown as AnyRec)), migrated: true, error: null };
    } catch {
      return { state: null, migrated: false, error: 'Older saved data could not be read. It was left untouched in storage.' };
    }
  }
  return { state: null, migrated: false, error: null };
}

export function exportPayload(s: StateV2, nowIso = new Date().toISOString()) {
  return { app: 'tempo' as const, exportedAt: nowIso, data: s };
}
