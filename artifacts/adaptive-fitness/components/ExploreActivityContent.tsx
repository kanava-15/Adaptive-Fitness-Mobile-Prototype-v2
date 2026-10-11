import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity, CatalogRelease } from '@workspace/activity-catalog';
import { Feather } from '@expo/vector-icons';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';

export const DetailDisclosureState = React.createContext<{ identity: string; values: Record<string, boolean>; toggle: (key: string, value: boolean) => void } | null>(null);

export function DetailDisclosure({ title, children, initial = false, testID }: { title: string; children: React.ReactNode; initial?: boolean; testID?: string }) {
  const c = useColors();
  const state = React.useContext(DetailDisclosureState);
  const [localOpen, setOpen] = useState(initial);
  const key = `${state?.identity}:${title}`;
  const open = state ? state.values[key] ?? initial : localOpen;
  return <View style={[s.block, { backgroundColor: c.card, borderColor: c.border }]}>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => state ? state.toggle(key, !open) : setOpen(v => !v)} style={s.toggle}>
      <Text accessibilityRole="header" style={[s.heading, { color: c.foreground, flex: 1 }]}>{title}</Text>
      <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.foreground} />
    </Pressable>
    {open ? <View style={s.content}>{children}</View> : null}
  </View>;
}

/** Explore-only disclosure hierarchy; shared readers retain their original presentation. */
export function ExploreActivityContent({ activity: a, release, onOpenRelated }: { activity: Activity; release: CatalogRelease; onOpenRelated: (id: string) => void }) {
  const c = useColors();
  const [error, setError] = useState<string | null>(null);
  const open = async (url: string) => {
    setError(null);
    try { await Linking.openURL(url); }
    catch { setError('Could not open the reference. Check your connection.'); }
  };
  const text = (value: string) => <Text selectable style={[s.body, { color: c.foreground }]}>{value}</Text>;
  const section = (title: string, values: string[] | null) => <View style={{ gap: 5 }}>
    <Text accessibilityRole="header" style={[s.heading, { color: c.foreground }]}>{title}</Text>
    {text(values === null ? 'Not established.' : values.length ? values.join('\n') : 'Not applicable.')}
  </View>;
  const link = (title: string, url: string) => <Pressable accessibilityRole="link" accessibilityLabel={`${title}. Opens externally`} onPress={() => void open(url)} style={s.link}>
    <Text selectable style={[s.body, { color: c.accent, textDecorationLine: 'underline' }]}>{title}</Text>
    <Feather name="external-link" size={16} color={c.accent} />
  </Pressable>;
  const related = release.relationships.filter(r => r.from === a.id || r.to === a.id);
  const sport = a.type === 'sport' || a.discipline === 'sports';
  return <>
    <DetailDisclosure title="Identity, review & lineage" testID="catalog-detail-identity">
      {section('Identity', [a.id, `Version ${a.version}`, a.type, a.discipline, a.family, a.englishName ?? 'English name not established', a.sanskritName ?? 'Sanskrit name not established', ...a.aliases])}
      {section('Review status', [`${a.authorship === 'user' ? 'User-authored' : 'Maintainer'} · ${a.reviewStatus}`])}
      {section('Lineage context', a.seriesContext.map(x => `${x.label} — ${x.lineage} (source: ${release.sources.find(s => s.id === x.sourceId)?.title ?? x.sourceId})`))}
      {section('Measurement capability — no prescribed dose', [a.supportedMetrics.join(', '), `Distance units: ${a.distanceUnits.join(', ') || 'not applicable'}`, `Load units: ${a.loadUnits.join(', ') || 'not applicable'}`, `Laterality: ${a.laterality}`, ...(!sport ? [`Difficulty: ${a.difficulty}`] : [])])}
      {section('Instruction and suitability', [a.instructionNeeded ? 'Experienced instruction required.' : 'No specific instruction requirement established.', a.adaptation.eligible && a.adaptation.loadingKnown ? 'Affirmative adaptation and loading metadata.' : 'Not eligible for automatic recommendations.', a.adaptation.rationale])}
    </DetailDisclosure>
    <DetailDisclosure title="Modifications & common mistakes">
      {section('Common mistakes', a.commonMistakes)}
      {section('Modifications', a.modifications)}
      {section('Equipment', a.equipment)}
      {a.mobility ? section('Mobility safeguards', [a.mobility.position, a.mobility.stabilization, a.mobility.comfortableRange, a.mobility.intensityCaution, ...a.mobility.compensationCues, ...a.mobility.regressions]) : null}
    </DetailDisclosure>
    {!sport ? <DetailDisclosure title="Anatomy & movement">
      {section('Primary muscles', a.primaryMuscles)}
      {section('Secondary muscles', a.secondaryMuscles)}
      {section('Joints', a.joints)}
      {section('Actions', a.actions)}
      {section('Movement patterns', a.movementPatterns)}
    </DetailDisclosure> : null}
    <DetailDisclosure title="Relationships & variations" testID="catalog-detail-related">
      {related.length ? related.map((r, i) => {
        const id = r.from === a.id ? r.to : r.from;
        const target = release.activities.find(item => item.id === id);
        const title = `${r.type}: ${target?.name ?? 'Unavailable'}`;
        return target && !target.archived ? <Pressable key={i} accessibilityRole="link" accessibilityLabel={`Open related activity: ${target.name}`} onPress={() => onOpenRelated(id)} style={s.link}>
          <Text style={[s.body, { color: c.accent, textDecorationLine: 'underline', flex: 1 }]}>{title}</Text>
        </Pressable> : <View key={i}>{text(title)}</View>;
      }) : text('No linked variations.')}
    </DetailDisclosure>
    <View testID="activity-media-references" style={[s.block, s.content, { backgroundColor: c.secondary, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[s.heading, { color: c.foreground }]}>Educational media references</Text>
      {a.mediaReferences?.length ? a.mediaReferences.map((reference, i) => <View key={i}>
        {link(reference.title, reference.url)}
        {text(`Reference source: ${release.sources.find(item => item.id === reference.sourceId)?.title ?? `Unavailable (${reference.sourceId})`}`)}
      </View>) : text('No reviewed media reference attached. Instructions are available above.')}
      {text('Links open outside Svasthic only when tapped. Svasthic does not host or play media.')}
    </View>
    <DetailDisclosure title="Sources & attribution" testID="catalog-detail-sources">
      {Array.from(new Set([...a.sourceIds, ...a.benefits.flatMap(b => b.sourceIds), ...a.seriesContext.map(x => x.sourceId), ...(a.mediaReferences ?? []).map(x => x.sourceId)])).map(id => {
        const source = release.sources.find(s => s.id === id);
        return <View key={id} style={{ gap: 5 }}>
          {source ? <>
            {link(source.title, source.url)}
            {text(source.provenance)}
            {text(`${source.reviewStatus} · retrieved ${source.retrievedOn ?? 'unknown'} · reviewed ${source.reviewedOn ?? 'unknown'}`)}
            {text(source.permittedUse)}
            {text(source.url)}
          </> : text(`Source not available: ${id}`)}
        </View>;
      })}
      {!a.sourceIds.length ? text('No source reference is attached to this activity.') : null}
    </DetailDisclosure>
    {error ? <Text accessibilityRole="alert" style={[s.body, { color: c.destructive }]}>{error}</Text> : null}
  </>;
}

const s = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  toggle: { minHeight: 52, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  content: { padding: 14, gap: 14 },
  heading: { fontFamily: fonts.bodySemi, fontSize: 16, flexShrink: 1 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
