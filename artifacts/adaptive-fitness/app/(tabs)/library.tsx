import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ExerciseRow, LibraryFilters, Segmented, useLibraryFilter } from '@/components/planner';
import { Button, Card, EmptyState, IconButton, ScreenTitle, confirm, success, tap, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { estimateSec, findExercise, minutesLabel, searchLibrary, snapItem } from '@/lib/domain';
import { CatalogBrowser } from '@/components/CatalogBrowser';
import { useCatalog } from '@/context/CatalogContext';

type Tab = 'moves' | 'routines' | 'catalog';

export default function LibraryScreen() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { state, duplicateRoutine, setRoutineArchived } = useTempo();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'catalog' ? 'catalog' : 'routines');
  const [source, setSource] = useState<'all' | 'builtin' | 'custom'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const f = useLibraryFilter();
  const custom = state.customExercises;
  useCatalog();
  const list = searchLibrary(custom, { ...f.filter, source, includeArchived: showArchived });
  const routines = state.routines.filter((r) => (showArchived ? true : !r.archived)).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const archivedCount = tab === 'moves' ? custom.filter((e) => e.archived).length : state.routines.filter((r) => r.archived).length;

  return (
    <KeyboardAwareScrollViewCompat style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top + 16, paddingBottom: bottom }} keyboardShouldPersistTaps="handled" bottomOffset={20}>
      <ScreenTitle
        eyebrow="Library"
        title={tab === 'catalog' ? 'Activity catalog' : tab === 'moves' ? 'Activities' : 'Your routines'}
        right={tab === 'catalog' ? undefined : <IconButton testID="library-new" icon="plus" label={tab === 'moves' ? 'New custom activity' : 'New routine'} onPress={() => router.push(tab === 'moves' ? '/exercise-edit' : '/builder')} />}
      />
      <Segmented testID="library-tab" options={[{ value: 'routines', label: `Routines (${state.routines.filter((r) => !r.archived).length})` }, { value: 'moves', label: 'Activities' }, { value: 'catalog', label: 'Catalog' }]} value={tab} onChange={(v) => setTab(v)} />

      {tab === 'catalog' ? <CatalogBrowser /> : tab === 'moves' ? (
        <View style={{ marginTop: 16 }}>
          <LibraryFilters f={f} />
          <View style={{ marginTop: 12 }}>
            <Segmented options={[{ value: 'all', label: 'All' }, { value: 'builtin', label: 'Built-in' }, { value: 'custom', label: `Custom (${custom.filter((e) => !e.archived).length})` }]} value={source} onChange={setSource} />
          </View>
          <Text style={[s.hint, { color: c.mutedForeground }]}>Offline activity knowledge, with no prescribed dosage. Choose personal targets in your routine or date. Source checks are not clinical certification.</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {list.length === 0 ? (
              <EmptyState icon="search" title="No activities match" body={source === 'custom' ? 'You haven’t made a custom activity yet. Add your physio’s exercise or a gym machine you use.' : 'Try clearing a filter or searching a body area.'}>
                <Button compact variant="soft" icon="plus" label="Create custom activity" onPress={() => router.push('/exercise-edit')} />
              </EmptyState>
            ) : (
              list.map((e) => <ExerciseRow testID={`move-${e.id}`} key={e.id} e={e} onPress={() => router.push({ pathname: '/exercise-edit', params: { id: e.id } })} />)
            )}
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 10 }}>
          {routines.length === 0 ? (
            <EmptyState icon="layers" title="Build your first routine" body="Pick activities you actually like, enter personal targets and rest, then put it on your calendar. Tempo preserves your choices.">
              <Button testID="routine-first" compact icon="plus" label="New routine" onPress={() => router.push('/builder')} />
            </EmptyState>
          ) : (
            routines.map((r) => {
              const items = r.items.flatMap((it) => {
                const d = it.definition ?? findExercise(custom, it.exerciseId);
                return d ? [snapItem(it, d)] : [];
              });
              const locked = r.items.filter((i) => i.locked).length;
              return (
                <Card key={r.id} style={[{ gap: 10 }, r.archived && { opacity: 0.6 }]}>
                  <Pressable testID={`routine-${r.id}`} onPress={() => { tap(); router.push({ pathname: '/builder', params: { id: r.id } }); }}>
                    <View style={s.rHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.rTitle, { color: c.foreground }]}>{r.name}</Text>
                        <Text style={[s.rMeta, { color: c.mutedForeground }]}>
                          {r.items.length} activities · {minutesLabel(estimateSec(items))}{locked ? ` · ${locked} locked` : ''} · v{r.version}{r.archived ? ' · archived' : ''}
                        </Text>
                      </View>
                      <Feather name="edit-3" size={18} color={c.mutedForeground} />
                    </View>
                    <Text style={[s.rMoves, { color: c.foreground }]} numberOfLines={2}>{items.map((i) => i.name).join(' · ')}</Text>
                  </Pressable>
                  <View style={s.actions}>
                    {!r.archived ? <Button testID={`schedule-${r.id}`} compact icon="calendar" label="Schedule" onPress={() => router.push({ pathname: '/schedule-add', params: { routineId: r.id } })} style={{ flex: 1 }} /> : null}
                    <IconButton icon="copy" label="Duplicate" onPress={() => { duplicateRoutine(r.id); success(); }} />
                    <IconButton
                      icon={r.archived ? 'rotate-ccw' : 'archive'}
                      label={r.archived ? 'Restore' : 'Archive'}
                      onPress={() =>
                        r.archived
                          ? setRoutineArchived(r.id, false)
                          : confirm('Archive this routine?', 'It disappears from your list. Scheduled sessions and history keep their own copy and are not affected. You can restore it any time.', 'Archive', () => setRoutineArchived(r.id, true))
                      }
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      )}
      {tab !== 'catalog' && (archivedCount || showArchived) ? (
        <Pressable onPress={() => { tap(); setShowArchived(!showArchived); }} style={{ marginTop: 18, alignSelf: 'center' }} hitSlop={8}>
          <Text style={[s.link, { color: c.mutedForeground }]}>{showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}</Text>
        </Pressable>
      ) : null}
    </KeyboardAwareScrollViewCompat>
  );
}

const s = StyleSheet.create({
  hint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  rHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rTitle: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.5 },
  rMeta: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  rMoves: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: fonts.bodyMedium, fontSize: 13, textDecorationLine: 'underline' },
});
