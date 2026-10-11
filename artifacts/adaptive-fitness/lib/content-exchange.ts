// Pure local operations. Transport, storage and UI must never replace device state.
import {
  canonicalJson, contentFingerprint, parseContentPackage, validateContentPackage, sourceReferences, utf8Size, CONTENT_LIMITS,
  type ContentActivity, type ContentPackage, type CatalogRelease, type ContentItem,
} from '@workspace/activity-catalog';
import {
  activityDef, allExercises, findExercise, knowledgeOf, validateItem, personalCatalog,
  type ExerciseDef, type Routine, type RoutineItem, type StateV2,
} from './domain';
import { newId } from './engine';

export type ExportSelection = { kind: 'activity' | 'routine'; id: string };
const itemFields = ['sets', 'reps', 'seconds', 'breaths', 'distance', 'distanceUnit', 'side', 'restSec', 'load', 'unit', 'perSide', 'priority', 'locked', 'note'] as const;
export function exportContent(state: StateV2, release: CatalogRelease, selection: ExportSelection[], title = 'Svasthic selected content'): ContentPackage {
  const activities: ContentActivity[] = [];
  const routines: ContentPackage['routines'] = [];
  const identities = new Map<string, string>();
  const path = new Set<string>();
  const resolved = personalCatalog(state.customExercises);
  const add = (definition: ExerciseDef): string => {
    const a = knowledgeOf(definition);
    const members = definition.sequenceMembers ?? resolved.sequences.filter(m => m.sequenceId === a.id);
    // Full effective knowledge and membership, not original ID alone, identify a pinned version.
    const key = canonicalJson({ a, members, attribution: definition.contentImport?.origin });
    const known = identities.get(key);
    if (known) {
      if (path.has(key)) throw new Error(`Sequence cycle at ${a.id}.`);
      return known;
    }
    if (path.size >= 32 || activities.length >= 500) throw new Error('Selection exceeds content dependency limits.');
    const ref = `a-${activities.length + 1}`;
    identities.set(key, ref); path.add(key);
    const imported = definition.contentImport?.origin;
    const origin = imported ? { ...imported.origin, kind: 'external' as const } : {
      id: a.id, version: a.version, kind: definition.custom ? 'local' as const : definition.activity ? 'catalog' as const : 'legacy' as const,
    };
    const knowledge = { ...a, id: origin.id, version: origin.version };
    const availableSources = [...(imported?.sources ?? []), ...release.sources];
    const sources = sourceReferences(knowledge).map(id => {
      const source = availableSources.find(s => s.id === id);
      if (!source) throw new Error(`${a.name}: source ${id} is unavailable; export cannot invent attribution.`);
      return source;
    });
    const entry: ContentActivity = { ref, origin, activity: knowledge, sources, members: [],
      ...(imported ? { attribution: imported.attribution ?? { activity: imported.activity, sources: imported.sources } } : {}) };
    activities.push(entry);
    if (a.type === 'sequence') {
      entry.members = [...members].sort((a, b) => a.order - b.order).map(m => {
        const child = findExercise(state.customExercises, m.activityId);
        if (!child) throw new Error(`${a.name}: missing sequence dependency ${m.activityId}.`);
        return { activityRef: add(child), side: m.side };
      });
    }
    path.delete(key);
    return ref;
  };
  const selected: ContentPackage['selection'] = [];
  for (const s of [...new Map(selection.map(s => [`${s.kind}:${s.id}`, s])).values()].sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`))) {
    if (s.kind === 'activity') {
      let d = findExercise(state.customExercises, s.id);
      if (!d) {
        const saved = state.savedActivities.find(a => a.id === s.id);
        if (saved) d = { ...activityDef(saved.fallback), sequenceMembers: saved.sequenceMembers };
      }
      if (!d) throw new Error(`Selected activity ${s.id} is unavailable.`);
      selected.push({ kind: 'activity', ref: add(d) });
    } else {
      const routine = state.routines.find(r => r.id === s.id);
      if (!routine) throw new Error(`Selected routine ${s.id} is unavailable.`);
      const ref = `r-${routines.length + 1}`;
      routines.push({ ref, originId: routine.id, name: routine.name, notes: routine.notes,
        items: routine.items.map(it => {
          const d = it.definition ?? findExercise(state.customExercises, it.exerciseId);
          if (!d) throw new Error(`${routine.name}: activity ${it.exerciseId} is unavailable.`);
          return { ...Object.fromEntries(itemFields.filter(k => it[k] !== undefined).map(k => [k, it[k]])), activityRef: add(d) } as ContentItem;
        }) });
      selected.push({ kind: 'routine', ref });
    }
  }
  const p = validateContentPackage({ format: 'svasthic-content', version: 1, title, author: null, activities, routines, selection: selected });
  if (utf8Size(JSON.stringify(p, null, 2)) > CONTENT_LIMITS.bytes) throw new Error('Formatted export exceeds 2 MiB. Select fewer items.');
  return p;
}

export function libraryRevision(state: StateV2): string {
  return contentFingerprint({ exercises: state.customExercises, routines: state.routines });
}
export interface ContentReview {
  package: ContentPackage;
  fingerprint: string;
  revision: string;
  token: string;
  duplicate: boolean;
  collisions: string[];
  missingTargets: number;
}
export function reviewContent(raw: string, state: StateV2): ContentReview {
  const p = parseContentPackage(raw), fingerprint = contentFingerprint(p);
  const existing = [...allExercises(state.customExercises), ...state.routines];
  const duplicate = existing.some(e => e.contentImport?.packageFingerprint === fingerprint);
  const collisions = [...p.activities.map(e => ({ id: e.origin.id, name: e.activity.name })), ...p.routines.map(r => ({ id: r.originId, name: r.name }))]
    .filter(e => existing.some(x => x.id === e.id || x.name.toLocaleLowerCase() === e.name.toLocaleLowerCase()))
    .map(e => `${e.name}: matching name or original ID; import uses a fresh ID and keeps the name. Existing content is unchanged.`);
  return { package: p, fingerprint, revision: libraryRevision(state), token: newId('review'), duplicate, collisions,
    missingTargets: p.routines.reduce((n, r) => n + r.items.filter(i => [i.reps, i.seconds, i.breaths, i.distance].every(x => x === undefined)).length, 0) };
}
export function importedItem(it: ContentItem, d: ExerciseDef, approveTargets: boolean, key = newId('it')): RoutineItem {
  const { activityRef: _ref, ...fields } = it;
  const item = { ...fields, key, exerciseId: d.id, definition: d, confirmed: false };
  // Completeness is assessed by existing launch rules, never by an incoming confirmation flag.
  const metric = it.reps !== undefined ? 'reps' : it.seconds !== undefined ? 'time' : it.breaths !== undefined ? 'breaths' : it.distance !== undefined ? 'distance' : d.tracking;
  return { ...item, confirmed: approveTargets && !validateItem({ ...item, confirmed: true }, metric).length };
}
export function applyContentImport(state: StateV2, review: ContentReview, options: { intentionalCopy: boolean; approveTargets: boolean }, now = new Date().toISOString()): { state: StateV2; added: number } {
  // Re-validate at the operation boundary; no caller can supply an unchecked package.
  const p = validateContentPackage(review.package);
  if (contentFingerprint(p) !== review.fingerprint) throw new Error('The reviewed package changed. Review it again.');
  if (libraryRevision(state) !== review.revision) throw new Error('Your library changed after preview. Review the package again.');
  if (!options.intentionalCopy && [...state.customExercises, ...state.routines].some(e => e.contentImport?.packageFingerprint === review.fingerprint)) throw new Error('This identical package was already imported. Choose an intentional copy to add another.');
  const used = new Set([...allExercises(state.customExercises), ...state.routines].map(e => e.id));
  const fresh = (prefix: string): string => {
    let id = newId(prefix);
    while (used.has(id)) id = newId(prefix);
    used.add(id); return id;
  };
  const definitions = new Map<string, ExerciseDef>();
  for (const e of p.activities) {
    const id = fresh('import');
    const a = { ...e.activity, id, version: 1, authorship: 'user' as const, reviewStatus: 'unreviewed' as const,
      adaptation: { eligible: false, loadingKnown: false, loadedJoints: [], rationale: 'Externally imported and unverified. Not eligible for automatic adaptation.' } };
    definitions.set(e.ref, { ...activityDef(a), id, version: 1, custom: true, verified: false, rehab: false,
      createdAt: now, updatedAt: now, contentImport: { packageFingerprint: review.fingerprint, entryRef: e.ref, importedAt: now, author: p.author, origin: e } });
  }
  for (const e of p.activities) if (e.activity.type === 'sequence') {
    const d = definitions.get(e.ref)!;
    d.sequenceMembers = e.members.map((m, order) => ({ sequenceId: d.id, activityId: definitions.get(m.activityRef)!.id, order, side: m.side }));
  }
  const routines: Routine[] = p.routines.map(r => ({
    id: fresh('rt'), name: r.name, notes: r.notes, version: 1, archived: false, createdAt: now, updatedAt: now,
    contentImport: { packageFingerprint: review.fingerprint, entryRef: r.ref, importedAt: now, author: p.author },
    items: r.items.map(it => importedItem(it, definitions.get(it.activityRef)!, options.approveTargets, fresh('it'))),
  }));
  return { state: { ...state, customExercises: [...state.customExercises, ...definitions.values()], routines: [...state.routines, ...routines] },
    added: definitions.size + routines.length };
}

/** Storage is atomic for one key. Publish only after it resolves; failures never mutate memory. */
export async function persistContentImport(state: StateV2, review: ContentReview, options: { intentionalCopy: boolean; approveTargets: boolean }, store: (next: StateV2) => Promise<void>) {
  const result = applyContentImport(state, review, options);
  await store(result.state);
  return result;
}
