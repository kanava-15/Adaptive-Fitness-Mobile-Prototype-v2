import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ExerciseRow, LibraryFilters, useLibraryFilter } from '@/components/planner';
import { Button, Card, EmptyState, IconButton, confirm, notify, success, tap, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { activityDef, estimateSec, minutesLabel, personalCatalog, resolveSavedActivity, routineLaunchSnapshot, searchLibrary } from '@/lib/domain';
import { ActivityDetails } from '@/components/ActivityDetails';
import { useCatalog } from '@/context/CatalogContext';
import { LibraryDashboard } from '@/components/LibraryDashboard';

type Tab = 'home' | 'explore' | 'saved' | 'personal' | 'routines';

export default function LibraryScreen() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { state, todayKey, duplicateRoutine, setRoutineArchived, setActivitySaved, startSnapshot } = useTempo();
  const catalog = useCatalog();
  const params = useLocalSearchParams<{ tab?: string }>();
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: Tab = requestedTab === 'catalog' || requestedTab === 'explore' ? 'explore' : requestedTab === 'saved' ? 'saved' : requestedTab === 'moves' || requestedTab === 'personal' || requestedTab === 'custom' ? 'personal' : requestedTab === 'routines' ? 'routines' : 'home';
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const f = useLibraryFilter();
  const custom = state.customExercises;
  const list = searchLibrary(custom, { ...f.filter, source: 'local', includeArchived: showArchived });
  const routines = state.routines.filter((r) => (showArchived ? true : !r.archived)).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const archivedCount = tab === 'personal' ? custom.filter((e) => e.archived).length : state.routines.filter((r) => r.archived).length;
  const saved = state.savedActivities;
  const selectedSaved = saved.find(item => item.id === selectedSavedId);
  const currentSaved = selectedSaved && catalog.state.release.activities.find(item => item.id === selectedSaved.id);
  const resolvedSaved = selectedSaved ? resolveSavedActivity(selectedSaved, catalog.state.release) : undefined;
  const savedActivity = resolvedSaved?.activity;
  const savedRelease = selectedSaved ? {
    ...personalCatalog(custom),
    activities: currentSaved ? personalCatalog(custom).activities : [...personalCatalog(custom).activities, selectedSaved.fallback],
    sequences: currentSaved ? personalCatalog(custom).sequences : [...personalCatalog(custom).sequences, ...(selectedSaved.sequenceMembers ?? [])],
  } : personalCatalog(custom);
  const title = tab === 'home' ? 'Library' : tab === 'explore' ? 'Explore' : tab === 'saved' ? 'Saved Activities' : tab === 'personal' ? 'Custom Activities' : 'Routines';
  const startRoutine = (routine: (typeof routines)[number]) => {
    if (state.active) {
      router.push('/session');
      return;
    }
    const { snapshot, errors } = routineLaunchSnapshot(routine, custom);
    if (errors.length) {
      notify('Can’t start this routine yet', errors.join('\n'));
      router.push({ pathname: '/builder', params: { id: routine.id } });
      return;
    }
    const estimate = estimateSec(snapshot.items);
    const errorsOnStart = startSnapshot({
      date: todayKey,
      occurrenceKey: null,
      snapshot,
      items: snapshot.items,
      plannedMinutes: Number.isFinite(estimate) ? Math.round(estimate / 60) : undefined,
      adaptation: [],
    });
    if (errorsOnStart.length) {
      notify('Can’t start this routine yet', errorsOnStart.join('\n'));
      router.push({ pathname: '/builder', params: { id: routine.id } });
      return;
    }
    success();
    router.push('/session');
  };

  if (tab === 'explore') return <Redirect href="/catalog-search" />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[s.appBar, { paddingTop: top + 8, borderBottomColor: c.border, backgroundColor: c.background }]}>
        {tab !== 'home' ? <IconButton testID="library-back" icon="arrow-left" label="Back to Library" onPress={() => router.replace('/library')} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[s.appBarEyebrow, { color: c.mutedForeground }]}>{tab === 'home' ? 'Svasthic' : 'Library'}</Text>
          <Text accessibilityRole="header" style={[s.appBarTitle, title.length > 12 && s.longAppBarTitle, tab === 'routines' && s.compactAppBarTitle, { color: c.foreground }]} numberOfLines={2}>{title}</Text>
        </View>
        <IconButton testID="library-content" icon="repeat" label="Import or export content" onPress={() => router.push('/content-exchange')} />
        <Button
          compact
          variant="soft"
          icon="compass"
          label="Explore"
          accessibilityLabel="Explore the full activity catalog"
          testID="library-explore"
          onPress={() => router.push('/catalog-search')}
        />
      </View>
      <KeyboardAwareScrollViewCompat style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: bottom }} keyboardShouldPersistTaps="handled" bottomOffset={20}>
      {tab === 'home' ? (
        <LibraryDashboard openTab={(nextTab) => router.push({ pathname: '/library', params: { tab: nextTab } })} />
      ) : tab === 'saved' ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {selectedSaved && savedActivity ? (
            <Card style={{ gap: 10 }}>
              <Button compact variant="soft" label="Back to Saved Activities" onPress={() => setSelectedSavedId(null)} />
              <Text testID="saved-activity-name" style={[s.rTitle, { color: c.foreground }]}>{savedActivity.name}</Text>
              <Text style={[s.hint, { color: c.mutedForeground, marginTop: 0 }]}>
                {resolvedSaved && !resolvedSaved.unavailable ? 'Shared catalog entry' : 'Unavailable in the current catalog · showing saved offline details'}
                {savedActivity.archived ? ' · archived' : ''}
                {' · '}{savedActivity.reviewStatus}
              </Text>
              <ActivityDetails activity={savedActivity} release={savedRelease} />
              <Button compact variant="ghost" icon="upload" label="Export this activity" onPress={() => router.push({ pathname: '/content-exchange', params: { activityId: selectedSaved.id } })} />
              <Button testID={`unsave-${selectedSaved.id}`} variant="soft" icon="bookmark" label="Remove from Saved Activities" onPress={() => { setActivitySaved(selectedSaved.id, false); setSelectedSavedId(null); }} />
              {currentSaved && !currentSaved.archived ? (
                <Button icon="plus" label={currentSaved.type === 'sequence' ? 'Expand into routine — enter targets' : 'Add to a new routine'} onPress={() => router.push({ pathname: '/builder', params: { activityId: currentSaved.id } })} />
              ) : null}
            </Card>
          ) : saved.length === 0 ? (
            <EmptyState icon="bookmark" title="No saved activities yet" body="Save shared activities or sequences from Explore. Saved items stay separate from custom activities and routines." />
          ) : (
            <>
              <Text style={[s.hint, { color: c.mutedForeground, marginTop: 0 }]}>Shared catalog bookmarks · read-only · saved on this device</Text>
              {saved.map(item => {
                const live = catalog.state.release.activities.find(a => a.id === item.id);
                const activity = live ?? item.fallback;
                return (
                  <ExerciseRow
                    key={item.id}
                    testID={`saved-${item.id}`}
                    e={activityDef(activity)}
                    onPress={() => setSelectedSavedId(item.id)}
                    right={<Text style={[s.savedStatus, { color: live?.archived || (!live && activity.archived) ? c.destructive : c.mutedForeground }]}>{!live ? 'Unavailable' : live.archived ? 'Archived' : 'Saved'}</Text>}
                  />
                );
              })}
            </>
          )}
        </View>
      ) : tab === 'personal' ? (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[s.sectionTitle, { color: c.foreground }]}>On this device</Text>
            <IconButton testID="library-new" icon="plus" label="New custom activity" onPress={() => router.push('/exercise-edit')} />
          </View>
          <LibraryFilters f={f} />
          <Text style={[s.hint, { color: c.mutedForeground }]}>Custom activities are stored only on this device, visibly unreviewed, and separate from saved shared entries.</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {list.length === 0 ? (
              <EmptyState
                icon="search"
                title={custom.length ? 'No custom activities match' : 'No custom activities yet'}
                body={custom.length ? 'Try clearing a filter or search.' : 'Create an activity for a gym machine, a coach’s instruction, or a movement you want to track. It stays on this device. Use the plus button above to create your first one.'}
              />
            ) : (
              list.map((e) => <ExerciseRow testID={`move-${e.id}`} key={e.id} e={e} onPress={() => router.push({ pathname: '/exercise-edit', params: { id: e.id } })} />)
            )}
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[s.sectionTitle, { color: c.foreground }]}>All routines</Text>
            <IconButton testID="library-new" icon="plus" label="New routine" onPress={() => router.push('/builder')} />
          </View>
          <Text style={[s.hint, { color: c.mutedForeground, marginTop: 0 }]}>Routines are your editable plans. Scheduling is separate from starting a session now.</Text>
          {routines.length === 0 ? (
            <Card style={{ gap: 8 }}>
              <Text style={[s.rTitle, { color: c.foreground }]}>No {showArchived ? 'archived ' : ''}routines here</Text>
              <Text style={[s.hint, { color: c.mutedForeground, marginTop: 0 }]}>
                {showArchived ? 'Archived routines will appear here.' : 'Build your first routine with activities and confirmed targets. Use the plus button above to create it.'}
              </Text>
            </Card>
          ) : (
            routines.map((r) => {
              const { snapshot, errors } = routineLaunchSnapshot(r, custom);
              const items = snapshot.items;
              const estimate = estimateSec(items);
              const locked = r.items.filter((i) => i.locked).length;
              return (
                <Card key={r.id} style={[{ gap: 10 }, r.archived && { opacity: 0.6 }]}>
                  <Pressable testID={`routine-${r.id}`} accessibilityRole="button" accessibilityLabel={`Edit routine ${r.name}`} onPress={() => { tap(); router.push({ pathname: '/builder', params: { id: r.id } }); }}>
                    <View style={s.rHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.rTitle, { color: c.foreground }]}>{r.name}</Text>
                        <Text style={[s.rMeta, { color: c.mutedForeground }]}>
                          {r.items.length} activities · {errors.length ? 'Targets need review' : minutesLabel(estimate)}{r.contentImport ? ' · externally imported, unverified' : ''}{locked ? ` · ${locked} locked` : ''} · v{r.version}{r.archived ? ' · archived' : ''}
                        </Text>
                      </View>
                      <Feather name="edit-3" size={18} color={c.mutedForeground} />
                    </View>
                    <Text style={[s.rMoves, { color: c.foreground }]} numberOfLines={2}>{items.map((i) => i.name).join(' · ')}</Text>
                    {errors.length ? <Text style={[s.blocked, { color: c.destructive }]} numberOfLines={2}>{errors[0]}</Text> : null}
                  </Pressable>
                  <View style={{ gap: 6 }}>
                    {!r.archived ? (
                      <View style={s.actions}>
                        <Button testID={`schedule-${r.id}`} compact icon="calendar" label="Schedule" onPress={() => router.push({ pathname: '/schedule-add', params: { routineId: r.id } })} style={{ flex: 1 }} />
                        <Button compact icon={state.active ? 'play' : errors.length ? 'edit-2' : 'play'} label={state.active ? 'Resume' : errors.length ? 'Fix targets' : 'Start now'} onPress={() => errors.length && !state.active ? router.push({ pathname: '/builder', params: { id: r.id } }) : startRoutine(r)} style={{ flex: 1 }} />
                      </View>
                    ) : null}
                    <View style={[s.actions, { justifyContent: 'flex-end' }]}>
                      <IconButton testID={`export-routine-${r.id}`} icon="upload" label={`Export ${r.name}`} onPress={() => router.push({ pathname: '/content-exchange', params: { routineId: r.id } })} />
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
                  </View>
                </Card>
              );
            })
          )}
        </View>
      )}
      {(tab === 'personal' || tab === 'routines') && (archivedCount || showArchived) ? (
        <Pressable testID="library-toggle-archived" accessibilityRole="button" accessibilityLabel={showArchived ? 'Hide archived items' : `Show archived items, ${archivedCount}`} onPress={() => { tap(); setShowArchived(!showArchived); }} style={{ marginTop: 18, alignSelf: 'center' }} hitSlop={8}>
          <Text style={[s.link, { color: c.mutedForeground }]}>{showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}</Text>
        </Pressable>
      ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const s = StyleSheet.create({
  appBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  appBarEyebrow: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  appBarTitle: { fontFamily: fonts.display, fontSize: 27, lineHeight: 33, letterSpacing: -0.7, flexShrink: 1 },
  longAppBarTitle: { fontSize: 22, lineHeight: 27, letterSpacing: -0.4 },
  compactAppBarTitle: { fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  rHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rTitle: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.5 },
  rMeta: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  rMoves: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, marginTop: 8 },
  blocked: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: fonts.bodyMedium, fontSize: 13, textDecorationLine: 'underline' },
  savedStatus: { fontFamily: fonts.bodySemi, fontSize: 11 },
});
