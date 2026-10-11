import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Activity, CatalogRelease, expandSequence } from '@workspace/activity-catalog';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/colors';

export function ActivityDetails({ activity: a, release, onOpenRelated }: { activity: Activity; release: CatalogRelease; onOpenRelated?: (activityId: string) => void }) {
  const c = useColors();
  const [linkError, setLinkError] = useState<string | null>(null);
  const openReference = async (url: string) => {
    setLinkError(null);
    try { await Linking.openURL(url); }
    catch { setLinkError('Could not open the reference. Check your connection.'); }
  };
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
    <View style={{ gap: 8, marginTop: 14 }}>
      <Text style={{ color: c.foreground, fontFamily: fonts.bodySemi }}>Relationships and variations</Text>
      {release.relationships.filter(r => r.from === a.id || r.to === a.id).length ? release.relationships
        .filter(r => r.from === a.id || r.to === a.id)
        .map(r => {
          const relatedId = r.from === a.id ? r.to : r.from;
          const related = release.activities.find(x => x.id === relatedId);
          const label = `${r.type}: ${related?.name ?? 'Unavailable'}`;
          return related && !related.archived && onOpenRelated
            ? <Pressable key={`${r.type}:${relatedId}`} accessibilityRole="link" accessibilityLabel={`Open related activity: ${related.name}`} onPress={() => onOpenRelated(relatedId)}>
                <Text style={{ color: c.primary, fontFamily: fonts.body, lineHeight: 21, textDecorationLine: 'underline' }}>{label}</Text>
              </Pressable>
            : <Text key={`${r.type}:${relatedId}`} selectable style={{ color: c.foreground, fontFamily: fonts.body, lineHeight: 21 }}>{label}</Text>;
        }) : <Text style={{ color: c.mutedForeground, fontFamily: fonts.body, lineHeight: 21 }}>No linked variations.</Text>}
    </View>
    {a.type === 'sequence' ? section('Expanded sequence — order, repetition and side preserved', sequence) : null}
    <View style={{ gap: 8, marginTop: 14 }}>
      <Text style={{ color: c.foreground, fontFamily: fonts.bodySemi }}>Source references</Text>
      {a.sourceIds.length ? a.sourceIds.map(id => {
        const source = release.sources.find(s => s.id === id);
        return <View key={id} style={{ gap: 4 }}>
          <Text style={{ color: c.foreground, fontFamily: fonts.bodySemi }}>{source?.title ?? `Source not available: ${id}`}</Text>
          {source ? <>
            <Text selectable style={{ color: c.foreground, fontFamily: fonts.body, lineHeight: 21 }}>{source.provenance}</Text>
            <Text selectable style={{ color: c.mutedForeground, fontFamily: fonts.body, lineHeight: 18 }}>{source.reviewStatus} · retrieved {source.retrievedOn ?? 'unknown'} · reviewed {source.reviewedOn ?? 'unknown'}</Text>
            <Text selectable style={{ color: c.mutedForeground, fontFamily: fonts.body, lineHeight: 18 }}>{source.permittedUse}</Text>
            <Pressable accessibilityRole="link" accessibilityLabel={`Open source: ${source.title}`} onPress={() => void openReference(source.url)}>
              <Text selectable style={{ color: c.primary, fontFamily: fonts.body, lineHeight: 21, textDecorationLine: 'underline' }}>{source.url}</Text>
            </Pressable>
          </> : null}
        </View>;
      }) : <Text style={{ color: c.foreground, fontFamily: fonts.body, lineHeight: 21 }}>No source reference is attached.</Text>}
    </View>
    <View testID="activity-media-references" style={{ gap: 5, marginTop: 14 }}>
      <Text style={{ color: c.foreground, fontFamily: fonts.bodySemi }}>Optional educational media references</Text>
      {a.mediaReferences?.length ? a.mediaReferences.map(reference => {
        const source = release.sources.find(item => item.id === reference.sourceId);
        return <View key={`${reference.sourceId}:${reference.url}`} style={{ gap: 3 }}>
          <Pressable accessibilityRole="link" accessibilityLabel={`Open educational reference: ${reference.title}`} onPress={() => void openReference(reference.url)}>
            <Text selectable style={{ color: c.primary, fontFamily: fonts.bodySemi, textDecorationLine: 'underline' }}>{reference.title}</Text>
          </Pressable>
          <Text style={{ color: c.mutedForeground, fontFamily: fonts.body, fontSize: 12 }}>{source ? `Reference source: ${source.title}` : `Source unavailable: ${reference.sourceId}`}</Text>
        </View>;
      }) : <Text style={{ color: c.mutedForeground, fontFamily: fonts.body, lineHeight: 21 }}>None attached. Future entries will link to reviewed resources; Tempo does not host or play media.</Text>}
    </View>
    {linkError ? <Text accessibilityRole="alert" style={{ color: c.destructive, fontFamily: fonts.body, marginTop: 8 }}>{linkError}</Text> : null}
  </View>;
}
