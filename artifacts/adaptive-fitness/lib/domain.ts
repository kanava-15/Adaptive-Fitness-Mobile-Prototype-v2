// Tempo domain v2 — exercise library, routines, dated schedule, recurrence,
// immutable snapshots, conservative adaptation, execution logs, migration and
// import validation. Pure TypeScript: no React Native imports, so it can be
// exercised directly by the Node regression tests in tests/domain.test.ts.

import { z } from 'zod';
import {
  Category,
  Completion as V1Completion,
  DEFAULT_PROFILE,
  LIBRARY,
  Plan,
  PlanEvent,
  Profile,
  Region,
  SessionPlan,
  addDays,
  buildPlan,
  newId,
  readiness,
  weekday,
} from './engine';

export const SCHEMA_VERSION = 2 as const;

// ---------------------------------------------------------------- types
export type Discipline = 'yoga' | 'mobility' | 'strength' | 'conditioning';
export type Area = 'hips' | 'spine' | 'shoulders' | 'knees' | 'ankles' | 'wrists' | 'core' | 'upper' | 'lower' | 'full';
export type Gear = 'none' | 'mat' | 'block' | 'band' | 'dumbbells' | 'kettlebell' | 'barbell' | 'bench' | 'machine' | 'cable';
export type Tracking = 'reps' | 'time';
export type Unit = 'kg' | 'lb';
export type Priority = 'must' | 'normal' | 'optional';
export type Scope = 'one' | 'future';

export const DISCIPLINES: Discipline[] = ['yoga', 'mobility', 'strength', 'conditioning'];
export const AREAS: Area[] = ['hips', 'spine', 'shoulders', 'knees', 'ankles', 'wrists', 'core', 'upper', 'lower', 'full'];
export const GEARS: Gear[] = ['none', 'mat', 'block', 'band', 'dumbbells', 'kettlebell', 'barbell', 'bench', 'machine', 'cable'];
export const REGIONS: Region[] = ['knees', 'wrists', 'shoulders', 'lowerBack', 'ankles'];

export const DISCIPLINE_LABEL: Record<Discipline, string> = { yoga: 'Yoga', mobility: 'Joint mobility', strength: 'Strength', conditioning: 'Warm-up & cardio' };
export const AREA_LABEL: Record<Area, string> = { hips: 'Hips', spine: 'Spine', shoulders: 'Shoulders', knees: 'Knees', ankles: 'Ankles', wrists: 'Wrists', core: 'Core', upper: 'Upper body', lower: 'Lower body', full: 'Full body' };
export const GEAR_LABEL: Record<Gear, string> = { none: 'No equipment', mat: 'Mat', block: 'Yoga block', band: 'Band', dumbbells: 'Dumbbells', kettlebell: 'Kettlebell', barbell: 'Barbell', bench: 'Bench', machine: 'Machine', cable: 'Cable' };
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
}

export interface RoutineItem {
  key: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  seconds?: number;
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
}

export interface Planned {
  sets: number;
  reps?: number;
  seconds?: number;
  load?: number;
  unit?: Unit;
  perSide?: boolean;
  restSec?: number;
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
  estimateSec: number;
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
  schemaVersion: 2;
  profile: Profile;
  plan: Plan | null;
  events: PlanEvent[];
  completions: CompletionV2[];
  active: ActiveV2 | null;
  customExercises: ExerciseDef[];
  routines: Routine[];
  schedule: ScheduleEntry[];
}

export const emptyState = (): StateV2 => ({ schemaVersion: 2, profile: DEFAULT_PROFILE, plan: null, events: [], completions: [], active: null, customExercises: [], routines: [], schedule: [] });

// ---------------------------------------------------------------- built-in library
const T0 = '2024-01-01T00:00:00.000Z';
const CAT_DISC: Record<Category, Discipline> = { warm: 'conditioning', lower: 'strength', upper: 'strength', core: 'strength', mobility: 'mobility' };
const CAT_AREA: Record<Category, Area[]> = { warm: ['full'], lower: ['lower', 'hips'], upper: ['upper', 'shoulders'], core: ['core'], mobility: ['spine', 'hips'] };

function def(p: Omit<ExerciseDef, 'version' | 'custom' | 'verified' | 'rehab' | 'archived' | 'createdAt' | 'updatedAt' | 'instructions'> & { instructions?: string }): ExerciseDef {
  return { ...p, instructions: p.instructions ?? p.cues.join(' '), version: 1, custom: false, verified: true, rehab: false, archived: false, createdAt: T0, updatedAt: T0 };
}

const FROM_V1: ExerciseDef[] = LIBRARY.map((e) =>
  def({
    id: e.id,
    name: e.name,
    discipline: CAT_DISC[e.category],
    gear: [e.equipment],
    areas: CAT_AREA[e.category],
    tracking: e.kind,
    defaultReps: e.reps,
    defaultSeconds: e.seconds,
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

export function allExercises(custom: ExerciseDef[]): ExerciseDef[] {
  return [...BUILTIN, ...custom];
}
export function findExercise(custom: ExerciseDef[], id: string): ExerciseDef | undefined {
  return custom.find((e) => e.id === id) ?? BUILTIN.find((e) => e.id === id);
}

export interface LibraryFilter {
  query?: string;
  discipline?: Discipline | null;
  gear?: Gear | null;
  area?: Area | null;
  tracking?: Tracking | null;
  includeArchived?: boolean;
  source?: 'all' | 'builtin' | 'custom';
}
export function searchLibrary(custom: ExerciseDef[], f: LibraryFilter): ExerciseDef[] {
  const q = (f.query ?? '').trim().toLowerCase();
  return allExercises(custom)
    .filter((e) => (f.includeArchived ? true : !e.archived))
    .filter((e) => (f.source === 'builtin' ? !e.custom : f.source === 'custom' ? e.custom : true))
    .filter((e) => !f.discipline || e.discipline === f.discipline)
    .filter((e) => !f.gear || e.gear.includes(f.gear))
    .filter((e) => !f.area || e.areas.includes(f.area))
    .filter((e) => !f.tracking || e.tracking === f.tracking)
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.instructions.toLowerCase().includes(q) || e.areas.some((a) => AREA_LABEL[a].toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- validation
export function validateExercise(e: Pick<ExerciseDef, 'name' | 'tracking' | 'defaultReps' | 'defaultSeconds' | 'areas' | 'gear'>): string[] {
  const errs: string[] = [];
  if (!e.name.trim()) errs.push('Give the move a name.');
  if (e.name.trim().length > 60) errs.push('Keep the name under 60 characters.');
  if (e.tracking === 'reps' && (!e.defaultReps || e.defaultReps < 1 || e.defaultReps > 200 || !Number.isInteger(e.defaultReps))) errs.push('Default reps must be a whole number from 1 to 200.');
  if (e.tracking === 'time' && (!e.defaultSeconds || e.defaultSeconds < 5 || e.defaultSeconds > 3600)) errs.push('Default time must be between 5 seconds and 60 minutes.');
  if (!e.areas.length) errs.push('Pick at least one movement area.');
  if (!e.gear.length) errs.push('Pick equipment, or “No equipment”.');
  return errs;
}

export function validateItem(i: RoutineItem, tracking: Tracking): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(i.sets) || i.sets < 1 || i.sets > 20) errs.push('Sets must be 1 to 20.');
  if (tracking === 'reps' && (!i.reps || i.reps < 1 || i.reps > 200)) errs.push('Reps must be 1 to 200.');
  if (tracking === 'time' && (!i.seconds || i.seconds < 5 || i.seconds > 3600)) errs.push('Time must be 5 s to 60 min.');
  if (i.restSec < 0 || i.restSec > 600) errs.push('Rest must be 0 to 600 s.');
  if (i.load != null && (i.load < 0 || i.load > 1000 || Number.isNaN(i.load))) errs.push('Load must be 0 to 1000.');
  return errs;
}

export function validateRoutine(r: Pick<Routine, 'name' | 'items'>, custom: ExerciseDef[]): string[] {
  const errs: string[] = [];
  if (!r.name.trim()) errs.push('Name the routine.');
  if (!r.items.length) errs.push('Add at least one move.');
  r.items.forEach((it, n) => {
    const d = findExercise(custom, it.exerciseId);
    if (!d) errs.push(`Move ${n + 1} is missing from the library.`);
    else validateItem(it, d.tracking).forEach((e) => errs.push(`${d.name}: ${e}`));
  });
  return errs;
}

/** Low-energy timed holds shrink ~25% (rounded to 5 s, floor 10 s) but never exceed the original. */
export function lowEnergySeconds(orig: number): number {
  return Math.min(orig, Math.max(10, Math.round((orig * 0.75) / 5) * 5));
}

/** True when an item's stored target doesn't fit the exercise's current tracking kind. */
export function targetMismatch(it: Pick<RoutineItem, 'reps' | 'seconds'>, tracking: Tracking): boolean {
  return tracking === 'reps' ? !it.reps || it.seconds != null : !it.seconds || it.reps != null;
}
/** Explicit reconciliation: drop the stale target and adopt the exercise's current default. */
export function reconcileItem(it: RoutineItem, d: ExerciseDef): RoutineItem {
  if (!targetMismatch(it, d.tracking)) return it;
  return d.tracking === 'reps' ? { ...it, reps: it.reps || d.defaultReps || 8, seconds: undefined } : { ...it, seconds: it.seconds || d.defaultSeconds || 30, reps: undefined };
}
/** Items whose targets need reconciling after a custom move changed reps <-> time. */
export function routineMismatches(r: Pick<Routine, 'items'>, custom: ExerciseDef[]): { key: string; name: string; tracking: Tracking }[] {
  return r.items.flatMap((it) => {
    const d = findExercise(custom, it.exerciseId);
    return d && targetMismatch(it, d.tracking) ? [{ key: it.key, name: d.name, tracking: d.tracking }] : [];
  });
}
/** Boundary check before scheduling or starting: every item needs a valid target for its own tracking kind. */
export function snapshotErrors(items: SnapItem[]): string[] {
  if (!items.length) return ['There are no moves to do.'];
  return items.flatMap((i) => {
    if (targetMismatch(i, i.tracking)) return [`${i.name} now tracks ${i.tracking === 'reps' ? 'reps' : 'time'}, but its target is still in ${i.tracking === 'reps' ? 'seconds' : 'reps'}. Open the routine and confirm a new target first.`];
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
export function buildSet(item: Pick<SnapItem, 'tracking' | 'loadable' | 'load' | 'unit'>, amount: number, loadState: { load: number; unit: Unit }): ActualSet {
  const base: ActualSet = item.tracking === 'reps' ? { reps: amount } : { seconds: amount };
  const showLoad = item.loadable || item.load != null;
  return showLoad ? { ...base, load: loadState.load, unit: loadState.unit } : base;
}

// ---------------------------------------------------------------- items & snapshots
export function makeItem(d: ExerciseDef, unit: Unit = 'kg'): RoutineItem {
  return {
    key: newId('it'),
    exerciseId: d.id,
    sets: d.discipline === 'yoga' || d.discipline === 'mobility' ? 1 : 3,
    reps: d.tracking === 'reps' ? d.defaultReps ?? 8 : undefined,
    seconds: d.tracking === 'time' ? d.defaultSeconds ?? 30 : undefined,
    restSec: d.discipline === 'strength' ? 60 : 20,
    unit,
    perSide: d.perSide,
    priority: 'normal',
    locked: false,
  };
}

export function snapItem(it: RoutineItem, d: ExerciseDef): SnapItem {
  return {
    ...it,
    cues: [...d.cues],
    name: d.name,
    tracking: d.tracking,
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
  return deepFreeze({ id: newId('snap'), title, source, items: items.map((i) => ({ ...i, cues: [...i.cues], stresses: [...i.stresses], gear: [...i.gear] })), createdAt: now });
}

export function snapshotFromRoutine(r: Routine, custom: ExerciseDef[], now = new Date().toISOString()): Snapshot {
  const items = r.items.flatMap((it) => {
    const d = findExercise(custom, it.exerciseId);
    return d ? [snapItem(it, d)] : [];
  });
  return mkSnap(r.name, { kind: 'routine', routineId: r.id, routineVersion: r.version }, items, now);
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
  return { key: s.key, exerciseId: s.exerciseId, sets: s.sets, reps: s.reps, seconds: s.seconds, restSec: s.restSec, load: s.load, unit: s.unit, perSide: s.perSide, priority: s.priority, locked: s.locked, note: s.note };
}

// ---------------------------------------------------------------- time estimate (rest included)
export const EST = { secPerRep: 3, transitionSec: 15 };
export const EST_EXPLAIN = `Estimate: ${EST.secPerRep} s per rep, timed holds as written, both sides counted for per-side moves, rest after every set, ${EST.transitionSec} s to set up each move.`;

type Estimable = { tracking: Tracking; reps?: number; seconds?: number; perSide: boolean; sets: number; restSec: number };
export function workSec(i: Estimable): number {
  const sides = i.perSide ? 2 : 1;
  return (i.tracking === 'reps' ? (i.reps ?? 0) * EST.secPerRep : i.seconds ?? 0) * sides;
}
export function estimateSec(items: Estimable[]): number {
  if (!items.length) return 0;
  const total = items.reduce((n, i) => n + i.sets * workSec(i) + i.sets * i.restSec + EST.transitionSec, 0);
  return total - items[items.length - 1].restSec; // no rest after the final set
}
export const minutesLabel = (sec: number) => `${Math.max(1, Math.round(sec / 60))} min`;

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
  return new Set<Gear>(['none', 'mat', 'block', ...p.equipment]);
}

function subOptions(item: SnapItem, p: Profile, custom: ExerciseDef[]): { id: string; name: string }[] {
  const gear = availableGear(p);
  return BUILTIN.filter((d) => d.id !== item.exerciseId && !d.archived)
    .filter((d) => !d.stresses.some((r) => p.exclusions.includes(r)))
    .filter((d) => d.gear.every((g) => gear.has(g)))
    .filter((d) => d.tracking === item.tracking || d.discipline === item.discipline)
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
      if (replacement && !replacement.custom && !replacement.stresses.some((r) => p.exclusions.includes(r))) {
        const base = makeItem(replacement, it.unit);
        items.push(snapItem({ ...base, key: it.key, sets: it.sets, restSec: it.restSec, priority: it.priority, locked: false }, replacement));
        notes.push(`Replaced ${it.name} with ${replacement.name} because you approved it.`);
        continue;
      }
      const why = `${it.name} loads ${hit.join(', ')}, which you asked to avoid.`;
      safety.push(`${why}${it.locked ? ' Your exclusion overrides the lock.' : ''}${it.rehab ? ' It is marked as rehabilitation: please check with the professional who prescribed it before doing it.' : ''} Left out.`);
      if (!it.custom && !it.rehab) {
        const options = subOptions(it, p, custom);
        if (options.length) suggestions.push({ itemKey: it.key, itemName: it.name, reason: 'Excluded area', options });
      }
      continue;
    }
    if (it.custom && it.stresses.length === 0) notes.push(`${it.name} is a custom move with no loaded areas listed, so Tempo cannot check it against your exclusions. It is kept as you wrote it and never auto-substituted.`);
    const missing = it.gear.filter((g) => !gear.has(g));
    if (missing.length) {
      notes.push(`${it.name} needs ${missing.join(', ')}, which isn’t in your setup. Kept because you chose it.`);
      if (!it.custom && !it.rehab) {
        const approved = opts.approvedSubs[it.key];
        const replacement = approved ? findExercise(custom, approved) : undefined;
        if (replacement && !replacement.custom) {
          const base = makeItem(replacement, it.unit);
          items.push(snapItem({ ...base, key: it.key, sets: it.sets, restSec: it.restSec, priority: it.priority, locked: it.locked }, replacement));
          notes.push(`Replaced ${it.name} with ${replacement.name} because you approved it.`);
          continue;
        }
        const options = subOptions(it, p, custom);
        if (options.length) suggestions.push({ itemKey: it.key, itemName: it.name, reason: 'Equipment', options });
      }
    }
    items.push({ ...it });
  }

  const adjustable = (i: SnapItem) => !i.locked && !i.rehab;

  // 2. Low energy: trim reps/time on unlocked, non-rehab items. Load never increases.
  if (opts.lowEnergy) {
    let n = 0;
    items = items.map((i) => {
      if (!adjustable(i)) return i;
      n++;
      return i.tracking === 'reps' ? { ...i, reps: Math.max(1, Math.round((i.reps ?? 0) * 0.75)) } : { ...i, seconds: lowEnergySeconds(i.seconds ?? 0) };
    });
    if (n) notes.push(`Low energy: about a quarter fewer reps or seconds on ${n} unlocked move${n === 1 ? '' : 's'}.`);
  }

  // 3. Time window: reduce sets first (optional, then normal, then must), drop optional moves last.
  let infeasible: string | null = null;
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
        notes.push(`Left out optional move ${drop.name} to fit the window.`);
        continue;
      }
      break;
    }
    const setDiff = snapshot.items.reduce((n, i) => n + i.sets, 0) - items.reduce((n, i) => n + i.sets, 0);
    if (setDiff > 0) notes.push('Reduced sets before removing anything. Must-keep moves were trimmed last.');
    const after = estimateSec(items);
    if (after > budget) {
      const fixed = items.filter((i) => !adjustable(i)).length;
      infeasible = `This still needs about ${minutesLabel(after)} with rest, over your ${opts.targetMinutes}-minute window. ${fixed ? `${fixed} locked or rehabilitation move${fixed === 1 ? '' : 's'} can’t be trimmed automatically. ` : ''}Tempo won’t claim it fits: unlock something, pick a longer window, or start anyway.`;
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
    planned: { sets: i.sets, reps: i.reps, seconds: i.seconds, load: i.load, unit: i.unit, perSide: i.perSide, restSec: i.restSec },
    sets: [],
    done: false,
    skipped: false,
    added,
  }));
}

export function startActive(args: { date: string; occurrenceKey: string | null; snapshot: Snapshot; items: SnapItem[]; title?: string; plannedMinutes?: number; adaptation?: string[] }, nowMs = Date.now()): ActiveV2 {
  const est = estimateSec(args.items);
  return {
    id: newId('run'),
    date: args.date,
    occurrenceKey: args.occurrenceKey,
    title: args.title ?? args.snapshot.title,
    plannedMinutes: args.plannedMinutes ?? Math.max(1, Math.round(est / 60)),
    estimateSec: est,
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

export function addToActive(a: ActiveV2, d: ExerciseDef): ActiveV2 {
  const it = snapItem({ ...makeItem(d), key: newId('add') }, d);
  return { ...a, items: [...a.items, it], logs: [...a.logs, ...logsFor([it], true)] };
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
    estimateSec: a.estimateSec,
    startedAt: a.startedAt,
    finishedAt: new Date(nowMs).toISOString(),
    activeSeconds: Math.round(clockMs(a.clock, nowMs) / 1000),
    snapshot: a.snapshot,
    exercises: a.logs.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })), planned: { ...l.planned }, done: l.done || l.sets.length > 0 })),
    finishedEarly: !allDone,
    stoppedForPain: !!opts.stoppedForPain,
    difficulty: opts.difficulty,
    adaptation: [...a.adaptation],
  });
}

// ---------------------------------------------------------------- rollover (generated plan only)
export function rolloverState(s: StateV2, today: string, kind: 'starter' | 'rollover' | 'setup' | 'profile', reason: string, nowIso = new Date().toISOString()): StateV2 {
  const version = (s.plan?.version ?? 0) + 1;
  const plan = buildPlan(s.profile, today, s.completions, version);
  const before = s.plan?.days.find((d) => d.date === today) ?? null;
  const ev: PlanEvent = deepFreeze({ id: newId('ev'), at: nowIso, kind, date: today, planVersion: version, reason, before, after: plan.days[0] });
  // User-owned schedule, routines, library and history are carried over untouched.
  return { ...s, plan, events: [...s.events, ev] };
}

// ---------------------------------------------------------------- migration
type AnyRec = Record<string, unknown>;
const isObj = (v: unknown): v is AnyRec => !!v && typeof v === 'object' && !Array.isArray(v);

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
const profileZ = z.object({ setupDone: z.boolean(), goal: z.enum(['consistency', 'strength', 'mobility', 'energy']), equipment: z.array(z.enum(['none', 'band', 'dumbbells'])), exclusions: z.array(regionZ), availability: z.array(z.number().int().min(0).max(6)), defaultMinutes: minutesZ });
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

const tracking = z.enum(['reps', 'time']);
const unitZ = z.enum(['kg', 'lb']);
const gearZ = z.enum(['none', 'mat', 'block', 'band', 'dumbbells', 'kettlebell', 'barbell', 'bench', 'machine', 'cable']);
const areaZ = z.enum(['hips', 'spine', 'shoulders', 'knees', 'ankles', 'wrists', 'core', 'upper', 'lower', 'full']);
const disciplineZ = z.enum(['yoga', 'mobility', 'strength', 'conditioning']);
const posInt = z.number().int().min(1);
const itemZ = z.object({ key: z.string().min(1), exerciseId: z.string().min(1), sets: posInt.max(20), reps: z.number().min(0).max(200).optional(), seconds: z.number().min(0).max(3600).optional(), restSec: z.number().min(0).max(600), load: z.number().min(0).max(1000).optional(), unit: unitZ, perSide: z.boolean(), priority: z.enum(['must', 'normal', 'optional']), locked: z.boolean(), note: z.string().optional() });
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
const exerciseZ = z.object({ id: z.string().min(1), version: posInt, name: z.string().min(1), discipline: disciplineZ, gear: z.array(gearZ).min(1), areas: z.array(areaZ).min(1), tracking, defaultReps: z.number().optional(), defaultSeconds: z.number().optional(), perSide: z.boolean(), loadable: z.boolean(), stresses: z.array(regionZ), intensity: z.union([z.literal(1), z.literal(2)]), instructions: z.string(), cues: z.array(z.string()), custom: z.literal(true), verified: z.literal(false), rehab: z.boolean(), archived: z.boolean(), createdAt: z.string(), updatedAt: z.string() });
const routineZ = z.object({ id: z.string().min(1), name: z.string().min(1), notes: z.string(), items: z.array(itemZ), version: posInt, archived: z.boolean(), createdAt: z.string(), updatedAt: z.string() });
const actualZ = z.object({ reps: z.number().min(0).optional(), seconds: z.number().min(0).optional(), load: z.number().min(0).optional(), unit: unitZ.optional() });
const logZ = z.object({ itemKey: z.string(), exerciseId: z.string(), name: z.string(), kind: tracking, planned: z.object({ sets: z.number(), reps: z.number().optional(), seconds: z.number().optional(), load: z.number().optional(), unit: unitZ.optional(), perSide: z.boolean().optional(), restSec: z.number().optional() }), sets: z.array(actualZ), done: z.boolean(), skipped: z.boolean(), added: z.boolean() });
const completionZ = z.object({ id: z.string(), date: dateZ, occurrenceKey: z.string().nullable(), sessionId: z.string(), title: z.string(), plannedMinutes: z.number(), estimateSec: z.number().nullable(), startedAt: z.string(), finishedAt: z.string(), activeSeconds: z.number().min(0), snapshot: snapshotZ.nullable(), exercises: z.array(logZ), finishedEarly: z.boolean(), stoppedForPain: z.boolean(), difficulty: z.number().min(1).max(5).nullable(), adaptation: z.array(z.string()) });
const activeZ = z.object({ id: z.string(), date: dateZ, occurrenceKey: z.string().nullable(), title: z.string(), plannedMinutes: z.number(), estimateSec: z.number(), snapshot: snapshotZ, items: z.array(snapItemZ), startedAt: z.string(), clock: clockZ, exClock: clockZ, index: z.number().int().min(0), logs: z.array(logZ), adaptation: z.array(z.string()) }).nullable();
export const stateZ = z.object({ schemaVersion: z.literal(2), profile: profileZ, plan: planZ, events: z.array(eventZ), completions: z.array(completionZ), active: activeZ, customExercises: z.array(exerciseZ), routines: z.array(routineZ), schedule: z.array(entryZ) });

/** Cross-entity checks zod can't express. Returns the first problem, or null. */
export function integrityError(s: StateV2): string | null {
  const dup = (ids: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) return `Duplicate ${what} id “${id}”.`;
      seen.add(id);
    }
    return null;
  };
  const builtinIds = new Set(BUILTIN.map((b) => b.id));
  for (const e of s.customExercises) if (builtinIds.has(e.id)) return `Custom exercise “${e.name}” reuses a built-in id.`;
  const d = dup(s.customExercises.map((e) => e.id), 'exercise') ?? dup(s.routines.map((r) => r.id), 'routine') ?? dup(s.schedule.map((e) => e.id), 'schedule') ?? dup(s.completions.map((c) => c.id), 'session');
  if (d) return d;
  for (const r of s.routines) for (const it of r.items) if (!findExercise(s.customExercises, it.exerciseId)) return `Routine “${r.name}” uses an exercise (${it.exerciseId}) that isn’t in the file.`;
  for (const e of s.schedule) {
    if (e.until && e.until < e.start && e.weekdays) return `A recurring schedule ends before it starts (${e.start}).`;
    if (e.weekdays && e.weekdays.length === 0) return `A recurring schedule from ${e.start} has no weekdays.`;
  }
  if (s.active && s.active.logs.length !== s.active.items.length) return 'The in-progress session is inconsistent (logs and moves differ).';
  if (s.active && s.active.index >= Math.max(1, s.active.logs.length)) return 'The in-progress session points past its last move.';
  return null;
}

export type ImportCheck = { ok: true; data: StateV2; summary: string; migratedFrom: 1 | 2 } | { ok: false; error: string };

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
  let from: 1 | 2;
  if (ver === 1) {
    const r = v1StateZ.safeParse(parsed.data);
    if (!r.success) {
      const i = r.error.issues[0];
      return { ok: false, error: `Old Tempo export is damaged (${i.path.join('.') || 'root'}: ${i.message}). Nothing was changed.` };
    }
    data = migrateV1(r.data as unknown as AnyRec);
    from = 1;
  } else if (ver === 2) {
    const r = stateZ.safeParse(parsed.data);
    if (!r.success) {
      const i = r.error.issues[0];
      return { ok: false, error: `Tempo export is damaged (${i.path.join('.') || 'root'}: ${i.message}). Nothing was changed.` };
    }
    data = r.data as StateV2;
    from = 2;
  } else {
    return { ok: false, error: `Unsupported export version (${String(ver)}). This app reads versions 1 and 2. Nothing was changed.` };
  }
  const bad = integrityError(data);
  if (bad) return { ok: false, error: `${bad} Nothing was changed.` };
  const summary = [
    `${data.completions.length} completed session${data.completions.length === 1 ? '' : 's'}`,
    `${data.routines.length} routine${data.routines.length === 1 ? '' : 's'}`,
    `${data.customExercises.length} custom move${data.customExercises.length === 1 ? '' : 's'}`,
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
      if (r.success) return { state: r.data as StateV2, migrated: false, error: null };
      const i = r.error.issues[0];
      return { state: null, migrated: false, error: `Saved data failed a check (${i.path.join('.')}: ${i.message}). A backup copy was kept.` };
    } catch {
      return { state: null, migrated: false, error: 'Saved data could not be read. A backup copy was kept.' };
    }
  }
  if (v1raw) {
    try {
      const obj = JSON.parse(v1raw);
      if (!isObj(obj)) throw new Error('bad');
      return { state: migrateV1(obj), migrated: true, error: null };
    } catch {
      return { state: null, migrated: false, error: 'Older saved data could not be read. It was left untouched in storage.' };
    }
  }
  return { state: null, migrated: false, error: null };
}

export function exportPayload(s: StateV2, nowIso = new Date().toISOString()) {
  return { app: 'tempo' as const, exportedAt: nowIso, data: s };
}
