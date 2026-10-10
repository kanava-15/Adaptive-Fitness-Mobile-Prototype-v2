import React from 'react';
import { Text, View } from 'react-native';
import { Activity, CatalogRelease, expandSequence } from '@workspace/activity-catalog';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/colors';

export function ActivityDetails({ activity: a, release }: { activity: Activity; release: CatalogRelease }) {
  const c = useColors();
  let sequence: string[] = [];
  if (a.type === 'sequence') {
    try { sequence = expandSequence(release, a.id).map((m, i) => `${i + 1}. ${release.activities.find(x => x.id === m.activityId)?.name ?? m.activityId} · ${m.side} · explicit target required`); }
    catch (err) { sequence = [`Unavailable: ${err instanceof Error ? err.message : 'invalid membership'}. Restore missing members or edit membership. Saved workout snapshots are unchanged.`]; }
  }
  const section = (title: string, values: string[] | null) => <View style={{ gap: 5, marginTop: 14 }}>
    <Text style={{ color: c.foreground, fontFamily: fonts.bodySemi }}>{title}</Text>
    <Text selectable style={{ color: c.foreground, fontFamily: fonts.body, lineHeight: 21 }}>
      {values === null ? 'Not established.' : values.length ? values.join('\n') : 'Not applicable.'}
    </Text>
  </View>;
  return <View>
    {section('Identity and review', [a.type, a.discipline, a.family, a.englishName ?? 'English name not established', a.sanskritName ?? 'Sanskrit name not established', ...a.aliases, `Difficulty: ${a.difficulty}`, `${a.authorship === 'user' ? 'User-authored' : 'Maintainer'} · ${a.reviewStatus}`, a.description])}
    {section('Setup', a.setup)}
    {section('Execution and exit', a.execution)}
    {section('Cues', a.cues)}
    {section('Common mistakes', a.commonMistakes)}
    {section('Benefits (qualified)', a.benefits.map(b => `${b.text} — ${b.qualification}`))}
    {section('Precautions', a.precautions)}
    {section('Modifications', a.modifications)}
    {section('Equipment', a.equipment)}
    {section('Primary muscles', a.primaryMuscles)}
    {section('Secondary muscles', a.secondaryMuscles)}
    {section('Joints', a.joints)}
    {section('Actions', a.actions)}
    {section('Movement patterns', a.movementPatterns)}
    {section('Measurement capability — no prescribed dose', [a.supportedMetrics.join(', '), `Distance units: ${a.distanceUnits.join(', ') || 'not applicable'}`, `Load units: ${a.loadUnits.join(', ') || 'not applicable'}`, `Laterality: ${a.laterality}`])}
    {section('Instruction and suitability', [a.instructionNeeded ? 'Experienced instruction required.' : 'No specific instruction requirement established.', a.adaptation.eligible && a.adaptation.loadingKnown ? 'Affirmative adaptation and loading metadata.' : 'Not eligible for automatic recommendations.', a.adaptation.rationale])}
    {section('Lineage context', a.seriesContext.map(x => `${x.label} — ${x.lineage}`))}
    {a.mobility ? section('Mobility safeguards', [a.mobility.position, a.mobility.stabilization, a.mobility.comfortableRange, a.mobility.intensityCaution, ...a.mobility.compensationCues, ...a.mobility.regressions]) : null}
    {section('Relationships', release.relationships.filter(r => r.from === a.id || r.to === a.id).map(r => `${r.type}: ${release.activities.find(x => x.id === (r.from === a.id ? r.to : r.from))?.name ?? 'Unavailable'}`))}
    {a.type === 'sequence' ? section('Expanded sequence — order, repetition and side preserved', sequence) : null}
    {section('Source references', a.sourceIds.map(id => {
      const source = release.sources.find(s => s.id === id);
      return source ? `${source.title}\n${source.provenance}\n${source.reviewStatus} · retrieved ${source.retrievedOn ?? 'unknown'} · reviewed ${source.reviewedOn ?? 'unknown'}\n${source.permittedUse}\n${source.url}` : `Source not available: ${id}`;
    }))}
  </View>;
}
