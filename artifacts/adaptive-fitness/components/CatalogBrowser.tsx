import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity } from '@workspace/activity-catalog';
import { useCatalog } from '@/context/CatalogContext';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/colors';
import { Button, Card } from '@/components/ui';
import { router } from 'expo-router';
import { LibraryFilters, useLibraryFilter } from './planner';
import { searchLibrary } from '@/lib/domain';
import { ActivityDetails } from './ActivityDetails';

export function CatalogBrowser() {
  const c = useColors();
  const { repository, state } = useCatalog();
  const [cars, setCars] = useState(false);
  const [visible, setVisible] = useState(30);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const f = useLibraryFilter();
  const list = searchLibrary([], { ...f.filter, source: 'shared' }).map(e => e.activity)
    .filter((a): a is Activity => !!a && (!cars || a.family === 'cars'));
  const selected = state.release.activities.find(a => a.id === selectedId);
  const body = (text: string, key?: string | number) => <Text key={key} style={[s.body, { color: c.foreground }]}>{text}</Text>;
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
          <Button compact variant="soft" label="Back to Explore" onPress={() => setSelectedId(null)} />
          <Text testID="catalog-detail-name" style={[s.title, { color: c.foreground }]}>{selected.name}</Text>
          {body(`${selected.discipline} · ${selected.type} · ${selected.family} · difficulty: ${selected.difficulty}`)}
          <ActivityDetails activity={selected} release={state.release} onOpenRelated={(id) => {
            const related = state.release.activities.find(activity => activity.id === id);
            if (related) setSelectedId(related.id);
          }} />
          {!selected.archived ? <>
            <Button testID="catalog-add-routine" label={selected.type === 'sequence' ? 'Expand into routine — enter targets' : 'Add to new routine'} onPress={() => router.push({ pathname: '/builder', params: { activityId: selected.id } })} />
            {selected.type !== 'sequence' ? <Button testID="catalog-schedule" variant="soft" label="Schedule — enter target" onPress={() => router.push({ pathname: '/schedule-add', params: { exerciseId: selected.id } })} /> : null}
          </> : null}
        </Card>
      ) : (
        <>
          <LibraryFilters f={f} searchTestID="catalog-search" />
          <Button testID="catalog-cars" compact variant={cars ? 'primary' : 'soft'} label="CARs only" onPress={() => { setCars(!cars); setVisible(30); }} />
          <Text testID="catalog-results" style={[s.meta, { color: c.mutedForeground }]}>{list.length} shared entries · tap to read details and sources</Text>
          {!list.length ? body('No catalog entries match. Try a shorter name or clear the category.') : null}
          {list.slice(0, visible).map(a => (
            <Pressable key={a.id} testID={`catalog-${a.id}`} accessibilityRole="button" onPress={() => setSelectedId(a.id)}>
              <Card style={{ gap: 4 }}>
                <Text style={[s.heading, { color: c.foreground }]}>{a.name}</Text>
                <Text style={[s.meta, { color: c.mutedForeground }]}>{a.englishName !== a.name ? `${a.englishName} · ` : ''}Shared catalog · {a.reviewStatus}{a.instructionNeeded ? ' · instruction required' : ''}</Text>
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
});
