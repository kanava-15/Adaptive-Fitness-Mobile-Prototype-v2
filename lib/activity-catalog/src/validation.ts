import { releaseSchema, type Activity, type CatalogRelease } from './schema';

export function normalizedIdentity(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/** Deterministic text for normal search/future retrieval. No vectors or user data. */
export function retrievalText(a: Activity): string {
  return [a.name, a.englishName, a.sanskritName, ...a.aliases, a.type, a.discipline,
    a.family, a.description, ...(a.primaryMuscles ?? []), ...(a.secondaryMuscles ?? []),
    ...(a.joints ?? []), ...(a.equipment ?? []), ...a.setup, ...a.execution, ...a.cues,
    ...a.precautions, ...(a.mediaReferences ?? []).map(reference => reference.title)].filter(Boolean).join('\n').normalize('NFC');
}

export function validateRelease(input: unknown): CatalogRelease {
  const release = releaseSchema.parse(input);
  const errors: string[] = [];
  const ids = new Map<string, Activity>();
  const sources = new Set<string>();
  for (const s of release.sources) {
    if (sources.has(s.id)) errors.push(`Duplicate source ID: ${s.id}`);
    if (release.status === 'released' && s.reviewStatus === 'unreviewed') errors.push(`${s.id}: release source is unreviewed`);
    if (release.status === 'released' && (!s.retrievedOn || !s.reviewedOn)) errors.push(`${s.id}: source-check dates are required for publication`);
    if (s.reviewedOn && s.retrievedOn && s.reviewedOn < s.retrievedOn) errors.push(`${s.id}: review predates retrieval`);
    if (release.publishedAt && s.reviewedOn && s.reviewedOn > release.publishedAt.slice(0, 10)) errors.push(`${s.id}: review postdates publication`);
    sources.add(s.id);
  }
  const identities = new Map<string, string>();
  for (const a of release.activities) {
    if (ids.has(a.id)) errors.push(`Duplicate activity ID: ${a.id}`);
    ids.set(a.id, a);
    if ((a.type === 'asana' && a.discipline !== 'yoga') ||
        (a.type === 'mobility-drill' && a.discipline !== 'mobility') ||
        (a.type === 'conditioning-activity' && a.discipline !== 'conditioning') ||
        (a.type === 'practice-element' && a.discipline !== 'yoga') ||
        (a.family === 'ashtanga-vinyasa' && a.discipline !== 'yoga') ||
        (a.family === 'cars' && a.discipline !== 'mobility')) errors.push(`${a.id}: activity type/family conflicts with discipline`);
    for (const name of [a.name, a.englishName, a.sanskritName, ...a.aliases].filter((n): n is string => !!n)) {
      const key = normalizedIdentity(name);
      const owner = identities.get(key);
      if (owner && owner !== a.id) errors.push(`Duplicate identity "${name}": ${owner}, ${a.id}`);
      identities.set(key, a.id);
    }
    const refs = [...a.sourceIds, ...a.seriesContext.map(s => s.sourceId), ...a.benefits.flatMap(b => b.sourceIds),
      ...(a.mediaReferences ?? []).map(reference => reference.sourceId)];
    for (const ref of refs) if (!sources.has(ref)) errors.push(`${a.id}: missing source ${ref}`);
    if (a.supportedMetrics.includes('distance') !== (a.distanceUnits.length > 0)) errors.push(`${a.id}: distance tracking requires explicit units, and units require distance tracking`);
    if (a.family === 'cars' && (!a.mobility || !a.joints?.length || !a.actions?.length)) errors.push(`${a.id}: CARs need joint/action and mobility guidance`);
    if (a.type !== 'sequence' && (!a.setup.length || !a.execution.length)) errors.push(`${a.id}: setup/execution missing`);
    if (a.adaptation.eligible && (!a.adaptation.loadingKnown || a.difficulty === 'unknown' || a.difficulty === 'advanced' || a.instructionNeeded || a.authorship === 'user' || a.reviewStatus === 'unreviewed' || a.equipment === null)) errors.push(`${a.id}: insufficient suitability for automatic adaptation`);
    if (release.status === 'released' && (a.authorship !== 'maintainer' || !a.sourceIds.length || a.reviewStatus === 'unreviewed')) errors.push(`${a.id}: released catalog requires source-reviewed maintainer content`);
    if (release.status === 'released' && a.family === 'ashtanga-vinyasa' && !a.seriesContext.length) errors.push(`${a.id}: Ashtanga requires lineage-qualified context`);
    if (a.difficulty === 'advanced' && !a.instructionNeeded) errors.push(`${a.id}: advanced activity requires instruction flag`);
    if (new Set(a.sourceIds).size !== a.sourceIds.length) errors.push(`${a.id}: duplicate source references`);
  }
  const edges = new Map<string, string[]>();
  const positions = new Set<string>();
  for (const m of release.sequences) {
    if (ids.get(m.sequenceId)?.type !== 'sequence') errors.push(`${m.sequenceId}: not a sequence`);
    if (!ids.has(m.activityId)) errors.push(`${m.sequenceId}: missing member ${m.activityId}`);
    const key = `${m.sequenceId}:${m.order}`;
    if (positions.has(key)) errors.push(`Duplicate sequence position ${key}`);
    positions.add(key);
    edges.set(m.sequenceId, [...(edges.get(m.sequenceId) ?? []), m.activityId]);
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) { errors.push(`Sequence cycle at ${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of edges.get(id) ?? []) visit(child);
    visiting.delete(id); visited.add(id);
  };
  for (const a of release.activities) {
    if (a.type === 'sequence' && !edges.has(a.id)) errors.push(`${a.id}: empty sequence`);
    visit(a.id);
  }
  const relations = new Set<string>();
  const directed = new Map<string, string[]>();
  for (const r of release.relationships) {
    if (!ids.has(r.from) || !ids.has(r.to)) errors.push(`Dangling relationship: ${r.from} -> ${r.to}`);
    if (r.from === r.to) errors.push(`Self relationship: ${r.from}`);
    const key = `${r.from}:${r.type}:${r.to}`;
    if (relations.has(key)) errors.push(`Duplicate relationship: ${key}`);
    relations.add(key);
    if (r.type !== 'related-to') directed.set(r.from, [...(directed.get(r.from) ?? []), r.to]);
  }
  // Related-to is intentionally symmetric; only hierarchy edges must be acyclic.
  visiting.clear(); visited.clear();
  const visitRelation = (id: string) => {
    if (visiting.has(id)) { errors.push(`Relationship cycle at ${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of directed.get(id) ?? []) visitRelation(child);
    visiting.delete(id); visited.add(id);
  };
  for (const id of directed.keys()) visitRelation(id);
  for (const sequenceId of new Set(release.sequences.map(m => m.sequenceId))) {
    const orders = release.sequences.filter(m => m.sequenceId === sequenceId).map(m => m.order).sort((a, b) => a - b);
    if (orders.some((order, index) => order !== index)) errors.push(`${sequenceId}: sequence positions must be contiguous from zero`);
  }
  if (release.status === 'released' && (!release.publishedAt || release.reviewStatus === 'unreviewed')) errors.push('Release requires publication date and completed source review');
  if (errors.length) throw new Error(errors.join('\n'));
  return release;
}

export function coverage(release: CatalogRelease) {
  const active = release.activities.filter(a => !a.archived);
  return {
    strength: active.filter(a => a.discipline === 'strength' && a.type === 'exercise').length,
    ashtanga: active.filter(a => a.family === 'ashtanga-vinyasa' && a.type !== 'sequence').length,
    mobility: active.filter(a => a.discipline === 'mobility' && a.type === 'mobility-drill').length,
    conditioning: active.filter(a => a.type === 'conditioning-activity').length,
  };
}

export function requireCoverage(release: CatalogRelease): void {
  const counts = coverage(release);
  const minimum = { strength: 200, ashtanga: 80, mobility: 35, conditioning: 15 };
  const gaps = (Object.keys(minimum) as (keyof typeof minimum)[]).filter(k => counts[k] < minimum[k]);
  if (gaps.length) throw new Error(`Coverage gaps: ${gaps.map(k => `${k} ${counts[k]}/${minimum[k]}`).join(', ')}`);
}
