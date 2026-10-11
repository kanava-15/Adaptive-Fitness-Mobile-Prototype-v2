import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../lib/domain';
import { buildPlan, DEFAULT_PROFILE } from '../lib/engine';

const date = '2026-10-12';
const now = '2026-10-12T08:00:00.000Z';

function legacyState(): D.StateV2 {
  const definition = D.BUILTIN.find(d => d.id === 'glute-bridge')!;
  const routine: D.Routine = {
    id: 'rt_mine', name: 'My workout', notes: '', version: 1,
    archived: false, createdAt: now, updatedAt: now,
    items: [D.makeItem(definition)],
  };
  const snapshot = D.snapshotFromRoutine(routine, []);
  let active = D.startActive({ date, occurrenceKey: null, snapshot, items: [...snapshot.items] });
  active = D.logSetOn(active, { reps: 10, load: 0, unit: 'kg' });
  const completion = D.completeActive(active, { rpe: 3 });
  const plan = buildPlan(DEFAULT_PROFILE, date, [], 7);
  return {
    ...D.emptyState(), plan, routines: [routine],
    customExercises: [D.userAuthoredDefinition({ ...definition, id: 'c_mine', name: 'My bridge', custom: true }, undefined, now)],
    schedule: [D.scheduleEntry(snapshot, date, [1], null)],
    presets: { c_mine: { defaultReps: 12, defaultSeconds: 30 } },
    active, completions: [completion],
    events: [{
      id: 'ev_old', at: now, kind: 'starter', date, planVersion: 7,
      reason: 'Old automatic plan', before: null, after: plan.days[0],
    }],
  };
}

function assertPersonalDataUnchanged(before: D.StateV2, after: D.StateV2) {
  assert.equal(after.plan, null);
  const { plan: _before, ...personalBefore } = before;
  const { plan: _after, ...personalAfter } = after;
  assert.deepEqual(JSON.parse(JSON.stringify(personalAfter)), JSON.parse(JSON.stringify(personalBefore)));
}

test('clearing automatic plans keeps routines, schedule, active clocks, logged zero loads and history', () => {
  const before = legacyState();
  const original = JSON.stringify(before);
  const after = D.withoutAutomaticSuggestions(before);
  assertPersonalDataUnchanged(before, after);
  assert.equal(after.active, before.active);
  assert.equal(after.schedule, before.schedule);
  assert.equal(after.completions, before.completions);
  assert.equal(JSON.stringify(before), original);
  assert.equal(D.withoutAutomaticSuggestions(after), after);
});

test('restart and import discard only the old automatic plan', () => {
  const before = legacyState();
  const loaded = D.loadStored(JSON.stringify(before), null);
  assert.equal(loaded.error, null);
  assert.ok(loaded.state);
  assertPersonalDataUnchanged(before, loaded.state);
  const imported = D.checkImport(JSON.stringify(D.exportPayload(before)));
  assert.equal(imported.ok, true);
  if (imported.ok) assertPersonalDataUnchanged(before, imported.data);
  assert.equal(D.loadStored(JSON.stringify(loaded.state), null).state!.plan, null);
});

test('first launch, new days and profile changes never create automatic sessions', () => {
  let state = D.emptyState();
  for (const kind of ['starter', 'rollover', 'setup', 'profile'] as const) {
    state = D.rolloverState(state, date, kind, 'No automatic workouts');
    assert.equal(state.plan, null);
    assert.equal(state.schedule.length, 0);
    assert.equal(state.events.length, 0);
  }
  const existing = legacyState();
  const next = D.rolloverState(existing, '2026-10-13', 'rollover', 'New day');
  assertPersonalDataUnchanged(existing, next);
});
