// Domain regression tests. Run: pnpm --filter @workspace/adaptive-fitness run test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUILTIN,
  ExerciseDef,
  Routine,
  StateV2,
  exerciseSourceLabel,
  addToActive,
  adapt,
  applyRoutineToFuture,
  checkImport,
  completeActive,
  deleteOccurrence,
  editOccurrence,
  emptyState,
  estimateSec,
  exportPayload,
  findOccurrence,
  loadStored,
  logSetOn,
  makeItem,
  migrateV1,
  migrateV2,
  moveOccurrence,
  occurrencesBetween,
  rolloverState,
  scheduleEntry,
  searchLibrary,
  sequenceDefinitions,
  snapItem,
  snapshotFromItems,
  snapshotFromRoutine,
  startActive,
} from '../lib/domain';
import { DEFAULT_PROFILE, addDays, weekday } from '../lib/engine';

const ex = (id: string) => BUILTIN.find((b) => b.id === id)!;
const MON = '2025-03-03'; // a Monday
assert.equal(weekday(MON), 1);

function routine(items = ['sit-to-stand', 'glute-bridge', 'dead-bug']): Routine {
  return { id: 'rt1', name: 'Desk reset', notes: '', items: items.map((i) => makeItem(ex(i))), version: 1, archived: false, createdAt: 'x', updatedAt: 'x' };
}

const v1 = {
  schemaVersion: 1,
  profile: { ...DEFAULT_PROFILE, setupDone: true, exclusions: ['knees'] },
  plan: null,
  events: [],
  completions: [
    { id: 'c1', date: '2025-02-01', sessionId: 's', title: 'Quick lift', plannedMinutes: 10, startedAt: '2025-02-01T08:00:00Z', finishedAt: '2025-02-01T08:10:00Z', activeSeconds: 600, exercises: [{ exerciseId: 'march', name: 'March in place', kind: 'time', plannedSets: 1, reps: [45], done: true, skipped: false }, { exerciseId: 'wall-push', name: 'Wall push-up', kind: 'reps', plannedSets: 2, reps: [10, 8], done: true, skipped: false }], finishedEarly: false, stoppedForPain: false, difficulty: 3 },
  ],
  active: { id: 'run1', date: '2025-02-02', session: { id: 's2', title: 'Steady', minutes: 20, lowEnergy: false, noEquipment: true, note: '', exercises: [{ exerciseId: 'march', name: 'March in place', kind: 'time', sets: 1, seconds: 45, restSec: 30 }, { exerciseId: 'wall-push', name: 'Wall push-up', kind: 'reps', sets: 2, reps: 10, restSec: 30 }] }, startedAt: '2025-02-02T08:00:00Z', clock: { accMs: 1000, since: null }, exClock: { accMs: 0, since: null }, index: 1, logs: [{ exerciseId: 'march', name: 'March in place', kind: 'time', plannedSets: 1, reps: [45], done: true, skipped: false }, { exerciseId: 'wall-push', name: 'Wall push-up', kind: 'reps', plannedSets: 2, reps: [9], done: false, skipped: false }] },
};

test('migration v1 -> current keeps profile, history and active session', () => {
  const s = migrateV1(v1 as never);
  assert.equal(s.schemaVersion, 3);
  assert.deepEqual(s.profile.exclusions, ['knees']);
  assert.equal(s.completions.length, 1);
  assert.deepEqual(s.completions[0].exercises[1].sets, [{ reps: 10 }, { reps: 8 }]);
  assert.deepEqual(s.completions[0].exercises[0].sets, [{ seconds: 45 }]);
  assert.ok(s.active);
  assert.equal(s.active!.index, 1);
  assert.deepEqual(s.active!.logs[1].sets, [{ reps: 9 }]);
  assert.equal(s.active!.items.length, s.active!.logs.length);
  assert.deepEqual(s.routines, []);
  const loaded = loadStored(null, JSON.stringify(v1));
  assert.equal(loaded.migrated, true);
  assert.equal(loaded.state!.completions.length, 1);
});

test('corrupt stored v2 is reported, not silently replaced', () => {
  const r = loadStored('{"schemaVersion":2,"profile":5}', JSON.stringify(v1));
  assert.equal(r.state, null);
  assert.match(r.error!, /backup/);
});

test('weekly recurrence expands on local weekdays and respects until', () => {
  const snap = snapshotFromRoutine(routine(), []);
  const e = scheduleEntry(snap, MON, [1, 3], addDays(MON, 13));
  const occ = occurrencesBetween([e], MON, addDays(MON, 30));
  assert.deepEqual(occ.map((o) => o.date), [MON, addDays(MON, 2), addDays(MON, 7), addDays(MON, 9)]);
  // DST-ish span: month crossing still lands on Mondays/Wednesdays
  occ.forEach((o) => assert.ok([1, 3].includes(weekday(o.date))));
});

test('multiple sessions per day and one-off entries', () => {
  const a = scheduleEntry(snapshotFromRoutine(routine(), []), MON, null, null, '2025-01-01T00:00:00Z');
  const b = scheduleEntry(snapshotFromRoutine(routine(['march']), []), MON, null, null, '2025-01-01T00:00:01Z');
  const occ = occurrencesBetween([a, b], MON, MON);
  assert.equal(occ.length, 2);
});

test('move, delete occurrence and this-and-future with exceptions', () => {
  const snap = snapshotFromRoutine(routine(), []);
  let sch = [scheduleEntry(snap, MON, [1], null)];
  const range = () => occurrencesBetween(sch, MON, addDays(MON, 27)).map((o) => o.date);
  assert.deepEqual(range(), [MON, addDays(MON, 7), addDays(MON, 14), addDays(MON, 21)]);
  // move week 2 to Tuesday
  const w2 = findOccurrence(sch, `${sch[0].rootId}@${addDays(MON, 7)}`)!;
  sch = moveOccurrence(sch, w2, addDays(MON, 8));
  assert.deepEqual(range(), [MON, addDays(MON, 8), addDays(MON, 14), addDays(MON, 21)]);
  // delete only week 3
  const w3 = findOccurrence(sch, `${sch[0].rootId}@${addDays(MON, 14)}`)!;
  sch = deleteOccurrence(sch, w3, 'one');
  assert.deepEqual(range(), [MON, addDays(MON, 8), addDays(MON, 21)]);
  // edit this-and-future from week 4 with a new snapshot: earlier dates keep old snapshot
  const w4 = findOccurrence(sch, `${sch[0].rootId}@${addDays(MON, 21)}`)!;
  const newSnap = snapshotFromItems('Shorter', [snapItem(makeItem(ex('march')), ex('march'))]);
  sch = editOccurrence(sch, w4, newSnap, 'future');
  const all = occurrencesBetween(sch, MON, addDays(MON, 35));
  assert.equal(all.find((o) => o.date === MON)!.snapshot.id, snap.id);
  assert.equal(all.find((o) => o.date === addDays(MON, 8))!.snapshot.id, snap.id);
  assert.equal(all.find((o) => o.date === addDays(MON, 21))!.snapshot.id, newSnap.id);
  assert.equal(all.find((o) => o.date === addDays(MON, 28))!.snapshot.id, newSnap.id);
  // keys stay stable across the split
  assert.ok(all.every((o) => o.key.startsWith(sch[0].rootId)));
  // delete this-and-future from week 2 removes moved week 2 and the tail
  const w2b = findOccurrence(sch, `${sch[0].rootId}@${addDays(MON, 7)}`)!;
  sch = deleteOccurrence(sch, w2b, 'future');
  assert.deepEqual(occurrencesBetween(sch, MON, addDays(MON, 60)).map((o) => o.date), [MON]);
});

test('routine edits never change scheduled snapshots or completed history unless asked', () => {
  const r = routine();
  const snap = snapshotFromRoutine(r, []);
  assert.ok(Object.isFrozen(snap) && Object.isFrozen(snap.items[0]));
  let sch = [scheduleEntry(snap, MON, [1], null)];
  const active = startActive({ date: MON, occurrenceKey: `${sch[0].rootId}@${MON}`, snapshot: snap, items: [...snap.items] });
  const done = completeActive(logSetOn(active, { reps: 10 }), { difficulty: 3 });
  const edited: Routine = { ...r, version: 2, items: r.items.slice(0, 1) };
  r.items[0].sets = 9; // mutate source: snapshot must not follow
  assert.notEqual(snap.items[0].sets, 9);
  assert.equal(occurrencesBetween(sch, addDays(MON, 7), addDays(MON, 7))[0].snapshot.items.length, 3);
  // explicit update from week 2
  const res = applyRoutineToFuture(sch, r.id, snapshotFromRoutine(edited, []), addDays(MON, 7));
  sch = res.schedule;
  assert.equal(res.changed, 1);
  assert.equal(occurrencesBetween(sch, MON, MON)[0].snapshot.items.length, 3);
  assert.equal(occurrencesBetween(sch, addDays(MON, 7), addDays(MON, 7))[0].snapshot.items.length, 1);
  assert.equal(done.snapshot!.items.length, 3);
  assert.equal(done.exercises[0].sets[0].reps, 10);
});

test('rollover and profile changes keep user schedule, routines and custom moves', () => {
  let s: StateV2 = { ...emptyState(), routines: [routine()] };
  s = { ...s, schedule: [scheduleEntry(snapshotFromRoutine(s.routines[0], []), addDays(MON, 1), [2], null)] };
  s = rolloverState(s, MON, 'starter', 'x');
  const before = JSON.stringify(s.schedule);
  s = rolloverState(s, addDays(MON, 1), 'rollover', 'midnight');
  s = rolloverState({ ...s, profile: { ...s.profile, exclusions: ['knees'] } }, addDays(MON, 1), 'profile', 'p');
  assert.equal(JSON.stringify(s.schedule), before);
  assert.equal(s.routines.length, 1);
  assert.equal(occurrencesBetween(s.schedule, addDays(MON, 1), addDays(MON, 1)).length, 1);
  // persists through serialize/reload ("restart")
  const reloaded = loadStored(JSON.stringify(s), null);
  assert.equal(reloaded.error, null);
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.state!.schedule)), JSON.parse(before));
});

test('adaptation: exclusions override locks, locks and rehab are preserved, volume trimmed before removal', () => {
  const custom: ExerciseDef = { ...ex('glute-bridge'), id: 'c-rehab', name: 'Clinic bridge', custom: true, verified: false, rehab: true, stresses: [] };
  const items = [
    snapItem({ ...makeItem(ex('split-squat')), locked: true }, ex('split-squat')), // knees, locked
    snapItem({ ...makeItem(ex('band-row')), sets: 4, locked: true }, ex('band-row')),
    snapItem({ ...makeItem(ex('dead-bug')), sets: 3, priority: 'optional' }, ex('dead-bug')),
    snapItem({ ...makeItem(custom), reps: 12, sets: 3 }, custom),
  ];
  const snap = snapshotFromItems('Mine', items);
  const p = { ...DEFAULT_PROFILE, exclusions: ['knees' as const], equipment: ['none' as const, 'band' as const] };
  const r = adapt(snap, p, [custom], { targetMinutes: 5, lowEnergy: true, approvedSubs: {} });
  assert.ok(!r.items.some((i) => i.exerciseId === 'split-squat'));
  assert.match(r.safety[0], /overrides the lock/);
  const row = r.items.find((i) => i.exerciseId === 'band-row')!;
  assert.equal(row.sets, 4); // locked: untouched
  assert.equal(row.reps, items[1].reps);
  const rehab = r.items.find((i) => i.exerciseId === 'c-rehab')!;
  assert.equal(rehab.sets, 3);
  assert.equal(rehab.reps, items[3].reps);
  assert.equal(r.fits, false);
  assert.match(r.infeasible!, /won’t claim it fits/);
  assert.ok(!r.suggestions.some((s) => s.itemName === 'Supported split squat')); // locked: never offered swaps
  assert.ok(!r.suggestions.some((s) => s.itemKey === items[3].key)); // custom never gets auto subs
  // estimate includes rest
  assert.equal(estimateSec([{ tracking: 'reps', reps: 10, sets: 2, restSec: 30, perSide: false }]), 2 * 30 + 30 + 15);
});

test('adaptation reduces sets before dropping optional moves and only substitutes with approval', () => {
  const items = ['sit-to-stand', 'dead-bug', 'wall-push'].map((id, n) => snapItem({ ...makeItem(ex(id)), sets: 3, priority: n === 1 ? 'optional' : 'normal' }, ex(id)));
  const snap = snapshotFromItems('Three', items);
  const r = adapt(snap, DEFAULT_PROFILE, [], { targetMinutes: 4, lowEnergy: false, approvedSubs: {} });
  assert.ok(r.items.length >= 2);
  assert.ok(r.items.filter((i) => i.priority === 'normal').every((i) => i.sets === 1));
  const ex2 = { ...DEFAULT_PROFILE, exclusions: ['knees' as const] };
  const r2 = adapt(snap, ex2, [], { targetMinutes: null, lowEnergy: false, approvedSubs: {} });
  assert.ok(!r2.items.some((i) => i.exerciseId === 'sit-to-stand'));
  const sug = r2.suggestions[0].options[0].id;
  const r3 = adapt(snap, ex2, [], { targetMinutes: null, lowEnergy: false, approvedSubs: { [items[0].key]: sug } });
  assert.ok(r3.items.some((i) => i.exerciseId === sug));
});

test('mid-session add keeps logged work; completion stores planned and actual separately', () => {
  const snap = snapshotFromRoutine(routine(['db-row']), []);
  let a = startActive({ date: MON, occurrenceKey: null, snapshot: snap, items: [...snap.items] });
  a = logSetOn(a, { reps: 8, load: 12.5, unit: 'kg' });
  a = addToActive(a, ex('march'));
  assert.equal(a.logs.length, 2);
  assert.deepEqual(a.logs[0].sets, [{ reps: 8, load: 12.5, unit: 'kg' }]);
  assert.equal(a.logs[1].added, true);
  const c = completeActive(a, { difficulty: null });
  assert.equal(c.exercises[0].planned.reps, 10);
  assert.equal(c.exercises[0].sets[0].reps, 8);
  assert.equal(c.snapshot!.items.length, 1);
});

test('import validation: v1 upgrade, v2 round trip incl. active, explicit errors', () => {
  const up = checkImport(JSON.stringify({ app: 'tempo', exportedAt: 'x', data: v1 }));
  assert.ok(up.ok && up.migratedFrom === 1 && up.data.active);
  let s: StateV2 = migrateV2({ ...emptyState(), schemaVersion: 2, routines: [routine()], customExercises: [{ ...ex('march'), id: 'c1', custom: true, verified: false }] } as never);
  const snap = snapshotFromRoutine(s.routines[0], []);
  let sch = [scheduleEntry(snap, MON, [1], null)];
  sch = deleteOccurrence(sch, findOccurrence(sch, `${sch[0].rootId}@${addDays(MON, 7)}`)!, 'one');
  s = { ...s, schedule: sch, active: startActive({ date: MON, occurrenceKey: null, snapshot: snap, items: [...snap.items] }) };
  const round = checkImport(JSON.stringify(exportPayload(s)));
  assert.ok(round.ok);
  if (round.ok) {
    assert.equal(round.data.schedule[0].exceptions[addDays(MON, 7)].deleted, true);
    assert.ok(round.data.active);
  }
  assert.equal(checkImport('{nope').ok, false);
  const bad = checkImport(JSON.stringify(exportPayload({ ...s, routines: [{ ...s.routines[0], items: [{ ...s.routines[0].items[0], exerciseId: 'ghost' }] }] })));
  assert.ok(!bad.ok && /isn’t in the file|mismatch/.test(bad.error));
  const v9 = checkImport(JSON.stringify({ app: 'tempo', data: { schemaVersion: 9 } }));
  assert.ok(!v9.ok && /Unsupported/.test(v9.error));
  const dup = checkImport(JSON.stringify(exportPayload({ ...s, routines: [s.routines[0], s.routines[0]] })));
  assert.ok(!dup.ok && /Duplicate/.test(dup.error));
});

test('library search and filters', () => {
  assert.ok(searchLibrary([], { discipline: 'yoga' }).length >= 6);
  assert.ok(searchLibrary([], { gear: 'barbell' }).every((e) => e.gear.includes('barbell')));
  assert.ok(searchLibrary([], { query: 'hip' }).length > 0);
  const archived: ExerciseDef = { ...ex('march'), id: 'c-arch', custom: true, verified: false, archived: true };
  assert.equal(searchLibrary([archived], { source: 'custom' }).length, 0);
  assert.equal(searchLibrary([archived], { source: 'custom', includeArchived: true }).length, 1);
});

test('Explore and routine picker share catalog search while local and legacy entries retain clear provenance', () => {
  const shared = searchLibrary([], { source: 'shared' });
  assert.ok(shared.length > 0 && shared.every(e => !!e.activity && !e.custom));
  const downDog = searchLibrary([], { query: 'Downward-facing dog' });
  assert.equal(downDog.length, 1, 'a shared name/alias should replace its duplicate legacy row');
  assert.equal(exerciseSourceLabel(downDog[0]), 'Shared catalog · source-checked');
  const legacy = searchLibrary([], { source: 'legacy' });
  assert.ok(legacy.length > 0 && legacy.every(e => !e.activity && !e.custom));
  const personal = { ...ex('march'), id: 'personal_move_1', name: 'My private movement', custom: true, verified: false };
  assert.deepEqual(searchLibrary([personal], { source: 'local' }).map(e => e.id), [personal.id]);
  assert.equal(searchLibrary([], { source: 'local' }).length, 0);
  assert.equal(exerciseSourceLabel(personal), 'On this device · user-authored · unreviewed');
  assert.equal(searchLibrary([], { query: 'My private movement' }).length, 0, 'personal activity names must not enter shared results');
});

test('source-checked Ashtanga sun salutations keep ordered repeated members and explicit sides', () => {
  const a = sequenceDefinitions('yoga-surya-namaskara-a');
  assert.deepEqual(a.map(member => member.definition.name), [
    'Samasthitih', 'Urdhva Hastasana', 'Uttanasana A', 'Uttanasana B', 'Chaturanga Dandasana',
    'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana', 'Uttanasana B', 'Uttanasana A',
    'Urdhva Hastasana', 'Samasthitih',
  ]);
  const b = sequenceDefinitions('yoga-surya-namaskara-b');
  assert.equal(b.length, 19);
  assert.equal(b[7].side, 'right');
  assert.equal(b[11].side, 'left');
  assert.equal(b[0].side, 'unspecified');
});
