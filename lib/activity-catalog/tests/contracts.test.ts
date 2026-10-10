import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  activitySchema, validateRelease, coverage, requireCoverage, retrievalText,
  validatePrescription, estimatePrescription, expandSequence, canonicalJson, orderRelease,
  type Activity, type CatalogRelease,
} from '../src/index';

// Explicitly a validation fixture, not reviewed catalog content.
const activity: Activity = {
  id: 'fixture-a', version: 1, name: 'Fixture A', englishName: null, sanskritName: null,
  aliases: [], type: 'exercise', discipline: 'strength', family: 'general',
  supportedMetrics: ['reps', 'duration', 'breaths', 'distance'], distanceUnits: ['m', 'km', 'mi', 'yd'],
  loadUnits: ['kg', 'lb'], laterality: 'unilateral', equipment: ['none'], difficulty: 'beginner',
  primaryMuscles: null, secondaryMuscles: null, joints: null, actions: null, movementPatterns: null,
  description: 'Contract validation fixture only.', setup: ['Fixture setup.'], execution: ['Fixture execution.'],
  cues: [], commonMistakes: null, benefits: [], precautions: ['Fixture only.'], modifications: [],
  instructionNeeded: false, seriesContext: [], mobility: null,
  adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'Unreviewed test fixture.' },
  sourceIds: [], authorship: 'maintainer', reviewStatus: 'unreviewed', archived: false,
};
const release = (activities: Activity[] = [activity]): CatalogRelease => ({
  schemaVersion: 1, contentVersion: 'fixture', status: 'draft', publishedAt: null,
  reviewStatus: 'unreviewed', activities, sources: [], sequences: [], relationships: [],
});
const prescription = {
  activityId: activity.id, target: { metric: 'distance' as const, value: 2.5, unit: 'mi' as const },
  sets: 1, restSeconds: 0, load: { value: 0, unit: 'lb' as const }, side: 'left' as const,
  perSide: true,
  locked: false, priority: 'normal' as const,
};

test('activity identity excludes dosage and treats unknown distinctly from not applicable', () => {
  assert.throws(() => activitySchema.parse({ ...activity, sets: 3 }));
  assert.throws(() => activitySchema.parse({ ...activity, defaultReps: 10 }));
  assert.equal(activitySchema.parse(activity).primaryMuscles, null);
  assert.deepEqual(activitySchema.parse({ ...activity, primaryMuscles: [] }).primaryMuscles, []);
});
test('targets and actual zero load round trip with distance units', () => {
  const p = validatePrescription(JSON.parse(JSON.stringify(prescription)), activity);
  assert.deepEqual(p, prescription);
  assert.throws(() => validatePrescription({ ...prescription, target: { metric: 'distance', value: 2 } }, activity));
  assert.throws(() => validatePrescription(prescription, { ...activity, supportedMetrics: ['reps'], distanceUnits: [] }));
  assert.equal(estimatePrescription(p).seconds, null);
  assert.equal(estimatePrescription({ ...p, target: { metric: 'breaths', value: 5 } }).seconds, null);
  assert.match(estimatePrescription({ ...p, target: { metric: 'reps', value: 5 } }).assumption, /3 seconds/);
  assert.equal(estimatePrescription({ ...p, side: 'both', target: { metric: 'reps', value: 5 } }).seconds, 30);
  assert.equal(estimatePrescription({ ...p, perSide: false, side: 'both', target: { metric: 'reps', value: 5 } }).seconds, 15);
});
test('duplicate IDs and transliterated identity aliases are rejected', () => {
  assert.throws(() => validateRelease(release([activity, activity])), /Duplicate activity ID/);
  assert.throws(() => validateRelease(release([activity, { ...activity, id: 'fixture-b', name: 'Other', aliases: ['Fíxture A'] }])), /Duplicate identity/);
});
test('sources, review, distance units and CARs guidance are required at their boundaries', () => {
  assert.throws(() => validateRelease(release([{ ...activity, sourceIds: ['missing'] }])), /missing source/);
  assert.throws(() => validateRelease({ ...release(), status: 'released' }), /source-reviewed/);
  assert.throws(() => validateRelease(release([{ ...activity, distanceUnits: [] }])), /explicit units/);
  assert.throws(() => validateRelease(release([{ ...activity, family: 'cars' }])), /CARs need/);
  assert.throws(() => validateRelease(release([{ ...activity, adaptation: { ...activity.adaptation, eligible: true } }])), /insufficient suitability/);
});
test('advanced yoga can be browsed but cannot become automatically eligible', () => {
  const advanced = { ...activity, difficulty: 'advanced' as const, discipline: 'yoga' as const, type: 'asana' as const, family: 'ashtanga-vinyasa' as const, instructionNeeded: true };
  assert.equal(validateRelease(release([advanced])).activities[0].difficulty, 'advanced');
  assert.throws(() => validateRelease(release([{ ...advanced, adaptation: { ...advanced.adaptation, eligible: true } }])), /insufficient suitability/);
});
test('sequence repetition, order and side survive expansion; cycles and dangling references fail', () => {
  const sequence = { ...activity, id: 'fixture-seq', name: 'Fixture sequence', type: 'sequence' as const };
  const r = { ...release([activity, sequence]), sequences: [
    { sequenceId: sequence.id, activityId: activity.id, order: 0, side: 'left' as const },
    { sequenceId: sequence.id, activityId: activity.id, order: 1, side: 'right' as const },
    { sequenceId: sequence.id, activityId: activity.id, order: 2, side: 'left' as const },
  ] };
  validateRelease(r);
  assert.deepEqual(expandSequence(r, sequence.id).map(m => m.side), ['left', 'right', 'left']);
  assert.throws(() => validateRelease({ ...r, sequences: [{ ...r.sequences[0], activityId: sequence.id }] }), /cycle/);
  assert.throws(() => validateRelease({ ...r, sequences: [{ ...r.sequences[0], activityId: 'missing' }] }), /missing member/);
  assert.throws(() => validateRelease({ ...r, sequences: [r.sequences[0], r.sequences[0]] }), /Duplicate sequence position/);
  assert.throws(() => validateRelease({ ...r, relationships: [{ from: activity.id, to: 'missing', type: 'variation-of' }] }), /Dangling relationship/);
});
test('coverage cannot be inflated by aliases or sequences, and incomplete releases cannot publish', () => {
  assert.deepEqual(coverage(release([{ ...activity, aliases: ['Alias one', 'Alias two'] }])), { strength: 1, ashtanga: 0, mobility: 0, conditioning: 0 });
  assert.throws(() => requireCoverage(release()), /strength 1\/200/);
});
test('canonical representation and retrieval text are deterministic', () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
  const b = { ...activity, id: 'fixture-b', name: 'Fixture B' };
  assert.equal(canonicalJson(orderRelease(release([b, activity]))), canonicalJson(orderRelease(release([activity, b]))));
  assert.equal(retrievalText(activity), retrievalText({ ...activity }));
});

test('manifest checksum identifies the reconstructed snapshot regardless of input timestamp precision', () => {
  for (const publishedAt of ['2026-10-10T00:00:00Z', '2026-10-10T00:00:00.123456Z']) {
    const input = validateRelease({
      ...release([{ ...activity, reviewStatus: 'source-checked', sourceIds: ['fixture-source'] }]),
      status: 'released', reviewStatus: 'source-checked', publishedAt,
      sources: [{
        id: 'fixture-source', url: 'https://example.test/fixture',
        title: 'Contract fixture, not catalog content', provenance: 'Test fixture only.',
        retrievedOn: '2026-10-10', reviewedOn: '2026-10-10', permittedUse: 'Original test fixture only.',
        reviewStatus: 'source-checked',
      }],
    });
    // The CLI orders/normalizes BEFORE computing the manifest checksum or storing rows.
    const imported = orderRelease(input);
    const manifestChecksum = createHash('sha256').update(canonicalJson(imported)).digest('hex');
    const storedTimestamp = new Date(imported.publishedAt!);
    // Model catalog.ts reconstruction from normalized rows and pg's Date.
    const reconstructed = orderRelease(validateRelease({
      ...imported, publishedAt: storedTimestamp.toISOString(),
      activities: JSON.parse(JSON.stringify(imported.activities)),
      sources: JSON.parse(JSON.stringify(imported.sources)),
    }));
    const snapshotChecksum = createHash('sha256').update(canonicalJson(reconstructed)).digest('hex');
    assert.equal(manifestChecksum, snapshotChecksum, `Checksum mismatch for ${publishedAt}`);
    assert.equal(imported.publishedAt, new Date(publishedAt).toISOString());
    assert.equal(imported.publishedAt, reconstructed.publishedAt);
  }
});
