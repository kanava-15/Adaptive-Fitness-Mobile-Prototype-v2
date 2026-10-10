import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activitySchema, actualSchema, expandSequence, estimatePrescription, type Activity, type CatalogRelease } from '@workspace/activity-catalog';
import starter from '@workspace/activity-catalog/starter';
import * as D from '../lib/domain';
import { DEFAULT_PROFILE, LIBRARY } from '../lib/engine';

const release = (starter as { release: CatalogRelease }).release;
function activity(patch: Partial<Activity> = {}): Activity {
  return activitySchema.parse({ ...release.activities.find(a => a.type === 'exercise')!,
    id: 'test-activity', supportedMetrics: ['reps', 'duration', 'breaths', 'distance'], distanceUnits: ['m', 'km', 'mi', 'yd'],
    loadUnits: ['kg', 'lb'], laterality: 'unilateral', difficulty: 'beginner', equipment: ['none'],
    instructionNeeded: false, adaptation: { eligible: true, loadingKnown: true, loadedJoints: [], rationale: 'Explicit test metadata.' }, ...patch });
}
const routine = (items: D.RoutineItem[]): D.Routine => ({ id: 'rt-test', name: 'Measured', items, version: 1, archived: false, notes: '', createdAt: 'x', updatedAt: 'x' });
const date = '2026-10-10';
function target(a: Activity, metric: D.Tracking, unit: D.DistanceUnit = 'm'): D.RoutineItem {
  return { ...D.makeItem(D.activityDef(a)), confirmed: true, sets: 2, restSec: 15,
    reps: undefined, seconds: undefined, breaths: undefined, distance: undefined,
    ...(metric === 'reps' ? { reps: 7 } : metric === 'time' ? { seconds: 40 } : metric === 'breaths' ? { breaths: 6 } : { distance: 1.25, distanceUnit: unit }),
    side: 'left', perSide: true, load: 0, unit: 'lb', priority: 'must', locked: true };
}
test('migration separates every legacy numeric default and leaves dated/exception/active/history snapshots unchanged', () => {
  const legacy = { ...D.BUILTIN[0], id: 'cx_existing', custom: true, verified: false, defaultReps: 17, defaultSeconds: 43 };
  const it = { ...D.makeItem(legacy), definition: undefined, reps: undefined, seconds: 47, load: 0, unit: 'lb' as const };
  const snap = D.snapshotFromItems('Original', [D.snapItem(it, legacy)]);
  const schedule = D.scheduleEntry(snap, date, [6]);
  schedule.exceptions[date] = { snapshot: snap, moveTo: '2026-10-11' };
  const active = D.startActive({ date, occurrenceKey: null, snapshot: snap, items: [...snap.items] }, 100);
  active.logs[0].sets.push({ seconds: 38, load: 0, unit: 'lb' });
  const history = D.completeActive(active, { difficulty: null }, 2000);
  const old = { ...D.emptyState(), schemaVersion: 2, customExercises: [legacy], routines: [routine([it])], schedule: [schedule], active, completions: [history] };
  const before = JSON.stringify({ schedule: old.schedule, active: old.active, completions: old.completions });
  const migrated = D.migrateV2(old as never);
  assert.deepEqual(migrated.presets[legacy.id], { defaultReps: 17, defaultSeconds: 43 });
  assert.equal(migrated.customExercises[0].defaultReps, undefined);
  assert.equal(migrated.customExercises[0].defaultSeconds, undefined);
  assert.equal(migrated.customExercises[0].activity!.authorship, 'user');
  assert.equal(migrated.customExercises[0].activity!.reviewStatus, 'unreviewed');
  assert.ok(activitySchema.safeParse(migrated.customExercises[0].activity).success);
  assert.equal(JSON.stringify({ schedule: migrated.schedule, active: migrated.active, completions: migrated.completions }), before);
  assert.equal(migrated.routines[0].items[0].seconds, 47);
  assert.equal(migrated.routines[0].items[0].load, 0);
  assert.ok(Object.isFrozen(migrated.schedule[0].snapshot.items[0]));
  const loaded = D.loadStored(JSON.stringify(old), null);
  assert.ok(loaded.migrated && loaded.state);
  assert.deepEqual(loaded.state!.presets[legacy.id], { defaultReps: 17, defaultSeconds: 43 });
});
test('published knowledge and legacy compatibility knowledge contain no numeric dosage', () => {
  for (const d of D.BUILTIN) {
    assert.equal(d.defaultReps, undefined);
    assert.equal(d.defaultSeconds, undefined);
    assert.ok(activitySchema.safeParse(D.knowledgeOf(d)).success);
    assert.ok(!('reps' in D.knowledgeOf(d)));
  }
  for (const d of LIBRARY) {
    assert.ok(!('reps' in d));
    assert.ok(!('seconds' in d));
  }
  assert.equal(activitySchema.safeParse({ ...activity(), defaultReps: 10 }).success, false);
  for (const target of [{ metric: 'reps', value: 0 }, { metric: 'breaths', value: 0 }, { metric: 'duration', value: 0, unit: 's' }, { metric: 'distance', value: 0, unit: 'yd' }]) {
    assert.ok(actualSchema.safeParse({ target, load: { value: 0, unit: 'lb' }, side: 'left' }).success);
  }
});
test('catalog updates, removal and custom edits never rewrite pinned routines or saved snapshots', () => {
  const a = activity();
  const d = D.activityDef(a);
  const r = routine([target(a, 'reps')]);
  const before = D.snapshotFromRoutine(r, []);
  const frozen = JSON.stringify(before);
  D.useCatalogRelease({ ...release, activities: [activity({ id: a.id, name: 'Updated knowledge', version: 2 }), ...release.activities] });
  const next = D.snapshotFromRoutine(r, []);
  assert.equal(next.items[0].name, before.items[0].name);
  assert.deepEqual(next.items[0].definition, before.items[0].definition);
  D.useCatalogRelease({ ...release, activities: release.activities.filter(x => x.id !== a.id) });
  assert.equal(D.snapshotFromRoutine(r, []).items.length, 1);
  assert.equal(JSON.stringify(before), frozen);
  assert.equal(d.name, a.name);
  const archived = { ...d, archived: true };
  assert.equal(D.snapshotFromRoutine(r, [archived]).items[0].name, a.name);
  D.useCatalogRelease(release);
});
test('all measurements and units round trip routines, exceptions, running sessions and completion actuals', () => {
  const a = activity({ id: 'cx_metrics', authorship: 'user', reviewStatus: 'unreviewed',
    adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'User authored.' } });
  const d = D.activityDef(a);
  const items = [target(a, 'reps'), target(a, 'time'), target(a, 'breaths'), ...(['m', 'km', 'mi', 'yd'] as const).map(u => target(a, 'distance', u))];
  const r = routine(items);
  const snapshot = D.snapshotFromRoutine(r, [d]);
  assert.deepEqual(D.snapshotErrors(snapshot.items), []);
  let active = D.startActive({ date, occurrenceKey: null, snapshot, items: [...snapshot.items] }, 1000);
  assert.equal(active.estimateSec, null);
  for (let n = 0; n < items.length; n++) {
    active.index = n;
    const s = D.buildSet(active.items[n], n >= 3 ? 2.5 : 5, { load: 0, unit: n % 2 ? 'kg' : 'lb' });
    assert.deepEqual(D.actualErrors(s, active.items[n]), []);
    active = D.logSetOn(active, s);
  }
  const completion = D.completeActive(active, { difficulty: null }, 2000);
  const entry = D.scheduleEntry(snapshot, date, [6]);
  entry.exceptions[date] = { snapshot, moveTo: '2026-10-11' };
  const state = { ...D.emptyState(), customExercises: [d], routines: [r], schedule: [entry], active, completions: [completion] };
  const raw = JSON.stringify(D.exportPayload(state));
  const imported = D.checkImport(raw);
  assert.ok(imported.ok, imported.ok ? '' : imported.error);
  if (!imported.ok) return;
  assert.deepEqual(imported.data, JSON.parse(raw).data);
  assert.equal(imported.data.completions[0].estimateSec, null);
  assert.equal(imported.data.completions[0].exercises[6].sets[0].distanceUnit, 'yd');
  assert.equal(imported.data.completions[0].exercises[2].sets[0].breaths, 5);
  assert.deepEqual(imported.data.completions[0].executedItems, JSON.parse(JSON.stringify(active.items)));
  assert.equal(imported.data.active!.logs[0].sets[0].load, 0);
  assert.ok(Object.isFrozen(imported.data.completions[0]));
  const broken = JSON.parse(raw);
  delete broken.data.active.logs[6].sets[0].distanceUnit;
  const bad = D.checkImport(JSON.stringify(broken));
  assert.ok(!bad.ok && /distance.*unit/i.test(bad.error));
  const wrong = JSON.parse(raw);
  wrong.data.active.items[6].distanceUnit = 'seconds';
  const err = D.checkImport(JSON.stringify(wrong));
  assert.ok(!err.ok && /active.items.6.distanceUnit/.test(err.error));
});
test('breaths/distance have unknown duration and never produce a false time-fit claim', () => {
  for (const metric of ['breaths', 'distance'] as const) {
    const d = D.activityDef(activity());
    const item = D.snapItem(target(d.activity!, metric), d);
    assert.ok(Number.isNaN(D.estimateSec([item])));
    assert.equal(D.minutesLabel(D.estimateSec([item])), 'Duration unknown');
    const p = { activityId: d.id, target: metric === 'breaths' ? { metric, value: 6 } : { metric, value: 1, unit: 'km' }, sets: 1, restSeconds: 0, side: 'left', perSide: false, locked: false, priority: 'normal' };
    assert.equal(estimatePrescription(p as never).seconds, null);
    const res = D.adapt(D.snapshotFromItems('Measured', [item]), DEFAULT_PROFILE, [], { targetMinutes: 30, lowEnergy: true, approvedSubs: {} });
    assert.equal(res.fits, false);
    assert.match(res.infeasible!, /unknown/i);
    assert.deepEqual(res.items, JSON.parse(JSON.stringify([item])));
  }
});
test('sequence expansion preserves nested order, repeated members and inherited side; every target is explicit', () => {
  const leaf = activity({ id: 'leaf' });
  const seq = activity({ id: 'seq', type: 'sequence' });
  const nested = activity({ id: 'nested', type: 'sequence' });
  const r: CatalogRelease = { ...release, activities: [leaf, seq, nested], sequences: [
    { sequenceId: 'seq', activityId: 'leaf', order: 0, side: 'left' },
    { sequenceId: 'seq', activityId: 'nested', order: 1, side: 'right' },
    { sequenceId: 'seq', activityId: 'leaf', order: 2, side: 'both' },
    { sequenceId: 'nested', activityId: 'leaf', order: 0, side: 'unspecified' },
    { sequenceId: 'nested', activityId: 'leaf', order: 1, side: 'left' },
  ] };
  assert.deepEqual(expandSequence(r, 'seq').map(m => m.side), ['left', 'right', 'left', 'both']);
  D.useCatalogRelease(r);
  const definitions = D.sequenceDefinitions('seq');
  const raw = definitions.map(m => ({ ...D.makeItem(m.definition), side: m.side }));
  assert.equal(new Set(raw.map(it => it.key)).size, 4);
  assert.ok(D.snapshotErrors(raw.map((it, n) => D.snapItem(it, definitions[n].definition))).length > 0);
  const entered = raw.map(it => ({ ...it, reps: 3, confirmed: true }));
  assert.deepEqual(D.snapshotErrors(entered.map((it, n) => D.snapItem(it, definitions[n].definition))), []);
  assert.deepEqual(entered.map(it => it.side), ['left', 'right', 'left', 'both']);
  D.useCatalogRelease(release);
});
test('adaptation requires affirmative metadata and preserves locks, rehab, unknowns and advanced yoga', () => {
  const a = activity();
  for (const patch of [
    { difficulty: 'advanced' as const, discipline: 'yoga' as const },
    { adaptation: { eligible: false, loadingKnown: true, loadedJoints: [], rationale: 'No permission.' } },
    { adaptation: { eligible: true, loadingKnown: false, loadedJoints: [], rationale: 'Unknown loading.' } },
    { equipment: null },
    { instructionNeeded: true },
  ] as Partial<Activity>[]) {
    const d = D.activityDef(activity(patch));
    const item = D.snapItem({ ...target(d.activity!, 'reps'), locked: false }, d);
    const result = D.adapt(D.snapshotFromItems('Chosen', [item]), DEFAULT_PROFILE, [], { targetMinutes: 1, lowEnergy: true, approvedSubs: {} });
    assert.deepEqual(result.items, JSON.parse(JSON.stringify([item])));
  }
  const eligible = D.activityDef(a);
  const base = D.snapItem({ ...target(a, 'reps'), locked: false, reps: 12 }, eligible);
  const lighter = D.adapt(D.snapshotFromItems('Chosen', [base]), DEFAULT_PROFILE, [], { targetMinutes: null, lowEnergy: true, approvedSubs: {} });
  assert.equal(lighter.items[0].reps, 9);
  assert.equal(lighter.items[0].load, 0);
  for (const patch of [{ locked: true }, { rehab: true }]) {
    const protectedItem = { ...base, ...patch };
    const res = D.adapt(D.snapshotFromItems('Protected', [protectedItem]), DEFAULT_PROFILE, [], { targetMinutes: 1, lowEnergy: true, approvedSubs: { [base.key]: D.BUILTIN[0].id } });
    assert.deepEqual(res.items, JSON.parse(JSON.stringify([protectedItem])));
  }
  const excluded = { ...base, locked: true, stresses: ['knees' as const] };
  const res = D.adapt(D.snapshotFromItems('Excluded', [excluded]), { ...DEFAULT_PROFILE, exclusions: ['knees'] }, [], { targetMinutes: null, lowEnergy: false, approvedSubs: { [base.key]: D.BUILTIN[0].id } });
  assert.equal(res.items.length, 0);
  assert.match(res.safety[0], /overrides the lock/);
});
test('equipment and alias/type/muscle/joint/difficulty/measurement filters cover rich activities', () => {
  const a = activity({ id: 'alias-test', name: 'Āsana example', sanskritName: 'Āsana', aliases: ['English alias'],
    type: 'asana', discipline: 'yoga', primaryMuscles: ['glutes'], joints: ['hip'], equipment: ['rings', 'strap'], difficulty: 'advanced' });
  D.useCatalogRelease({ ...release, activities: [a] });
  assert.ok(D.searchLibrary([], { query: 'asana', type: 'asana', muscle: 'glutes', joint: 'hip', gear: 'rings', difficulty: 'advanced', tracking: 'breaths' }).some(d => d.id === a.id));
  assert.ok(D.searchLibrary([], { query: 'English alias' }).some(d => d.id === a.id));
  const s = { ...D.emptyState(), profile: { ...DEFAULT_PROFILE, equipment: ['none', 'rings', 'strap', 'pool', 'rack'] as const as D.Gear[] } };
  assert.ok(D.checkImport(JSON.stringify(D.exportPayload(s))).ok);
  D.useCatalogRelease(release);
});
test('user-authored sequence membership follows the canonical contract, expands repetitions and round trips', () => {
  const a = activity({ id: 'cx_local_sequence', type: 'sequence', authorship: 'user', reviewStatus: 'unreviewed',
    adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'User authored.' } });
  const leaf = activity({ id: 'cx_local_leaf', authorship: 'user', reviewStatus: 'unreviewed',
    adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'User authored.' } });
  const d = { ...D.activityDef(a), sequenceMembers: [
    { sequenceId: a.id, activityId: leaf.id, order: 0, side: 'right' as const },
    { sequenceId: a.id, activityId: leaf.id, order: 1, side: 'left' as const },
  ] };
  const custom = [d, D.activityDef(leaf)];
  assert.deepEqual(D.sequenceDefinitions(a.id, custom).map(x => x.side), ['right', 'left']);
  assert.ok(D.snapshotErrors([D.snapItem(target(a, 'reps'), d)]).some(x => /Expand/.test(x)));
  const round = D.checkImport(JSON.stringify(D.exportPayload({ ...D.emptyState(), customExercises: custom })));
  assert.ok(round.ok);
  if (round.ok) assert.deepEqual(round.data.customExercises[0].sequenceMembers, d.sequenceMembers);
  let error = '';
  try { D.sequenceDefinitions(a.id, [{ ...d, sequenceMembers: [{ sequenceId: a.id, activityId: a.id, order: 0, side: 'unspecified' }] }]); }
  catch (err) { error = String(err); }
  assert.match(error, /cycle/);
});
test('editing existing custom Steps and Notes survives save and reopen without changing old snapshots', () => {
  const a = activity({ id: 'cx_content', authorship: 'user', reviewStatus: 'unreviewed',
    description: 'Old notes', execution: ['Old step'],
    adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'User authored.' } });
  const existing = D.userAuthoredDefinition(D.activityDef(a), undefined, '2026-10-10T01:00:00Z');
  const original = D.snapshotFromRoutine(routine([target(existing.activity!, 'reps')]), [existing]);
  const savedSnapshot = JSON.stringify(original);
  const edited = D.editActivityText(D.knowledgeOf(existing), { notes: 'New clinician notes', steps: 'New setup\nNew return' });
  const saved = D.userAuthoredDefinition({ ...existing, activity: edited }, existing, '2026-10-10T02:00:00Z');
  const state = { ...D.emptyState(), customExercises: [saved], schedule: [D.scheduleEntry(original, date)] };
  const reopened = D.loadStored(JSON.stringify(state), null);
  assert.ok(reopened.state, reopened.error ?? '');
  const def = reopened.state!.customExercises[0];
  assert.equal(D.knowledgeOf(def).description, 'New clinician notes');
  assert.deepEqual(D.knowledgeOf(def).execution, ['New setup', 'New return']);
  assert.equal(def.instructions, 'New clinician notes');
  assert.equal(def.version, 2);
  assert.deepEqual(reopened.state!.schedule[0].snapshot, JSON.parse(savedSnapshot));
  const cleared = D.userAuthoredDefinition({ ...def, activity: D.editActivityText(D.knowledgeOf(def), { steps: '', notes: 'Notes after clearing steps' }) }, def, '2026-10-10T03:00:00Z');
  const again = D.loadStored(JSON.stringify({ ...state, customExercises: [cleared] }), null).state!;
  assert.deepEqual(D.knowledgeOf(again.customExercises[0]).execution, []);
  assert.equal(D.knowledgeOf(again.customExercises[0]).description, 'Notes after clearing steps');
});
