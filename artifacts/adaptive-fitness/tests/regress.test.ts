import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as D from '../lib/domain';

test('tracking change reps->time blocks scheduling/start until reconciled', () => {
  const base = D.allExercises([]).find((e) => e.tracking === 'reps' && !e.loadable)!;
  const custom = { ...base, id: 'cx-1', custom: true, verified: false, archived: false, version: 1 } as D.ExerciseDef;
  const routine = { items: [D.makeItem(custom)] };
  const edited: D.ExerciseDef = { ...custom, tracking: 'time', defaultReps: undefined, defaultSeconds: 40, version: 2 };
  assert.equal(D.routineMismatches(routine, [edited]).length, 1);
  const errs = D.snapshotErrors(routine.items.map((it) => D.snapItem(it, edited)));
  assert.ok(errs.length > 0 && /tracks time/.test(errs[0]));
  const fixed = routine.items.map((it) => D.reconcileItem(it, edited));
  assert.equal(fixed[0].seconds, 40);
  assert.equal(fixed[0].reps, undefined);
  assert.deepEqual(D.snapshotErrors(fixed.map((it) => D.snapItem(it, edited))), []);
  const back: D.ExerciseDef = { ...edited, tracking: 'reps', defaultReps: 12, defaultSeconds: undefined };
  assert.equal(D.routineMismatches({ items: fixed }, [back]).length, 1);
  assert.equal(D.reconcileItem(fixed[0], back).reps, 12);
  assert.ok(D.snapshotErrors([]).length > 0);
});

test('logged sets carry load and unit together; resume restores both', () => {
  const item = { tracking: 'time' as const, loadable: true, load: 10, unit: 'kg' as const };
  assert.deepEqual(D.nextLoad(item, []), { load: 10, unit: 'kg' });
  const auto = D.buildSet(item, 30, D.nextLoad(item, []));
  assert.deepEqual(auto, { seconds: 30, load: 10, unit: 'kg' });
  assert.deepEqual(D.nextLoad(item, [auto, { seconds: 30, load: 25, unit: 'lb' }]), { load: 25, unit: 'lb' });
  assert.deepEqual(D.buildSet({ tracking: 'reps', loadable: false, unit: 'kg' }, 8, { load: 20, unit: 'kg' }), { reps: 8 });
});

test('low energy never lengthens a short hold', () => {
  assert.equal(D.lowEnergySeconds(5), 5);
  assert.equal(D.lowEnergySeconds(10), 10);
  assert.equal(D.lowEnergySeconds(60), 45);
});
