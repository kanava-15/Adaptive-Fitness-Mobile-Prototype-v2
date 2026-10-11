import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activitySchema,
  type Activity,
  type CatalogRelease,
  type ContentPackage,
  canonicalJson,
} from '@workspace/activity-catalog';
import starter from '@workspace/activity-catalog/starter';
import { CONTENT_EXAMPLES } from '../lib/content-examples';
import * as D from '../lib/domain';
import {
  applyActivityImport,
  exportContent,
  includedActivityImportRefs,
  persistActivityImport,
  reviewActivityContent,
  validateActivityImportChoices,
} from '../lib/content-exchange';

const release = (starter as { release: CatalogRelease }).release;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const raw = (value: ContentPackage) => JSON.stringify(value);

function knownPackage() {
  const activity = release.activities.find(item => item.type !== 'sequence')!;
  return exportContent(D.emptyState(), release, [{ kind: 'activity', id: activity.id }]);
}

function nestedPackage() {
  return clone(CONTENT_EXAMPLES['Nested repeated sequence']);
}

test('unchanged catalogue activity is an explicit reuse choice and adds no personal copy', () => {
  const state = D.emptyState();
  const pkg = knownPackage();
  const review = reviewActivityContent(raw(pkg), state, release);
  assert.equal(review.entries.length, 1);
  assert.equal(review.entries[0].match?.activity.id, pkg.activities[0].activity.id);
  assert.match(validateActivityImportChoices(review, {} ).join('\n'), /choose Use catalogue activity/);
  const result = applyActivityImport(state, release, review, { [review.entries[0].incoming.ref]: 'catalogue' });
  assert.equal(result.added, 0);
  assert.equal(result.reused, 1);
  assert.equal(result.state.customExercises.length, 0);
  assert.equal(D.findExercise([], review.entries[0].incoming.activity.id)?.id, review.entries[0].incoming.activity.id);
  assert.equal(canonicalJson(review.entries[0].match!.activity), canonicalJson(review.entries[0].incoming.activity));
});

test('same-ID altered definition compares to the known activity; reuse and custom copy preserve their selected content', () => {
  const pkg = knownPackage();
  const known = clone(pkg.activities[0].activity);
  pkg.activities[0].activity.description = 'Incoming changed instructions.';
  const state = D.emptyState();
  const review = reviewActivityContent(raw(pkg), state, release);
  assert.equal(review.entries[0].match?.activity.id, known.id);
  assert.notEqual(canonicalJson(review.entries[0].match!.activity), canonicalJson(review.entries[0].incoming.activity));

  const reused = applyActivityImport(state, release, review, { [review.entries[0].incoming.ref]: 'catalogue' });
  assert.equal(reused.added, 0);
  assert.equal(reused.state.customExercises.length, 0);
  assert.equal(release.activities.find(item => item.id === known.id)?.description, known.description);

  const copied = applyActivityImport(state, release, review, { [review.entries[0].incoming.ref]: 'copy' });
  assert.equal(copied.added, 1);
  assert.equal(copied.state.customExercises[0].activity?.description, 'Incoming changed instructions.');
  assert.notEqual(copied.state.customExercises[0].id, known.id);
  assert.equal(copied.state.customExercises[0].version, 1);
  assert.equal(copied.state.customExercises[0].verified, false);
  assert.equal(copied.state.customExercises[0].activity?.reviewStatus, 'unreviewed');
});

test('same name with a different ID never links or overwrites an existing activity', () => {
  const pkg = knownPackage();
  const knownName = pkg.activities[0].activity.name;
  pkg.activities[0].origin.id = 'external-name-match';
  pkg.activities[0].activity.id = 'external-name-match';
  pkg.activities[0].activity.name = knownName;
  const state = D.emptyState();
  const review = reviewActivityContent(raw(pkg), state, release);
  assert.equal(review.entries[0].match, undefined);
  assert.match(review.collisions.join('\n'), /name match is not linked/);
  const result = applyActivityImport(state, release, review, {});
  assert.equal(result.added, 1);
  assert.equal(result.reused, 0);
  assert.equal(result.state.customExercises[0].name, knownName);
  assert.notEqual(result.state.customExercises[0].id, 'external-name-match');
});

test('a matching claimed ID already owned by a custom activity stays a separate imported copy', () => {
  const pkg = knownPackage();
  const incoming = pkg.activities[0].activity;
  const existing = {
    ...D.activityDef(activitySchema.parse({ ...clone(incoming), name: 'My personal version', authorship: 'user' })),
    custom: true,
  };
  const state = { ...D.emptyState(), customExercises: [existing] };
  const review = reviewActivityContent(raw(pkg), state, release);
  assert.equal(review.entries[0].match, undefined);
  assert.match(review.collisions.join('\n'), /claimed ID is already used by personal content/);
  const result = applyActivityImport(state, release, review, {});
  assert.equal(result.added, 1);
  assert.strictEqual(result.state.customExercises[0], existing);
  assert.equal(result.state.customExercises[0].name, 'My personal version');
  assert.notEqual(result.state.customExercises[1].id, existing.id);
});

test('two different incoming definitions sharing an origin ID cannot collapse into one catalogue activity', () => {
  const pkg = knownPackage();
  const first = pkg.activities[0];
  const second = clone(first);
  second.ref = 'second-definition';
  second.activity.description = 'A distinct incoming definition.';
  pkg.activities.push(second);
  pkg.selection.push({ kind: 'activity', ref: second.ref });
  const review = reviewActivityContent(raw(pkg), D.emptyState(), release);
  const bothReuse = {
    [first.ref]: 'catalogue' as const,
    [second.ref]: 'catalogue' as const,
  };
  assert.match(validateActivityImportChoices(review, bothReuse).join('\n'), /Different incoming definitions/);
  const result = applyActivityImport(D.emptyState(), release, review, {
    [first.ref]: 'catalogue',
    [second.ref]: 'copy',
  });
  assert.equal(result.reused, 1);
  assert.equal(result.added, 1);
});

test('unknown valid activities create unverified copies with fresh identities', () => {
  const pkg = clone(CONTENT_EXAMPLES['Custom activity']);
  const state = D.emptyState();
  const review = reviewActivityContent(raw(pkg), state, release);
  assert.equal(review.entries[0].match, undefined);
  const result = applyActivityImport(state, release, review, {});
  assert.equal(result.added, 1);
  assert.deepEqual(result.addedNames, ['Chair rise']);
  assert.equal(result.state.customExercises[0].activity?.reviewStatus, 'unreviewed');
  assert.equal(result.state.customExercises[0].activity?.adaptation.eligible, false);
  assert.equal(result.state.customExercises[0].contentImport?.origin?.activity.id, 'chair-rise');
  for (const field of ['profile', 'plan', 'events', 'completions', 'active', 'savedActivities', 'routines', 'schedule', 'presets'] as const) {
    assert.strictEqual(result.state[field], state[field]);
  }
});

test('reusing a flat catalogue sequence keeps its catalogue membership without importing incoming dependencies', () => {
  const sequence = release.activities.find(item => item.type === 'sequence' &&
    release.sequences.filter(member => member.sequenceId === item.id)
      .every(member => release.activities.find(child => child.id === member.activityId)?.type !== 'sequence'));
  if (!sequence) return;
  const pkg = exportContent(D.emptyState(), release, [{ kind: 'activity', id: sequence.id }]);
  const review = reviewActivityContent(raw(pkg), D.emptyState(), release);
  const parent = review.entries.find(entry => entry.incoming.activity.id === sequence.id)!;
  const choices = { [parent.incoming.ref]: 'catalogue' as const };
  assert.equal(includedActivityImportRefs(review, choices).size, 1);
  const result = applyActivityImport(D.emptyState(), release, review, choices);
  assert.equal(result.added, 0);
  assert.equal(result.reused, 1);
  assert.equal(result.state.customExercises.length, 0);
});

test('flat sequence preserves ordered repeated activities and sides; unknown references reject before mutation', () => {
  const pkg = nestedPackage();
  const pair = pkg.activities.find(item => item.ref === 'pair')!;
  const parent = pkg.activities.find(item => item.ref === 'repeated-pair')!;
  parent.members = [
    { activityRef: 'chair-rise', side: 'left' },
    { activityRef: 'quiet-breathing', side: 'right' },
    { activityRef: 'chair-rise', side: 'both' },
  ];
  pkg.activities = pkg.activities.filter(item => item.ref !== 'pair');
  const state = D.emptyState();
  const review = reviewActivityContent(raw(pkg), state, release);
  const result = applyActivityImport(state, release, review, {});
  const sequence = result.state.customExercises.find(item => item.contentImport?.entryRef === 'repeated-pair')!;
  const members = sequence.sequenceMembers!;
  assert.deepEqual(members.map(member => member.order), [0, 1, 2]);
  assert.deepEqual(members.map(member => member.side), ['left', 'right', 'both']);
  assert.equal(members[0].activityId, members[2].activityId);
  assert.equal(result.added, 3);
  assert.ok(!result.state.customExercises.some(item => item.contentImport?.entryRef === pair.ref));

  const invalid = clone(pkg);
  invalid.activities.find(item => item.ref === parent.ref)!.members[0].activityRef = 'missing-member';
  assert.throws(() => reviewActivityContent(raw(invalid), state, release), /missing dependency/);
  assert.equal(state.customExercises.length, 0);
});

test('nested incoming sequence is rejected with both names and no partial additions', () => {
  const pkg = nestedPackage();
  const state = D.emptyState();
  assert.throws(
    () => reviewActivityContent(raw(pkg), state, release),
    /Sequence "Repeat the pair" cannot contain nested sequence "Rise and breathe"/,
  );
  assert.equal(state.customExercises.length, 0);
});

test('a catalogue sequence selected as a member is rejected rather than flattened', () => {
  const catalogSequence = release.activities.find(item => item.type === 'sequence');
  if (!catalogSequence) return;
  const original = clone(CONTENT_EXAMPLES['Custom activity']);
  const leaf = original.activities[0];
  leaf.ref = 'claimed-sequence';
  leaf.activity = { ...clone(catalogSequence), type: 'exercise' } as Activity;
  leaf.origin = { id: catalogSequence.id, version: catalogSequence.version, kind: 'catalog' };
  const sourceIds = new Set([
    ...leaf.activity.sourceIds,
    ...leaf.activity.seriesContext.map(item => item.sourceId),
    ...leaf.activity.benefits.flatMap(item => item.sourceIds),
    ...(leaf.activity.mediaReferences ?? []).map(item => item.sourceId),
  ]);
  leaf.sources = release.sources.filter(source => sourceIds.has(source.id));
  const parent = clone(original.activities[0]);
  parent.ref = 'incoming-parent';
  parent.origin = { id: 'incoming-parent', version: 1, kind: 'external' };
  parent.activity = activitySchema.parse({
    ...parent.activity,
    id: 'incoming-parent',
    version: 1,
    name: 'Parent sequence',
    type: 'sequence',
  });
  parent.members = [{ activityRef: leaf.ref, side: 'unspecified' }];
  const pkg: ContentPackage = {
    ...original,
    title: 'Resolved nested sequence',
    activities: [leaf, parent],
    selection: [{ kind: 'activity', ref: parent.ref }],
  };
  const review = reviewActivityContent(raw(pkg), D.emptyState(), release);
  assert.equal(review.entries.find(item => item.incoming.ref === leaf.ref)?.match?.activity.type, 'sequence');
  const choices = { [leaf.ref]: 'catalogue' as const };
  assert.match(validateActivityImportChoices(review, choices).join('\n'), /cannot contain nested sequence/);
  assert.throws(() => applyActivityImport(D.emptyState(), release, review, choices), /cannot contain nested sequence/);
});

test('mixed routines are refused; duplicates, stale previews and storage failures do not add partial content', async () => {
  const state = D.emptyState();
  const mixed = clone(CONTENT_EXAMPLES['Mixed routine']);
  assert.throws(() => reviewActivityContent(raw(mixed), state, release), /contains routines/);
  assert.throws(() => reviewActivityContent('{not json', state, release), /Malformed JSON/);
  assert.equal(state.customExercises.length, 0);

  const pkg = clone(CONTENT_EXAMPLES['Custom activity']);
  const review = reviewActivityContent(raw(pkg), state, release);
  const before = JSON.stringify(state);
  await assert.rejects(
    persistActivityImport(state, release, review, {}, async () => { throw new Error('disk full'); }),
    /disk full/,
  );
  assert.equal(JSON.stringify(state), before);

  const stale = { ...state, customExercises: [D.activityDef(activitySchema.parse({
    ...pkg.activities[0].activity, id: 'unrelated-local', name: 'Unrelated local activity',
  }))] };
  assert.throws(() => applyActivityImport(stale, release, review, {}), /changed after preview/);

  const first = applyActivityImport(state, release, review, {});
  const duplicateReview = reviewActivityContent(raw(pkg), first.state, release);
  assert.equal(duplicateReview.duplicate, true);
  assert.throws(() => applyActivityImport(first.state, release, duplicateReview, {}), /already imported/);
  assert.equal(first.state.customExercises.length, 1);
});
