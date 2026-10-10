import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Activity } from '@workspace/activity-catalog';
import { useCatalog } from '@/context/CatalogContext';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/colors';
import { Button, Card } from '@/components/ui';
import { router } from 'expo-router';
import { LibraryFilters, useLibraryFilter } from './planner';
import { searchLibrary } from '@/lib/domain';

export function CatalogBrowser() {
  const c = useColors();
  const { repository, state } = useCatalog();
  const [q, setQuery] = useState('');
  const [discipline, setDiscipline] = useState<Activity['discipline'] | undefined>();
  const [cars, setCars] = useState(false);
  const [visible, setVisible] = useState(30);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const f = useLibraryFilter();
  const matched = new Set(searchLibrary([], f.filter).map(d => d.id));
  const list = repository.browse({ q, discipline, family: cars ? 'cars' : undefined }).filter(a => matched.has(a.id));
  const selected = state.release.activities.find(a => a.id === selectedId);
  const body = (text: string, key?: string | number) => <Text key={key} style={[s.body, { color: c.foreground }]}>{text}</Text>;
  const section = (title: string, lines: string[] | null) => (
    <View style={s.section}>
      <Text style={[s.heading, { color: c.foreground }]}>{title}</Text>
      {lines === null ? body('Not established in this source review.') : lines.length ? lines.map((line, i) => body(`• ${line}`, i)) : body('Not applicable.')}
    </View>
  );
  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      <Card style={{ gap: 8 }}>
        <Text style={[s.heading, { color: c.foreground }]}>Source-checked activity catalog</Text>
        {body(`${state.release.activities.length} entries · ${state.release.contentVersion}`)}
        <Text testID="catalog-freshness" style={[s.meta, { color: c.mutedForeground }]}>
          {state.origin === 'bundled' ? 'Bundled offline copy' : state.origin === 'cache' ? 'Saved offline copy' : 'Downloaded and validated copy'}
          {' · '}{state.checkedAt ? `Last checked ${new Date(state.checkedAt).toLocaleString()}` : 'Not yet checked for updates'}
        </Text>
        <Text style={[s.meta, { color: c.mutedForeground }]}>Content reference checks, not medical certification. Add activities with explicit personal targets. Updates never rewrite saved routines, sessions or history.</Text>
        {state.error ? <Text testID="catalog-error" accessibilityRole="alert" style={[s.meta, { color: c.foreground }]}>{state.error}</Text> : null}
        <Button testID="catalog-refresh" compact variant="soft" icon="refresh-cw" label={state.checking ? 'Checking…' : 'Check for updates'} disabled={state.checking} onPress={() => void repository.refresh()} />
      </Card>
      {selected ? (
        <Card style={{ gap: 8 }}>
          <Button compact variant="soft" label="Back to catalog" onPress={() => { setSelectedId(null); setLinkError(null); }} />
          <Text testID="catalog-detail-name" style={[s.title, { color: c.foreground }]}>{selected.name}</Text>
          {selected.englishName !== selected.name ? body(selected.englishName ?? '') : null}
          {body(selected.description)}
          {body(`${selected.discipline} · ${selected.type} · ${selected.family} · difficulty: ${selected.difficulty}`)}
          {selected.instructionNeeded ? body('Experienced instruction required. This entry does not authorize automatic progression.') : null}
          {selected.archived ? body('Archived reference; not offered for new choices.') : null}
          {section('Setup', selected.setup)}
          {section('Movement and exit', selected.execution)}
          {section('Cues', selected.cues)}
          {section('Common mistakes', selected.commonMistakes)}
          {section('Precautions', selected.precautions)}
          {section('Modifications', selected.modifications)}
          {section('Qualified practice benefits', selected.benefits.map(b => `${b.text} ${b.qualification}`))}
          {section('Equipment', selected.equipment)}
          {section('Primary muscles', selected.primaryMuscles)}
          {section('Secondary muscles', selected.secondaryMuscles)}
          {section('Joints and actions', selected.joints === null && selected.actions === null ? null : [...(selected.joints ?? []), ...(selected.actions ?? [])])}
          {section('Aliases', selected.aliases)}
          {section('Lineage-qualified context', selected.seriesContext.map(x => `${x.label}: ${x.lineage}`))}
          {selected.mobility ? section('Mobility safeguards', [selected.mobility.position, selected.mobility.stabilization,
            selected.mobility.comfortableRange, selected.mobility.intensityCaution, ...selected.mobility.regressions]) : null}
          {section('Tracking capability (no prescribed dose)', [selected.supportedMetrics.join(', '),
            `Distance units: ${selected.distanceUnits.join(', ') || 'not applicable'}; load units: ${selected.loadUnits.join(', ') || 'not applicable'}`])}
          {section('Relationships', state.release.relationships.filter(r => r.from === selected.id || r.to === selected.id).map(r =>
            `${r.type}: ${state.release.activities.find(a => a.id === (r.from === selected.id ? r.to : r.from))?.name ?? 'Unavailable reference'}`))}
          {selected.type === 'sequence' ? section('Ordered members', state.release.sequences.filter(m => m.sequenceId === selected.id).sort((a, b) => a.order - b.order)
            .map(m => `${m.order + 1}. ${state.release.activities.find(a => a.id === m.activityId)?.name} · ${m.side}`)) : null}
          {section('Adaptation permission', [selected.adaptation.eligible ? 'Explicitly eligible.' : 'Not eligible for automatic adaptation.', selected.adaptation.rationale])}
          {!selected.archived ? <>
            <Button testID="catalog-add-routine" label={selected.type === 'sequence' ? 'Expand into routine — enter targets' : 'Add to new routine'} onPress={() => router.push({ pathname: '/builder', params: { activityId: selected.id } })} />
            {selected.type !== 'sequence' ? <Button testID="catalog-schedule" variant="soft" label="Schedule — enter target" onPress={() => router.push({ pathname: '/schedule-add', params: { exerciseId: selected.id } })} /> : null}
          </> : null}
          <Text style={[s.heading, { color: c.foreground }]}>Sources and review</Text>
          {state.release.sources.filter(source => selected.sourceIds.includes(source.id)).map(source => (
            <View key={source.id} style={s.section}>
              {body(source.title)}
              {body(source.provenance)}
              {body(`${source.reviewStatus} · retrieved ${source.retrievedOn ?? 'unknown'} · reviewed ${source.reviewedOn ?? 'unknown'}`)}
              {body(source.permittedUse)}
              <Pressable accessibilityRole="link" onPress={() => { setLinkError(null); void Linking.openURL(source.url).catch(() => setLinkError('Could not open the reference. Check your connection.')); }}>
                <Text selectable style={[s.meta, { color: c.primary, textDecorationLine: 'underline' }]}>{source.url}</Text>
              </Pressable>
            </View>
          ))}
          {linkError ? body(linkError) : null}
        </Card>
      ) : (
        <>
          <LibraryFilters f={f} />
          <TextInput testID="catalog-search" accessibilityLabel="Search catalog" placeholder="Search names, Sanskrit, equipment or joints" placeholderTextColor={c.mutedForeground}
            value={q} maxLength={120} onChangeText={text => { setQuery(text); setVisible(30); }}
            style={[s.search, { color: c.foreground, backgroundColor: c.card, borderColor: c.border }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['all', 'strength', 'yoga', 'mobility', 'conditioning'] as const).map(value => (
                <Button key={value} compact variant={(discipline ?? 'all') === value ? 'primary' : 'soft'} label={value === 'all' ? 'All' : value[0].toUpperCase() + value.slice(1)}
                  onPress={() => { setDiscipline(value === 'all' ? undefined : value); setCars(false); setVisible(30); }} />
              ))}
              <Button testID="catalog-cars" compact variant={cars ? 'primary' : 'soft'} label="CARs" onPress={() => { setCars(!cars); setDiscipline(undefined); setVisible(30); }} />
            </View>
          </ScrollView>
          <Text testID="catalog-results" style={[s.meta, { color: c.mutedForeground }]}>{list.length} matching entries · tap to read instructions and sources</Text>
          {!list.length ? body('No catalog entries match. Try a shorter name or clear the category.') : null}
          {list.slice(0, visible).map(a => (
            <Pressable key={a.id} testID={`catalog-${a.id}`} accessibilityRole="button" onPress={() => setSelectedId(a.id)}>
              <Card style={{ gap: 4 }}>
                <Text style={[s.heading, { color: c.foreground }]}>{a.name}</Text>
                <Text style={[s.meta, { color: c.mutedForeground }]}>{a.englishName !== a.name ? `${a.englishName} · ` : ''}{a.discipline} · {a.family}{a.instructionNeeded ? ' · instruction required' : ''}</Text>
              </Card>
            </Pressable>
          ))}
          {list.length > visible ? <Button compact variant="soft" label={`Show more (${list.length - visible} remaining)`} onPress={() => setVisible(n => n + 30)} /> : null}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 22 },
  heading: { fontFamily: fonts.bodySemi, fontSize: 15 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  meta: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  section: { gap: 4, marginTop: 8 },
  search: { borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: fonts.body, fontSize: 14 },
});
