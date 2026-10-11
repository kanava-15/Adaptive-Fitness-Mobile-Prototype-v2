import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  activitySchema, parseContentPackage, validateContentPackage, type Activity, type CatalogRelease,
  type ContentPackage, CONTENT_LIMITS, canonicalJson,
} from '@workspace/activity-catalog';
import starter from '@workspace/activity-catalog/starter';
import * as D from '../lib/domain';
import { applyContentImport, exportContent, reviewContent, persistContentImport } from '../lib/content-exchange';
import { CONTENT_EXAMPLES } from '../lib/content-examples';

const release = (starter as { release: CatalogRelease }).release;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const raw = (p: ContentPackage) => JSON.stringify(p);
const mixed = () => clone(CONTENT_EXAMPLES['Mixed routine']);
const nested = () => clone(CONTENT_EXAMPLES['Nested repeated sequence']);
const importPackage = (p: ContentPackage, state = D.emptyState(), approveTargets = false) => applyContentImport(state, reviewContent(raw(p), state), { intentionalCopy: false, approveTargets });
function local(patch: Partial<Activity> = {}): D.ExerciseDef {
  return { ...D.activityDef(activitySchema.parse({
    ...CONTENT_EXAMPLES['Custom activity'].activities[0].activity,
    id: 'cx_existing', name: 'Personal multi-unit', supportedMetrics: ['reps', 'duration', 'breaths', 'distance'],
    distanceUnits: ['m', 'km', 'mi', 'yd'], loadUnits: ['kg', 'lb'], laterality: 'unilateral', ...patch,
  })), custom: true };
}
function routine(items: D.RoutineItem[], id = 'rt-existing'): D.Routine {
  return { id, name: 'Pinned routine', notes: 'Keep order and zero load', version: 1, archived: false, createdAt: '2026-10-01', updatedAt: '2026-10-01', items };
}
test('all shipped examples and files validate; schema and backups are distinct contracts', () => {
  for (const [name, p] of Object.entries(CONTENT_EXAMPLES)) {
    assert.deepEqual(parseContentPackage(raw(p)), p);
    const file = new URL(`../docs/content-examples/${name.toLowerCase().replaceAll(' ', '-')}.json`, import.meta.url);
    assert.deepEqual(parseContentPackage(readFileSync(file, 'utf8')), p);
  }
  const schema = JSON.parse(readFileSync(new URL('../../../lib/activity-catalog/docs/content-package-v1.schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.$id, 'urn:svasthic:content:v1');
  assert.equal(schema.definitions.SvasthicContentV1.additionalProperties, false);
  assert.throws(() => parseContentPackage(JSON.stringify(D.exportPayload(D.emptyState()))), /backup/);
  assert.equal(D.checkImport(raw(mixed())).ok, false);
});
test('selective public export includes only transitive definitions and source attribution, deterministic across selection order', () => {
  const a = release.activities.find(a => a.type === 'exercise')!;
  const seq = release.activities.find(a => a.type === 'sequence')!;
  const state = D.emptyState();
  const selections = [{ kind: 'activity' as const, id: a.id }, { kind: 'activity' as const, id: seq.id }];
  const p = exportContent(state, release, selections);
  assert.equal(canonicalJson(p), canonicalJson(exportContent(state, release, [...selections].reverse())));
  assert.ok(p.activities.find(e => e.activity.id === seq.id)?.members.length);
  assert.ok(p.activities.find(e => e.activity.id === a.id)?.sources.length);
  assert.ok(!('profile' in p) && !('schedule' in p) && !('history' in p));
  const imported = importPackage(p).state;
  assert.ok(imported.customExercises.every(e => e.custom && !e.verified && !e.activity!.adaptation.eligible));
  assert.equal(imported.customExercises.length, p.activities.length);
});
test('routine export pins older and distinct same-origin versions rather than live updates', () => {
  const current = local({ version: 3, description: 'Current knowledge' });
  const old = local({ version: 1, description: 'Pinned older knowledge' });
  const alternate = local({ version: 1, description: 'Distinct same version pinned knowledge' });
  const items = [old, alternate, current, old].map(d => ({ ...D.makeItem(d), sets: 2, reps: 7, restSec: 30, side: 'left' as const, load: 0, unit: 'lb' as const, note: 'Keep this note', definition: d, confirmed: true }));
  const r = routine(items);
  const state = { ...D.emptyState(), customExercises: [current], routines: [r] };
  const p = exportContent(state, release, [{ kind: 'routine', id: r.id }]);
  assert.equal(p.activities.length, 3);
  assert.equal(p.activities[0].activity.description, 'Pinned older knowledge');
  assert.equal(p.activities[0].origin.version, 1);
  assert.notEqual(p.routines[0].items[0].activityRef, p.routines[0].items[1].activityRef);
  assert.equal(p.routines[0].items[0].activityRef, p.routines[0].items[3].activityRef);
  const added = importPackage(p, D.emptyState(), true).state;
  assert.equal(added.routines[0].items[0].definition!.activity!.description, old.activity!.description);
  assert.equal(D.routineLaunchSnapshot(added.routines[0], added.customExercises).errors.length, 0);
  assert.equal(added.routines[0].items[0].load, 0);
  assert.equal(added.routines[0].items[0].note, 'Keep this note');
});
test('mixed metrics and all distance/load units survive export/import without conversion', () => {
  const d = local();
  const amounts = [{ reps: 10 }, { seconds: 45 }, { breaths: 8 }, ...(['m', 'km', 'mi', 'yd'] as const).map(distanceUnit => ({ distance: 1.25, distanceUnit }))];
  const items = amounts.map((amount, n) => ({ ...D.makeItem(d), reps: undefined, seconds: undefined, breaths: undefined, distance: undefined, ...amount,
    sets: 1, restSec: 0, side: 'right' as const, perSide: true, load: 0, unit: n % 2 ? 'kg' as const : 'lb' as const, priority: 'must' as const, locked: true, definition: d, confirmed: true }));
  const r = routine(items);
  const state = { ...D.emptyState(), customExercises: [d], routines: [r] };
  const p = exportContent(state, release, [{ kind: 'routine', id: r.id }]);
  const result = importPackage(p, D.emptyState(), true).state;
  assert.equal(D.routineLaunchSnapshot(result.routines[0], result.customExercises).errors.length, 0);
  result.routines[0].items.forEach((it, n) => {
    for (const field of ['reps', 'seconds', 'breaths', 'distance', 'distanceUnit', 'side', 'load', 'unit', 'perSide', 'priority', 'locked'] as const) assert.equal(it[field], items[n][field]);
  });
});
test('nested sequence repetitions, order and package-local references map to fresh local IDs and existing builder', () => {
  const p = nested(), before = raw(p);
  const result = importPackage(p).state;
  const seq = result.customExercises.find(d => d.contentImport?.entryRef === 'repeated-pair')!;
  const expanded = D.sequenceDefinitions(seq.id, result.customExercises);
  assert.deepEqual(expanded.map(e => e.definition.name), ['Chair rise', 'Quiet breathing', 'Chair rise', 'Quiet breathing']);
  const batch = D.itemsFromSelection([seq], result.customExercises);
  assert.equal(batch.error, null);
  assert.equal(batch.items.length, 4);
  assert.ok(batch.items.every(i => i.confirmed === false && i.reps === undefined && i.seconds === undefined));
  assert.equal(raw(p), before);
  assert.ok(seq.sequenceMembers!.every(m => m.sequenceId === seq.id && result.customExercises.some(d => d.id === m.activityId)));
});
test('name/ID collisions preserve existing identifiers and do not fuzzy-match dependencies', () => {
  const p = mixed();
  const d = local({ id: p.activities[0].origin.id, name: p.activities[0].activity.name });
  const r = routine([], 'rt-existing');
  p.routines[0].originId = r.id;
  p.routines[0].name = r.name;
  const state = { ...D.emptyState(), customExercises: [d], routines: [r] };
  const review = reviewContent(raw(p), state);
  assert.ok(review.collisions.length >= 2);
  const result = applyContentImport(state, review, { intentionalCopy: false, approveTargets: false }).state;
  assert.strictEqual(result.customExercises[0], d);
  assert.strictEqual(result.routines[0], r);
  assert.ok(result.customExercises.slice(1).every(e => e.id !== d.id));
  assert.notEqual(result.routines[1].id, r.id);
  const broken = clone(p); broken.routines[0].items[0].activityRef = 'chair-rise-name';
  assert.throws(() => validateContentPackage(broken), /missing dependency/);
});
test('identical reimport blocks; explicit copies append without overwrite; stale or altered previews fail', () => {
  const p = mixed(), state = importPackage(p).state;
  const preview = reviewContent(raw(p), state);
  assert.equal(preview.duplicate, true);
  assert.throws(() => applyContentImport(state, preview, { intentionalCopy: false, approveTargets: false }), /already imported/);
  const copied = applyContentImport(state, preview, { intentionalCopy: true, approveTargets: false }).state;
  assert.equal(copied.routines.length, 2);
  assert.notEqual(copied.routines[0].id, copied.routines[1].id);
  assert.throws(() => applyContentImport(copied, preview, { intentionalCopy: true, approveTargets: true }), /library changed/);
  preview.package.title = 'Tampered after review';
  assert.throws(() => applyContentImport(state, preview, { intentionalCopy: true, approveTargets: true }), /package changed/);
});
test('claims of maintainer/expert/adaptation trust remain only origin metadata, never runtime permissions', () => {
  const p = mixed();
  for (const e of p.activities) {
    e.activity.authorship = 'maintainer'; e.activity.reviewStatus = 'expert-reviewed';
    e.activity.adaptation = { eligible: true, loadingKnown: true, loadedJoints: ['knee'], rationale: 'Incoming untrusted safety claim' };
  }
  const result = importPackage(p, D.emptyState(), true).state;
  for (const d of result.customExercises) {
    assert.equal(d.activity!.authorship, 'user');
    assert.equal(d.activity!.reviewStatus, 'unreviewed');
    assert.equal(d.activity!.adaptation.eligible, false);
    assert.equal(d.activity!.adaptation.loadingKnown, false);
    assert.deepEqual(d.activity!.adaptation.loadedJoints, []);
    assert.equal(d.verified, false);
    assert.match(D.exerciseSourceLabel(d), /Externally imported/);
    assert.equal(d.contentImport!.origin!.activity.reviewStatus, 'expert-reviewed');
  }
  const reexport = exportContent(result, release, result.customExercises.map(d => ({ kind: 'activity', id: d.id })));
  assert.ok(reexport.activities.every(e => !e.activity.adaptation.eligible && e.attribution?.activity.reviewStatus === 'expert-reviewed'));
});
test('missing targets stay absent; all targets are drafts unless explicitly approved and incomplete routines cannot launch or schedule', () => {
  const p = mixed(), review = reviewContent(raw(p), D.emptyState());
  assert.equal(review.missingTargets, 1);
  const result = importPackage(p).state;
  assert.ok(result.routines[0].items.every(i => i.confirmed === false));
  const last = result.routines[0].items.at(-1)!;
  assert.equal(last.reps, undefined);
  assert.equal(last.seconds, undefined);
  assert.ok(D.routineLaunchSnapshot(result.routines[0], result.customExercises).errors.length);
  const approved = importPackage(p, D.emptyState(), true).state;
  assert.equal(approved.routines[0].items[0].confirmed, true);
  assert.equal(approved.routines[0].items.at(-1)!.confirmed, false);
  assert.ok(D.snapshotErrors(D.routineLaunchSnapshot(approved.routines[0], approved.customExercises).snapshot.items).length);
  (p.routines[0].items[0] as unknown as Record<string, unknown>).confirmed = true;
  assert.throws(() => validateContentPackage(p), /Unrecognized key/);
});
test('malformed input, unsupported versions, encoding, unknown state fields and count/size limits reject explicitly', () => {
  assert.throws(() => parseContentPackage('```json\n{}\n```'), /Malformed JSON/);
  assert.throws(() => parseContentPackage(raw({ ...mixed(), version: 99 } as never)), /Unsupported content version/);
  assert.throws(() => parseContentPackage(' '.repeat(CONTENT_LIMITS.bytes + 1)), /2 MiB/);
  assert.throws(() => parseContentPackage('\uFFFD'), /encoding/);
  assert.throws(() => validateContentPackage({ ...mixed(), profile: {} }), /Unrecognized key/);
  for (const field of ['schedule', 'history', 'active', 'presets']) assert.throws(() => validateContentPackage({ ...mixed(), [field]: [] }), /Unrecognized key/);
  assert.throws(() => validateContentPackage({ ...mixed(), activities: Array(501).fill(mixed().activities[0]) }));
  const p = mixed(); p.activities[1].ref = p.activities[0].ref;
  assert.throws(() => validateContentPackage(p), /Duplicate package reference/);
});
test('dangling dependencies, cycles, depth, explosive repetition, missing sources and unsupported units reject without mutation', () => {
  const state = D.emptyState(), before = raw(state as never);
  const dangling = nested(); dangling.activities[2].members[0].activityRef = 'missing';
  assert.throws(() => importPackage(dangling, state), /missing dependency/);
  const cyclic = nested(); cyclic.activities[2].members[0].activityRef = cyclic.activities[3].ref;
  assert.throws(() => importPackage(cyclic, state), /cycle/);
  const deep = nested(); deep.activities[2].members = [{ activityRef: deep.activities[0].ref, side: 'unspecified' }];
  for (let n = 0; n < 33; n++) {
    const prev = deep.activities.at(-1)!.ref;
    const entry = clone(deep.activities[2]); entry.ref = `depth-${n}`; entry.members = [{ activityRef: prev, side: 'unspecified' }]; deep.activities.push(entry);
  }
  assert.throws(() => importPackage(deep, state), /32 levels/);
  const explosive = nested(); explosive.activities[3].members = Array(251).fill({ activityRef: explosive.activities[2].ref, side: 'unspecified' });
  assert.throws(() => importPackage(explosive, state), /500 activities/);
  const missingSource = mixed(); missingSource.activities[0].activity.sourceIds = ['missing-source'];
  assert.throws(() => importPackage(missingSource, state), /missing source/);
  for (const patch of [{ distance: 1, distanceUnit: 'km' }, { breaths: 2 }, { load: 1, unit: 'stone' }, { reps: 5, seconds: 20 }]) {
    const p = mixed(); Object.assign(p.routines[0].items[0], patch);
    assert.throws(() => importPackage(p, state));
  }
  assert.equal(raw(state as never), before);
});
test('durable storage failure leaves state unchanged; successful append preserves profile/presets/bookmarks/history/schedules/active sessions', async () => {
  const d = local(), item = { ...D.makeItem(d), reps: 5, confirmed: true, definition: d };
  const r = routine([item]);
  const snap = D.snapshotFromRoutine(r, [d]);
  const active = D.startActive({ date: '2026-10-11', occurrenceKey: null, snapshot: snap, items: [...snap.items] }, 1);
  const history = D.completeActive(active, { rpe: null }, 2000);
  const saved = D.setSavedActivity(D.emptyState(), release.activities[0].id, true, release).savedActivities;
  const state: D.StateV2 = { ...D.emptyState(), customExercises: [d], routines: [r], presets: { [d.id]: { defaultReps: 19 } },
    savedActivities: saved, active, completions: [history], schedule: [D.scheduleEntry(snap, '2026-10-11', [0])] };
  const before = JSON.stringify(state);
  const review = reviewContent(raw(mixed()), state);
  await assert.rejects(persistContentImport(state, review, { intentionalCopy: false, approveTargets: false }, async () => { throw new Error('disk full'); }), /disk full/);
  assert.equal(JSON.stringify(state), before);
  let stored: D.StateV2 | undefined;
  const result = await persistContentImport(state, review, { intentionalCopy: false, approveTargets: false }, async next => { stored = clone(next); });
  assert.equal(JSON.stringify(result.state), JSON.stringify(stored));
  for (const field of ['profile', 'presets', 'savedActivities', 'active', 'completions', 'schedule', 'events', 'plan'] as const) assert.strictEqual(result.state[field], state[field]);
  assert.strictEqual(result.state.routines[0], r);
  assert.strictEqual(result.state.customExercises[0], d);
  const restored = D.checkImport(JSON.stringify(D.exportPayload(result.state)));
  assert.equal(restored.ok, true, restored.ok ? '' : restored.error);
  const loaded = D.loadStored(JSON.stringify(result.state), null);
  assert.equal(loaded.error, null);
  assert.ok(loaded.state?.customExercises.at(-1)?.contentImport);
});
