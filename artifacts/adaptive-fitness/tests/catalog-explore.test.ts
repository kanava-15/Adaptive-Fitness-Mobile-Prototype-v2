import assert from 'node:assert/strict';
import { test } from 'node:test';
import starter from '@workspace/activity-catalog/starter';
import type { Activity, CatalogRelease } from '@workspace/activity-catalog';
import { emptyCatalogSearchFilters, searchCatalog, setSavedActivity, emptyState, loadStored } from '../lib/domain';
import {
  catalogCardIdentity, catalogCardMetadata, exploreDisciplineCount, normalizeExploreFilters, toggleExploreDiscipline,
} from '../lib/catalog-explore';

const release = (starter as { release: CatalogRelease }).release;
test('empty Explore query browses the complete unarchived catalog', () => {
  const results = searchCatalog(release.activities, emptyCatalogSearchFilters(), '');
  assert.equal(results.length, release.activities.filter(activity => !activity.archived).length);
  for (const discipline of ['strength', 'yoga', 'mobility', 'conditioning', 'sports'] as const) {
    assert.ok(results.some(activity => activity.discipline === discipline));
  }
});

test('sports-only transition clears irrelevant constraints without mutating live draft source', () => {
  const original = {
    ...emptyCatalogSearchFilters(), discipline: ['sports', 'strength'] as Activity['discipline'][],
    area: 'hips' as const, muscle: 'glutes', joint: 'hip', difficulty: 'beginner' as const,
  };
  const before = JSON.stringify(original);
  const sports = toggleExploreDiscipline(original, 'strength');
  assert.deepEqual(sports.discipline, ['sports']);
  for (const facet of ['area', 'muscle', 'joint', 'difficulty'] as const) assert.equal(sports[facet], null);
  assert.equal(JSON.stringify(original), before, 'draft edit cannot mutate applied filters');
  assert.equal(exploreDisciplineCount(release.activities, original, 'strength'), searchCatalog(release.activities, sports).length);
  assert.ok(searchCatalog(release.activities, sports).length > 0);
  const mixed = toggleExploreDiscipline({ ...original, discipline: ['strength'] }, 'sports');
  assert.equal(mixed.muscle, 'glutes');
  assert.equal(mixed.difficulty, 'beginner');
});

test('sports cleanup keeps applicable equipment and measurement filters and preserves ordinary search semantics', () => {
  const filters = { ...emptyCatalogSearchFilters(), discipline: ['sports'] as Activity['discipline'][], joint: 'hip', metric: 'duration' as const, equipment: 'none' as const };
  const normalized = normalizeExploreFilters(filters);
  assert.equal(normalized.metric, 'duration');
  assert.equal(normalized.equipment, 'none');
  assert.equal(normalized.joint, null);
  assert.equal(searchCatalog(release.activities, filters).length, 0, 'shared callers retain strict AND semantics');
});

test('cards distinguish single, sequence and sport and never turn unknowns into facts', () => {
  const seed = release.activities[0];
  assert.equal(catalogCardIdentity({ ...seed, type: 'sequence' }), 'Sequence');
  assert.equal(catalogCardIdentity({ ...seed, type: 'sport' }), 'Sport');
  assert.equal(catalogCardIdentity({ ...seed, type: 'asana' }), 'Single activity');
  const unknown = { ...seed, equipment: null, difficulty: 'unknown' as const, supportedMetrics: ['duration'] as Activity['supportedMetrics'] };
  assert.deepEqual(catalogCardMetadata(unknown), ['Tracks Duration']);
  assert.deepEqual(catalogCardMetadata({ ...unknown, equipment: [] }), ['Tracks Duration']);
  assert.deepEqual(catalogCardMetadata({ ...unknown, equipment: ['none'], difficulty: 'beginner' }), ['No Equipment', 'Beginner', 'Tracks Duration']);
  for (const activity of release.activities) {
    const labels = catalogCardMetadata(activity);
    assert.ok(labels.length <= 3);
    assert.ok(!labels.some(label => /\d|intensity|pace/i.test(label)));
    if (activity.type === 'sport') assert.ok(!labels.some(label => /beginner|advanced|intermediate/i.test(label)));
  }
});

test('card bookmark remains local across restart without creating a routine, plan or session', () => {
  const state = emptyState();
  const saved = setSavedActivity(state, release.activities[0].id, true, release);
  const restored = loadStored(JSON.stringify(saved), null);
  assert.equal(restored.error, null);
  assert.deepEqual(restored.state?.savedActivities, saved.savedActivities);
  assert.deepEqual(restored.state?.routines, []);
  assert.deepEqual(restored.state?.schedule, []);
  assert.equal(restored.state?.active, null);
  assert.equal(restored.state?.plan, null);
  assert.deepEqual(setSavedActivity(saved, release.activities[0].id, false, release).savedActivities, []);
});
