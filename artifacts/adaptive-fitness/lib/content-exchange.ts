// Pure local operations. Transport, storage and UI must never replace device state.
import {
  canonicalJson, contentFingerprint, parseContentPackage, validateContentPackage, sourceReferences, utf8Size, CONTENT_LIMITS,
  type Activity, type ContentActivity, type ContentPackage, type CatalogRelease, type ContentItem,
} from '@workspace/activity-catalog';
import {
  activityDef, allExercises, BUILTIN, findExercise, knowledgeOf, validateItem, personalCatalog,
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

export type ActivityImportChoice = 'catalogue' | 'copy';
export interface ActivityCatalogMatch {
  activity: Activity;
  definition: ExerciseDef;
  members: { activityId: string; side: string; name: string; type: Activity['type'] | null }[];
  source: 'Svasthic catalogue' | 'built-in activity';
}
export interface ActivityImportEntry {
  incoming: ContentActivity;
  match?: ActivityCatalogMatch;
}
export interface ActivityImportReview {
  package: ContentPackage;
  fingerprint: string;
  revision: string;
  token: string;
  duplicate: boolean;
  entries: ActivityImportEntry[];
  collisions: string[];
}
export interface ActivityImportResult {
  state: StateV2;
  added: number;
  reused: number;
  addedNames: string[];
}

function activityRevision(state: StateV2, release: CatalogRelease): string {
  return contentFingerprint({
    library: libraryRevision(state),
    catalog: { contentVersion: release.contentVersion, activities: release.activities, sequences: release.sequences, sources: release.sources },
  });
}
export function activityImportIsStale(state: StateV2, release: CatalogRelease, review: ActivityImportReview): boolean {
  return activityRevision(state, release) !== review.revision;
}

function knownCatalogMatch(activity: Activity, state: StateV2, release: CatalogRelease): ActivityCatalogMatch | undefined {
  // Never let an existing personal record be shadowed or replaced by a claimed origin ID.
  if (state.customExercises.some(item => item.id === activity.id)) return undefined;
  const shared = release.activities.find(item => item.id === activity.id);
  const builtin = shared ? undefined : BUILTIN.find(item => item.id === activity.id);
  const known = shared ?? (builtin ? knowledgeOf(builtin) : undefined);
  if (!known) return undefined;
  const definition = shared ? activityDef(shared) : builtin!;
  const members = (shared
    ? release.sequences.filter(member => member.sequenceId === shared.id).sort((a, b) => a.order - b.order)
    : definition.sequenceMembers ?? [])
    .map(member => {
      const local = state.customExercises.find(item => item.id === member.activityId);
      const child = release.activities.find(item => item.id === member.activityId)
        ?? (local ? knowledgeOf(local) : undefined)
        ?? allExercises(state.customExercises).find(item => item.id === member.activityId)?.activity;
      return { activityId: member.activityId, side: member.side, name: child?.name ?? member.activityId, type: child?.type ?? null };
    });
  return { activity: known, definition, members, source: shared ? 'Svasthic catalogue' : 'built-in activity' };
}

function packageActivityClosure(p: ContentPackage): Set<string> {
  const byRef = new Map(p.activities.map(entry => [entry.ref, entry]));
  const included = new Set<string>();
  const visit = (ref: string) => {
    if (included.has(ref)) return;
    const entry = byRef.get(ref);
    if (!entry) throw new Error(`Missing activity dependency ${ref}.`);
    included.add(ref);
    for (const member of entry.members) visit(member.activityRef);
  };
  for (const selected of p.selection) {
    if (selected.kind !== 'activity') throw new Error('This package contains routines. Import activities from an activity-only JSON package; routines are not added here.');
    visit(selected.ref);
  }
  return included;
}

export function reviewActivityContent(raw: string, state: StateV2, release: CatalogRelease): ActivityImportReview {
  const p = parseContentPackage(raw);
  if (p.routines.length) throw new Error('This package contains routines. This flow imports activities and sequences only; no content was added. Use a package containing activities only.');
  const included = packageActivityClosure(p);
  const byRef = new Map(p.activities.map(entry => [entry.ref, entry]));
  for (const ref of included) {
    const parent = byRef.get(ref)!;
    if (parent.activity.type !== 'sequence') continue;
    for (const member of parent.members) {
      const nested = byRef.get(member.activityRef)!;
      if (nested.activity.type === 'sequence') {
        throw new Error(`Sequence "${parent.activity.name}" cannot contain nested sequence "${nested.activity.name}". Sequences may contain individual activities only.`);
      }
    }
  }
  const entries = [...included].map(ref => {
    const incoming = byRef.get(ref)!;
    return { incoming, match: knownCatalogMatch(incoming.activity, state, release) };
  });
  const collisions = entries.flatMap(({ incoming, match }) => {
    const normalizedName = incoming.activity.name.toLocaleLowerCase();
    const sameName = [
      ...state.customExercises.map(item => item.name),
      ...state.routines.map(item => item.name),
      ...release.activities.map(item => item.name),
      ...BUILTIN.map(item => item.name),
    ].some(name => name.toLocaleLowerCase() === normalizedName);
    const claimedIdInLocal = state.customExercises.some(item => item.id === incoming.origin.id);
    return [
      ...(sameName && !match ? [`${incoming.activity.name}: a name match is not linked; a separate imported activity will be created.`] : []),
      ...(claimedIdInLocal ? [`${incoming.activity.name}: its claimed ID is already used by personal content; that record will not be changed.`] : []),
    ];
  });
  const fingerprint = contentFingerprint(p);
  const duplicate = state.customExercises.some(item => item.contentImport?.packageFingerprint === fingerprint);
  return {
    package: p,
    fingerprint,
    revision: activityRevision(state, release),
    token: newId('activity-review'),
    duplicate,
    entries,
    collisions,
  };
}

function choiceFor(entry: ActivityImportEntry, choices: Record<string, ActivityImportChoice>): ActivityImportChoice | undefined {
  return entry.match ? choices[entry.incoming.ref] : 'copy';
}

export function includedActivityImportRefs(
  review: ActivityImportReview,
  choices: Record<string, ActivityImportChoice>,
): Set<string> {
  const entries = new Map(review.entries.map(entry => [entry.incoming.ref, entry]));
  const included = new Set<string>();
  const visit = (ref: string) => {
    if (included.has(ref)) return;
    const entry = entries.get(ref);
    if (!entry) return;
    included.add(ref);
    const choice = choiceFor(entry, choices);
    const resolved = choice === 'catalogue' && entry.match ? entry.match.activity : entry.incoming.activity;
    // Reusing a sequence retains its own catalogue membership; incoming dependency
    // definitions are not silently added unless they are selected separately.
    if (resolved.type === 'sequence' && choice !== 'catalogue') {
      entry.incoming.members.forEach(member => visit(member.activityRef));
    }
  };
  for (const selected of review.package.selection) if (selected.kind === 'activity') visit(selected.ref);
  return included;
}

export function validateActivityImportChoices(
  review: ActivityImportReview,
  choices: Record<string, ActivityImportChoice>,
): string[] {
  const errors: string[] = [];
  const included = includedActivityImportRefs(review, choices);
  const entries = new Map(review.entries.filter(entry => included.has(entry.incoming.ref)).map(entry => [entry.incoming.ref, entry]));
  const resolved = new Map<string, Activity>();
  for (const entry of entries.values()) {
    const choice = choiceFor(entry, choices);
    if (entry.match && !choice) errors.push(`${entry.incoming.activity.name}: choose Use catalogue activity or Save custom copy before importing.`);
    resolved.set(entry.incoming.ref, choice === 'catalogue' && entry.match ? entry.match.activity : entry.incoming.activity);
  }

  const reusedById = new Map<string, string[]>();
  for (const entry of entries.values()) {
    if (choiceFor(entry, choices) !== 'catalogue' || !entry.match) continue;
    const definitions = reusedById.get(entry.match.activity.id) ?? [];
    // Membership and source attribution are part of an incoming definition,
    // not just its stable origin ID and descriptive Activity record.
    definitions.push(canonicalJson({
      origin: entry.incoming.origin,
      activity: entry.incoming.activity,
      sources: entry.incoming.sources,
      attribution: entry.incoming.attribution ?? null,
      members: entry.incoming.members,
    }));
    reusedById.set(entry.match.activity.id, definitions);
  }
  for (const [id, definitions] of reusedById) {
    if (new Set(definitions).size > 1) {
      const name = [...entries.values()].find(entry => entry.match?.activity.id === id)?.match?.activity.name ?? id;
      errors.push(`Different incoming definitions cannot both reuse "${name}". Save all but one as custom copies.`);
    }
  }

  for (const entry of entries.values()) {
    if (choiceFor(entry, choices) !== 'catalogue' || !entry.match || entry.match.activity.type !== 'sequence') continue;
    for (const member of entry.match.members) {
      if (member.type === 'sequence') errors.push(`Sequence "${entry.match.activity.name}" cannot contain nested sequence "${member.name}".`);
      else if (!member.type) errors.push(`Sequence "${entry.match.activity.name}" has an unresolved catalogue member "${member.name}".`);
    }
  }

  for (const entry of entries.values()) {
    const chosen = resolved.get(entry.incoming.ref)!;
    if (chosen.type !== 'sequence' || choiceFor(entry, choices) === 'catalogue') continue;
    for (const member of entry.incoming.members) {
      const child = entries.get(member.activityRef);
      const childActivity = resolved.get(member.activityRef);
      if (!child || !childActivity) {
        errors.push(`Sequence "${entry.incoming.activity.name}" has an unresolved member "${member.activityRef}".`);
      } else if (childActivity.type === 'sequence') {
        errors.push(`Sequence "${entry.incoming.activity.name}" cannot contain nested sequence "${childActivity.name}".`);
      }
    }
  }
  return [...new Set(errors)];
}

export function applyActivityImport(
  state: StateV2,
  release: CatalogRelease,
  review: ActivityImportReview,
  choices: Record<string, ActivityImportChoice>,
  now = new Date().toISOString(),
): ActivityImportResult {
  const p = validateContentPackage(review.package);
  if (contentFingerprint(p) !== review.fingerprint) throw new Error('The reviewed package changed. Review it again.');
  if (activityRevision(state, release) !== review.revision) throw new Error('Your library or catalogue changed after preview. Review the package again.');
  if (review.duplicate) throw new Error('This identical activity package was already imported. Review the existing imported activities instead.');
  const errors = validateActivityImportChoices(review, choices);
  if (errors.length) throw new Error(errors.join('\n'));
  const included = includedActivityImportRefs(review, choices);
  const entries = review.entries.filter(entry => included.has(entry.incoming.ref));

  const used = new Set([
    ...allExercises(state.customExercises).map(item => item.id),
    ...state.routines.map(item => item.id),
    ...release.activities.map(item => item.id),
    ...entries.map(entry => entry.incoming.activity.id),
  ]);
  const fresh = (prefix: string): string => {
    let id = newId(prefix);
    while (used.has(id)) id = newId(prefix);
    used.add(id);
    return id;
  };
  const resolved = new Map<string, ExerciseDef>();
  const additions: ExerciseDef[] = [];
  for (const entry of entries) {
    if (choiceFor(entry, choices) === 'catalogue' && entry.match) {
      resolved.set(entry.incoming.ref, entry.match.definition);
      continue;
    }
    const incoming = entry.incoming;
    const id = fresh('import');
    const activity: Activity = {
      ...incoming.activity,
      id,
      version: 1,
      authorship: 'user',
      reviewStatus: 'unreviewed',
      adaptation: {
        eligible: false,
        loadingKnown: false,
        loadedJoints: [],
        rationale: 'Externally imported and unverified. Not eligible for automatic adaptation.',
      },
    };
    const definition: ExerciseDef = {
      ...activityDef(activity),
      id,
      version: 1,
      custom: true,
      verified: false,
      rehab: false,
      createdAt: now,
      updatedAt: now,
      contentImport: {
        packageFingerprint: review.fingerprint,
        entryRef: incoming.ref,
        importedAt: now,
        author: p.author,
        origin: incoming,
      },
    };
    resolved.set(incoming.ref, definition);
    additions.push(definition);
  }
  for (const entry of entries) {
    if (entry.incoming.activity.type !== 'sequence' || choiceFor(entry, choices) === 'catalogue') continue;
    const definition = resolved.get(entry.incoming.ref)!;
    definition.sequenceMembers = entry.incoming.members.map((member, order) => ({
      sequenceId: definition.id,
      activityId: resolved.get(member.activityRef)!.id,
      order,
      side: member.side,
    }));
  }
  const reused = entries.filter(entry => choiceFor(entry, choices) === 'catalogue').length;
  return {
    state: { ...state, customExercises: [...state.customExercises, ...additions] },
    added: additions.length,
    reused,
    addedNames: additions.map(item => item.name),
  };
}

/** Storage is atomic for one key; activity imports publish only after the write resolves. */
export async function persistActivityImport(
  state: StateV2,
  release: CatalogRelease,
  review: ActivityImportReview,
  choices: Record<string, ActivityImportChoice>,
  store: (next: StateV2) => Promise<void>,
) {
  const result = applyActivityImport(state, release, review, choices);
  await store(result.state);
  return result;
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
