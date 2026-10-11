import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type CatalogRelease } from '@workspace/activity-catalog';
import starter from '@workspace/activity-catalog/starter';
import * as D from '../lib/domain';

const release = (starter as { release: CatalogRelease }).release;
const date = '2026-10-11';
const sport = release.activities.find(a => a.name === 'Road running')!;
const sequence = release.activities.find(a => a.id === 'yoga-surya-namaskara-a')!;
const entryState = () => {
  D.useCatalogRelease(release);
  const item = D.makeItem(D.BUILTIN.find(d => d.id === 'march')!);
  const routine: D.Routine = { id: 'personal_rt', name: 'Warm-up and cooldown', notes: 'Retain', version: 1,
    archived: false, createdAt: date, updatedAt: date, items: [item, { ...item, key: 'cooldown' }] };
  const snapshot = D.snapshotFromRoutine(routine, []);
  const active = D.startActive({ date, occurrenceKey: null, snapshot, items: [...snapshot.items] }, 100);
  active.logs[0].sets = [{ seconds: 20, load: 0, unit: 'lb' }];
  active.index = 1;
  active.clock = { accMs: 200, since: 100 };
  active.exClock = { accMs: 300, since: 150 };
  const completion = D.completeActive(active, { rpe: 8 }, 500);
  return { ...D.emptyState(), routines: [routine], schedule: [D.scheduleEntry(snapshot, date, [0])], active,
    completions: [completion], savedActivities: [D.makeSavedActivity(sport.id, sport)], presets: { [sport.id]: { defaultSeconds: 3600 } } };
};
const entered = (items: D.RoutineItem[]) => items.map(it => ({ ...it, confirmed: true,
  ...(it.definition!.tracking === 'time' ? { seconds: 40 } : it.definition!.tracking === 'breaths' ? { breaths: 5 } : { reps: 3 }) }));

test('Explore additions are blank even with catalog presets; sports amount and distance unit must be entered', () => {
  const state = entryState();
  for (const activity of [sport, release.activities.find(a => a.type === 'exercise')!]) {
    const batch = D.itemsFromSelection([D.activityDef(activity)], [], { [activity.id]: { defaultSeconds: 1800, defaultReps: 12 } });
    assert.equal(batch.error, null);
    assert.equal(batch.items[0].seconds, undefined);
    assert.equal(batch.items[0].reps, undefined);
    assert.equal(batch.items[0].distance, undefined);
    assert.equal(batch.items[0].confirmed, false);
  }
  const blank = D.itemsFromSelection([D.activityDef(sport)], [], state.presets).items;
  assert.equal(blank[0].distanceUnit, undefined);
  for (const target of [blank[0], { ...blank[0], confirmed: true, distance: 5 }, { ...blank[0], seconds: 60 }]) {
    const rejected = D.appendSelectionToActive(state, state.active!.id, sport.id, [target]);
    assert.equal(rejected.state, state);
    assert.ok(rejected.errors.length);
  }
  const distance = { ...blank[0], confirmed: true, distance: 2.5, distanceUnit: 'mi' as const };
  const added = D.appendSelectionToActive(state, state.active!.id, sport.id, [distance]);
  assert.deepEqual(added.errors, []);
  const withRoutine = { ...added.state, routines: [...state.routines, {
    ...state.routines[0], id: 'new-distance-routine', name: 'Distance sport', items: [distance],
  }] };
  const restarted = D.loadStored(JSON.stringify(withRoutine), null);
  assert.equal(restarted.error, null);
  assert.equal(restarted.state!.routines.at(-1)!.items[0].distance, 2.5);
  assert.equal(restarted.state!.routines.at(-1)!.items[0].distanceUnit, 'mi');
  assert.deepEqual(restarted.state!.active!.items.at(-1), JSON.parse(JSON.stringify(added.state.active!.items.at(-1))));
  const restored = D.checkImport(JSON.stringify(D.exportPayload(withRoutine)));
  assert.ok(restored.ok, restored.ok ? '' : restored.error);
  if (restored.ok) assert.deepEqual(restored.data, JSON.parse(JSON.stringify(withRoutine)));
});

test('active batch append preserves pinned snapshots, prior logs, clocks, index, history and other personal records', () => {
  const state = entryState();
  const before = JSON.stringify(state);
  const batch = entered(D.itemsFromSelection([D.activityDef(sequence)]).items);
  const result = D.appendSelectionToActive(state, state.active!.id, sequence.id, batch);
  assert.deepEqual(result.errors, []);
  assert.equal(JSON.stringify(state), before);
  const next = result.state.active!;
  for (const field of ['snapshot', 'clock', 'exClock', 'index', 'startedAt'] as const) assert.deepEqual(next[field], state.active![field]);
  assert.deepEqual(next.logs.slice(0, 2), state.active!.logs);
  for (const field of ['routines', 'schedule', 'completions', 'customExercises', 'presets', 'savedActivities'] as const) assert.equal(result.state[field], state[field]);
  assert.deepEqual(next.items.slice(2).map(it => [it.exerciseId, it.side]), batch.map(it => [it.exerciseId, it.side]));
  assert.equal(new Set(next.items.map(it => it.key)).size, next.items.length);
  assert.ok(next.logs.slice(2).every(l => l.added && !l.sets.length));
  const retry = D.appendSelectionToActive(result.state, state.active!.id, sequence.id, batch);
  assert.equal(retry.state, result.state);
  const repeat = D.appendSelectionToActive(result.state, state.active!.id, sequence.id, entered(D.itemsFromSelection([D.activityDef(sequence)]).items));
  assert.equal(repeat.state.active!.items.length, next.items.length + batch.length);
  const restored = D.checkImport(JSON.stringify(D.exportPayload(result.state)));
  assert.ok(restored.ok, restored.ok ? '' : restored.error);
  if (restored.ok) assert.deepEqual(restored.data, JSON.parse(JSON.stringify(result.state)));
  assert.deepEqual(D.loadStored(JSON.stringify(result.state), null).state, JSON.parse(JSON.stringify(result.state)));
});

test('batch failures are atomic for ended/replaced sessions, invalid targets, and unavailable catalog members', () => {
  const state = entryState();
  const batch = entered(D.itemsFromSelection([D.activityDef(sequence)]).items);
  const fail = (input: D.StateV2, targets = batch) => {
    const result = D.appendSelectionToActive(input, state.active!.id, sequence.id, targets);
    assert.equal(result.state, input);
    assert.ok(result.errors.length);
  };
  fail({ ...state, active: null });
  fail({ ...state, active: { ...state.active!, id: 'different-session' } });
  fail(state, batch.map((it, n) => n === 3 ? { ...it, confirmed: false } : it));
  fail(state, [...batch, { ...batch[0] }]);
  const leafId = batch[1].exerciseId;
  try {
    for (const activities of [
      release.activities.filter(a => a.id !== leafId),
      release.activities.map(a => a.id === leafId ? { ...a, archived: true } : a),
      release.activities.map(a => a.id === sequence.id ? { ...a, archived: true } : a),
      release.activities.map(a => a.id === leafId ? { ...a, version: a.version + 1 } : a),
    ]) {
      D.useCatalogRelease({ ...release, activities });
      fail(state);
    }
    D.useCatalogRelease({ ...release, sequences: release.sequences.filter(m => !(m.sequenceId === sequence.id && m.order === 2)) });
    fail(state);
    D.useCatalogRelease({ ...release, sequences: release.sequences.map(m => m.sequenceId === sequence.id && m.order === 0 ? { ...m, side: 'both' } : m) });
    fail(state);
  } finally { D.useCatalogRelease(release); }
});

test('routine selection and position changes remain a draft; an archived nested sequence rejects every member', () => {
  const state = entryState();
  const before = JSON.stringify(state);
  const batch = D.itemsFromSelection([D.activityDef(sport)], [], state.presets);
  const draft = [...state.routines[0].items, ...batch.items];
  const [selected] = draft.splice(2, 1);
  draft.splice(1, 0, { ...selected, seconds: 300, confirmed: true });
  assert.equal(draft[1].exerciseId, sport.id);
  assert.deepEqual(draft[0], state.routines[0].items[0]);
  assert.deepEqual(draft[2], state.routines[0].items[1]);
  assert.equal(JSON.stringify(state), before, 'discarding a draft does not mutate any records');
  try {
    const outer = { ...sequence, id: 'nested-outer' };
    D.useCatalogRelease({ ...release, activities: [...release.activities.map(a => a.id === sequence.id ? { ...a, archived: true } : a), outer],
      sequences: [...release.sequences, { sequenceId: outer.id, activityId: sequence.id, order: 0, side: 'unspecified' }] });
    const rejected = D.itemsFromSelection([D.activityDef(sport), D.activityDef(outer)]);
    assert.ok(rejected.error);
    assert.deepEqual(rejected.items, []);
  } finally { D.useCatalogRelease(release); }
});
