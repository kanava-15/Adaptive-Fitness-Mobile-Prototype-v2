import assert from 'node:assert/strict';
import { test } from 'node:test';
import starter from '@workspace/activity-catalog/starter';
import type { CatalogRelease } from '@workspace/activity-catalog';
import { formatHistorySet, historyStatus, selectActivityHistory, sequenceDisplay } from '../lib/catalog-detail';
import * as D from '../lib/domain';

const release = (starter as { release: CatalogRelease }).release;

test('detail sequence preserves order, repeated members, inherited sides and archived eligibility without mutating catalog', () => {
  const leaf = { ...release.activities[0], id: 'leaf', type: 'exercise' as const };
  const sequence = { ...leaf, id: 'seq', type: 'sequence' as const };
  const nested = { ...sequence, id: 'nested' };
  const archived = { ...leaf, id: 'archived', archived: true };
  const r = { ...release, activities: [leaf, sequence, nested, archived], sequences: [
    { sequenceId: 'seq', activityId: 'archived', order: 3, side: 'both' as const },
    { sequenceId: 'seq', activityId: 'leaf', order: 0, side: 'left' as const },
    { sequenceId: 'seq', activityId: 'nested', order: 1, side: 'right' as const },
    { sequenceId: 'nested', activityId: 'leaf', order: 0, side: 'unspecified' as const },
    { sequenceId: 'nested', activityId: 'leaf', order: 1, side: 'left' as const },
  ] };
  const before = JSON.stringify(r);
  const display = sequenceDisplay(r, sequence);
  assert.equal(display.error, null);
  assert.deepEqual(display.steps.map(s => [s.position, s.activityId, s.side, s.navigable]), [
    [1, 'leaf', 'left', true], [2, 'leaf', 'right', true], [3, 'leaf', 'left', true], [4, 'archived', 'both', false],
  ]);
  assert.equal(JSON.stringify(r), before);
  assert.deepEqual(sequenceDisplay(r, leaf), { steps: [], error: null });
  assert.match(sequenceDisplay({ ...r, activities: [sequence, nested] }, sequence).error!, /Missing activity/);
  assert.match(sequenceDisplay({ ...r, sequences: [{ sequenceId: 'seq', activityId: 'seq', order: 0, side: 'both' }] }, sequence).error!, /cycle/);
});

test('recorded history retains every repeated identity, sorts newest first and leaves device records untouched', () => {
  const def = D.BUILTIN[0];
  const item = { ...D.makeItem(def), reps: 7, confirmed: true };
  const snapshot = D.snapshotFromItems('Personal workout', [D.snapItem(item, def)]);
  const completion = D.completeActive(D.startActive({ date: '2026-10-11', occurrenceKey: null, snapshot, items: [...snapshot.items] }, 1000), { rpe: null }, 2000);
  const log = completion.exercises[0];
  const first = { ...completion, id: 'first', finishedAt: '2026-10-10T10:00:00Z', exercises: [{ ...log, itemKey: 'a' }, { ...log, itemKey: 'b' }] };
  const second = { ...completion, id: 'second', finishedAt: '2026-10-11T10:00:00Z' };
  const state = { ...D.emptyState(), completions: [first, second] };
  const before = JSON.stringify(state);
  const history = selectActivityHistory(state.completions, def.id);
  assert.deepEqual(history.map(h => h.completion.id), ['second', 'first', 'first']);
  assert.deepEqual(history.slice(1).map(h => h.log.itemKey), ['a', 'b']);
  assert.equal(new Set(history.map(h => h.key)).size, 3);
  assert.deepEqual(selectActivityHistory(state.completions, 'unrecorded'), []);
  assert.equal(JSON.stringify(state), before);
});

test('actual measurement formatting preserves zeros, units and sides rather than prescribing targets', () => {
  assert.equal(formatHistorySet({ reps: 0, seconds: 0, breaths: 0, distance: 0, distanceUnit: 'km', load: 0, unit: 'lb', side: 'left' }), '0 reps · 0s · 0 breaths · 0 km · 0 lb · left side');
  assert.equal(formatHistorySet({}), 'No measured set');
  assert.equal(formatHistorySet({ reps: 3, side: 'both' }), '3 reps · both side');
  assert.equal(historyStatus({ skipped: true, done: true }), 'Skipped');
  assert.equal(historyStatus({ skipped: false, done: true }), 'Completed');
  assert.equal(historyStatus({ skipped: false, done: false }), 'Recorded');
});
