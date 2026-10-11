import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as D from '../lib/domain';
import starter from '@workspace/activity-catalog/starter';
import { equipmentSchema, type Activity, type CatalogRelease } from '@workspace/activity-catalog';
import { numericValue } from '../lib/numeric-input';

test('numeric edits are available without blur and stepping uses the edited number', () => {
  const options = { min: 0, max: 1000, decimals: true };
  const edited = numericValue('12,5', options);
  assert.equal(edited, 12.5);
  assert.equal((edited ?? 0) + 2.5, 15);
  assert.equal(numericValue('0', options), 0);
  assert.equal(numericValue('', { ...options, optional: true }), undefined);
  assert.equal(numericValue('Infinity', options), undefined);
  assert.equal(numericValue('4', { min: 5, max: 3600 }), 4);
  assert.equal(numericValue('40', { min: 5, max: 3600 }), 40);
  assert.equal(numericValue('4000', { min: 5, max: 3600, clamp: true }), 3600);
});

test('explicit zero load retains its unit and overrides older weighted sets after reload', () => {
  const item = { tracking: 'reps' as const, loadable: true, load: 10, unit: 'kg' as const };
  const zero = D.buildSet(item, 8, { load: 0, unit: 'lb' });
  assert.deepEqual(zero, { reps: 8, load: 0, unit: 'lb' });
  const saved = JSON.parse(JSON.stringify([{ reps: 8, load: 20, unit: 'kg' }, zero]));
  assert.deepEqual(D.nextLoad(item, saved), { load: 0, unit: 'lb' });
});

test('tracking change reps->time blocks scheduling/start until reconciled', () => {
  const base = D.BUILTIN.find((e) => e.tracking === 'reps' && !e.loadable)!;
  const custom = { ...base, id: 'cx-1', custom: true, verified: false, archived: false, version: 1 } as D.ExerciseDef;
  const routine = { items: [{ ...D.makeItem(custom), definition: undefined }] }; // pre-migration legacy target
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

test('routine launch requires confirmed targets and refuses partial snapshots with missing activities', () => {
  const shared = (starter as { release: CatalogRelease }).release.activities.find(activity =>
    activity.type !== 'sequence' && activity.supportedMetrics.length > 0,
  )!;
  const definition = D.activityDef(shared);
  const blank = { ...D.makeItem(definition), reps: undefined, seconds: undefined, breaths: undefined, distance: undefined, distanceUnit: undefined };
  const target: D.RoutineItem = {
    ...blank,
    ...(definition.tracking === 'reps' ? { reps: 8 } : {}),
    ...(definition.tracking === 'time' ? { seconds: 30 } : {}),
    ...(definition.tracking === 'breaths' ? { breaths: 5 } : {}),
    ...(definition.tracking === 'distance' ? { distance: 10, distanceUnit: shared.distanceUnits[0] } : {}),
    confirmed: true,
  };
  const routine: D.Routine = {
    id: 'routine-launch-test',
    name: 'Personal routine',
    notes: '',
    items: [target],
    version: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const valid = D.routineLaunchSnapshot(routine, [], '2026-01-02T00:00:00.000Z');
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.snapshot.source.kind, 'routine');
  assert.equal(valid.snapshot.source.kind === 'routine' ? valid.snapshot.source.routineId : null, routine.id);
  const run = D.startActive({
    date: '2026-10-11',
    occurrenceKey: null,
    snapshot: valid.snapshot,
    items: valid.snapshot.items,
  }, Date.parse('2026-10-11T09:00:00.000Z'));
  const restored = D.loadStored(JSON.stringify({ ...D.emptyState(), routines: [routine], schedule: [], active: run }), null).state!;
  assert.equal(restored.active?.occurrenceKey, null, 'routine starts remain unscheduled after restore');
  assert.equal(restored.schedule.length, 0, 'starting now does not create a schedule entry');
  const completion = D.completeActive(restored.active!, { difficulty: 3 }, Date.parse('2026-10-11T09:05:00.000Z'));
  const afterFinish = D.loadStored(JSON.stringify({
    ...restored,
    active: null,
    completions: [...restored.completions, completion],
  }), null).state!;
  assert.equal(afterFinish.active, null);
  assert.equal(afterFinish.completions[0].occurrenceKey, null);
  assert.equal(afterFinish.schedule.length, 0);

  const unconfirmed = D.routineLaunchSnapshot({ ...routine, items: [{ ...target, confirmed: false }] }, []);
  assert.ok(unconfirmed.errors.some(error => /confirm an explicit target/.test(error)));

  const partial = D.routineLaunchSnapshot({
    ...routine,
    items: [target, { ...target, key: 'missing-item', exerciseId: 'missing-library-activity', definition: undefined }],
  }, []);
  assert.equal(partial.snapshot.items.length, 1);
  assert.ok(partial.errors.some(error => /missing from the library/.test(error)), 'a routine with one missing item must not launch only its available subset');
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

test('catalog search matches diacritic names and aliases without crossing its supplied source', () => {
  const source = (starter as { release: CatalogRelease }).release.activities;
  const seed = source.find(activity => activity.id === 'yoga-adho-mukha-svanasana')!;
  const entry: Activity = {
    ...seed,
    id: 'search-diacritic-fixture',
    name: 'Vīrabhadrāsana',
    englishName: 'Warrior Pose',
    sanskritName: 'Vīrabhadrāsana',
    aliases: ['Virabhadrasana'],
  };
  const filters = D.emptyCatalogSearchFilters();
  assert.deepEqual(D.searchCatalog([entry], filters, 'virabhadrasana').map(item => item.id), [entry.id]);
  assert.deepEqual(D.searchCatalog([entry], filters, 'VīRABHADRĀSANA').map(item => item.id), [entry.id]);
  assert.deepEqual(D.searchCatalog([entry], filters, 'warrior pose').map(item => item.id), [entry.id]);
  assert.deepEqual(D.searchCatalog(source, filters, entry.id), [], 'shared search only searches supplied catalog entries and names');
  assert.equal(D.normalizeCatalogSearchText('  Vīrabhadrāsana  '), 'virabhadrasana');
});

test('catalog facets use OR within disciplines, AND across facets, and count the full catalog', () => {
  const activities = (starter as { release: CatalogRelease }).release.activities;
  const filters = { ...D.emptyCatalogSearchFilters(), discipline: ['yoga', 'mobility'] as Activity['discipline'][] };
  const combined = D.searchCatalog(activities, filters);
  assert.ok(combined.length > 0);
  assert.ok(combined.every(item => item.discipline === 'yoga' || item.discipline === 'mobility'));
  const narrowed = D.searchCatalog(activities, { ...filters, family: 'cars' });
  assert.ok(narrowed.length > 0 && narrowed.every(item => item.family === 'cars'));
  assert.equal(
    D.catalogFacetCount(activities, D.emptyCatalogSearchFilters(), 'discipline', 'yoga'),
    D.searchCatalog(activities, { ...D.emptyCatalogSearchFilters(), discipline: ['yoga'] }).length,
  );
  assert.ok(D.searchCatalog(activities, { ...D.emptyCatalogSearchFilters(), type: 'sequence' }).length > 0);
  assert.ok(D.searchCatalog(activities, { ...D.emptyCatalogSearchFilters(), type: 'practice-element' }).length > 0);
  assert.ok(D.searchCatalog(activities, { ...D.emptyCatalogSearchFilters(), family: 'cars' }).every(item => item.type !== ('cars' as Activity['type'])));
  assert.ok(D.searchCatalog(activities, { ...D.emptyCatalogSearchFilters(), metric: 'distance' }).length > 0);
  assert.ok(equipmentSchema.options.some(equipment =>
    D.catalogFacetCount(activities, { ...D.emptyCatalogSearchFilters(), discipline: ['yoga'] }, 'equipment', equipment) === 0,
  ), 'choices with no prospective results can be identified from metadata');
});

test('unknown catalog equipment and difficulty never become no-equipment or beginner matches', () => {
  const source = (starter as { release: CatalogRelease }).release.activities;
  const seed = source.find(activity => activity.id === 'yoga-adho-mukha-svanasana')!;
  const unknown: Activity = {
    ...seed,
    id: 'unknown-metadata-fixture',
    equipment: null,
    difficulty: 'unknown',
    primaryMuscles: null,
    secondaryMuscles: null,
    joints: null,
  };
  assert.equal(D.searchCatalog([unknown], { ...D.emptyCatalogSearchFilters(), equipment: 'none' }).length, 0);
  assert.equal(D.searchCatalog([unknown], { ...D.emptyCatalogSearchFilters(), difficulty: 'beginner' }).length, 0);
  assert.deepEqual(D.catalogAreas(unknown), []);
});

test('routine batch expansion keeps selection order, repeated sequence leaves, sides, stable keys, and no inferred dose', () => {
  const release = (starter as { release: CatalogRelease }).release;
  const sequenceActivity = release.activities.find(activity => activity.type === 'sequence')!;
  const leafActivity = release.activities.find(activity => activity.type !== 'sequence' && activity.supportedMetrics.length > 0)!;
  const sequence = {
    ...D.activityDef({ ...sequenceActivity, id: 'batch-sequence' }),
    sequenceMembers: [
      { sequenceId: 'batch-sequence', activityId: 'batch-leaf', order: 0, side: 'right' as const },
      { sequenceId: 'batch-sequence', activityId: 'batch-leaf', order: 1, side: 'left' as const },
    ],
  };
  const leaf = D.activityDef({ ...leafActivity, id: 'batch-leaf' });
  const before = D.activityDef({ ...leafActivity, id: 'batch-before', name: 'Before sequence' });
  const batch = D.itemsFromSelection([before, sequence], [sequence, leaf]);
  assert.equal(batch.error, null);
  assert.equal(batch.items.length, 3);
  assert.deepEqual(batch.items.map(item => item.exerciseId), ['batch-before', 'batch-leaf', 'batch-leaf']);
  assert.deepEqual(batch.items.slice(1).map(item => item.side), ['right', 'left']);
  assert.equal(new Set(batch.items.map(item => item.key)).size, 3);
  assert.ok(batch.items.every(item => item.confirmed === false));
  assert.ok(batch.items.every(item => item.reps == null && item.seconds == null && item.breaths == null && item.distance == null));
  assert.ok(batch.items.every(item => item.definition?.activity?.type !== 'sequence'));
});

test('invalid sequence membership rejects the whole routine batch', () => {
  const release = (starter as { release: CatalogRelease }).release;
  const sequenceActivity = release.activities.find(activity => activity.type === 'sequence')!;
  const broken = {
    ...D.activityDef({ ...sequenceActivity, id: 'broken-batch-sequence' }),
    sequenceMembers: [{ sequenceId: 'broken-batch-sequence', activityId: 'absent-batch-leaf', order: 0, side: 'both' as const }],
  };
  const single = D.activityDef({ ...release.activities.find(activity => activity.type !== 'sequence')!, id: 'before-broken-sequence' });
  const batch = D.itemsFromSelection([single, broken], [broken]);
  assert.equal(batch.items.length, 0);
  assert.match(batch.error ?? '', /Missing activity absent-batch-leaf/);
});

test('new batch selections require explicit targets for every supported measurement', () => {
  const release = (starter as { release: CatalogRelease }).release;
  const seed = release.activities.find(activity => activity.type !== 'sequence' && activity.supportedMetrics.length > 0)!;
  const cases = [
    { metric: 'reps' as const, target: { reps: 8 } },
    { metric: 'duration' as const, target: { seconds: 30 } },
    { metric: 'breaths' as const, target: { breaths: 5 } },
    { metric: 'distance' as const, target: { distance: 10, distanceUnit: 'km' as const } },
  ];
  for (const scenario of cases) {
    const activity = {
      ...seed,
      id: `batch-metric-${scenario.metric}`,
      supportedMetrics: [scenario.metric],
      distanceUnits: scenario.metric === 'distance' ? ['km' as const] : [],
    };
    const definition = D.activityDef(activity);
    const fresh = D.itemsFromSelection([definition]).items[0];
    assert.equal(fresh.confirmed, false);
    assert.ok(D.validateItem(fresh, definition.tracking).length > 0, `${scenario.metric} requires a target`);
    const confirmed = { ...fresh, ...scenario.target, confirmed: true };
    assert.deepEqual(D.validateItem(confirmed, definition.tracking), [], `${scenario.metric} accepts its explicit target`);
  }
});

test('routine item order, targets, notes, and repeated identities survive backup round trip', () => {
  const definition = D.BUILTIN.find(item => item.tracking === 'reps')!;
  const first = { ...D.makeItem(definition), reps: 9, note: 'Keep the range comfortable' };
  const second = { ...D.makeItem(definition), reps: 12, note: 'Second occurrence', priority: 'must' as const, locked: true };
  const routine: D.Routine = {
    id: 'batch-backup-routine', name: 'Ordered routine', notes: 'Local notes', items: [first, second],
    version: 1, archived: false, createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z',
  };
  const state = { ...D.emptyState(), routines: [routine] };
  const check = D.checkImport(JSON.stringify(D.exportPayload(state)));
  assert.ok(check.ok);
  if (check.ok) {
    const restored = check.data.routines[0];
    assert.deepEqual(restored.items.map(item => item.key), [first.key, second.key]);
    assert.deepEqual(restored.items.map(item => item.reps), [9, 12]);
    assert.deepEqual(restored.items.map(item => item.note), ['Keep the range comfortable', 'Second occurrence']);
    assert.equal(restored.items[1].locked, true);
    assert.equal(restored.items[1].priority, 'must');
  }
});
