import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '@workspace/activity-catalog';
import { activityTypeSchema, equipmentSchema, jointSchema } from '@workspace/activity-catalog';
import { ActivityDetails } from '@/components/ActivityDetails';
import { Button, Card, IconButton, useTopInset } from '@/components/ui';
import { CatalogResultCard } from '@/components/CatalogResultCard';
import { normalizeExploreFilters } from '@/lib/catalog-explore';
import { CatalogFilterSheet } from '@/components/CatalogFilterSheet';
import { useCatalog } from '@/context/CatalogContext';
import { useTempo } from '@/context/TempoContext';
import { fonts } from '@/constants/colors';
import {
  AREA_LABEL, ActualSet, CatalogSearchFilters, CompletionV2, DISCIPLINE_LABEL, GEAR_LABEL, Gear, emptyCatalogSearchFilters,
  searchCatalog,
} from '@/lib/domain';
import { useColors } from '@/hooks/useColors';

const typeLabel = (type: Activity['type']) => activityTypeSchema.options.includes(type) ? type.replaceAll('-', ' ') : type;
const updateErrorSummary = (error: string) => {
  const status = error.match(/HTTP\s+(\d{3})/i)?.[1];
  return `Update check failed${status ? ` (HTTP ${status})` : ''}. Offline catalog remains available.`;
};
const activeCount = (f: CatalogSearchFilters) =>
  f.discipline.length + [f.equipment, f.difficulty, f.area, f.muscle, f.joint, f.type, f.family, f.metric].filter(Boolean).length;

export default function CatalogSearchScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const params = useLocalSearchParams<{
    discipline?: string | string[];
    equipment?: string | string[];
    joint?: string | string[];
    activityId?: string | string[];
  }>();
  const disciplineParam = Array.isArray(params.discipline) ? params.discipline[0] : params.discipline;
  const equipmentParam = Array.isArray(params.equipment) ? params.equipment[0] : params.equipment;
  const jointParam = Array.isArray(params.joint) ? params.joint[0] : params.joint;
  const activityIdParam = Array.isArray(params.activityId) ? params.activityId[0] : params.activityId;
  const initialFilters = (): CatalogSearchFilters => {
    const next = emptyCatalogSearchFilters();
    if (disciplineParam && ['yoga', 'mobility', 'strength', 'conditioning', 'sports'].includes(disciplineParam)) {
      next.discipline = [disciplineParam as Activity['discipline']];
    }
    if (equipmentParam && equipmentSchema.options.includes(equipmentParam as Gear)) {
      next.equipment = equipmentParam as Gear;
    }
    if (jointParam && jointSchema.options.includes(jointParam as NonNullable<Activity['joints']>[number])) {
      next.joint = jointParam;
    }
    return normalizeExploreFilters(next);
  };
  const [filters, setFilters] = useState<CatalogSearchFilters>(initialFilters);
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCatalogStatus, setShowCatalogStatus] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);
  const { repository, state: catalogState } = useCatalog();
  const tempo = useTempo();
  const allActivities = catalogState.release.activities;
  const results = useMemo(() => searchCatalog(allActivities, filters, query), [allActivities, filters, query]);
  const saved = (activity: Activity) => tempo.state.savedActivities.some(item => item.id === activity.id);
  const toggleSaved = (activity: Activity) => tempo.setActivitySaved(activity.id, !saved(activity));
  const clearAllFilters = () => setFilters(emptyCatalogSearchFilters());
  const setFacet = <K extends keyof CatalogSearchFilters>(facet: K, value: CatalogSearchFilters[K]) =>
    setFilters(current => normalizeExploreFilters({ ...current, [facet]: value }));
  const quick = (d: Activity['discipline'] | null) => setFilters(current => normalizeExploreFilters({ ...current, discipline: d ? [d] : [] }));
  useEffect(() => {
    if (!activityIdParam) return;
    const activity = allActivities.find(item => item.id === activityIdParam);
    if (activity) setSelected(activity);
  }, [activityIdParam, allActivities]);

  const filterChips: { key: keyof CatalogSearchFilters; value: string; label: string }[] = [
    ...filters.discipline.map(value => ({ key: 'discipline' as const, value, label: DISCIPLINE_LABEL[value] })),
    ...(filters.equipment ? [{ key: 'equipment' as const, value: filters.equipment, label: filters.equipment === 'none' ? 'No equipment' : GEAR_LABEL[filters.equipment] }] : []),
    ...(filters.difficulty ? [{ key: 'difficulty' as const, value: filters.difficulty, label: `Difficulty: ${filters.difficulty}` }] : []),
    ...(filters.area ? [{ key: 'area' as const, value: filters.area, label: `Area: ${AREA_LABEL[filters.area]}` }] : []),
    ...(filters.muscle ? [{ key: 'muscle' as const, value: filters.muscle, label: `Muscle: ${filters.muscle.replaceAll('-', ' ')}` }] : []),
    ...(filters.joint ? [{ key: 'joint' as const, value: filters.joint, label: `Joint: ${filters.joint.replaceAll('-', ' ')}` }] : []),
    ...(filters.type ? [{ key: 'type' as const, value: filters.type, label: `Type: ${filters.type.replaceAll('-', ' ')}` }] : []),
    ...(filters.family ? [{ key: 'family' as const, value: filters.family, label: `Family: ${filters.family.replaceAll('-', ' ')}` }] : []),
    ...(filters.metric ? [{ key: 'metric' as const, value: filters.metric, label: `Measures: ${filters.metric}` }] : []),
  ];

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: c.background }]} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: c.border }]}>
        <View style={styles.searchRow}>
          <IconButton testID="catalog-search-back" icon="arrow-left" label="Back to Library" onPress={() => router.back()} />
          <View style={[styles.inputShell, { backgroundColor: c.muted, borderColor: c.border }]}>
            <Feather name="search" size={18} color={c.mutedForeground} />
            <TextInput
              testID="catalog-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder="Search activities"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
              accessibilityLabel="Search shared catalog"
            />
            {query ? <Pressable testID="catalog-search-clear" accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clearBtn}>
              <Feather name="x-circle" size={18} color={c.mutedForeground} />
            </Pressable> : null}
          </View>
        </View>
        <View style={styles.searchRow}>
          <Pressable
            testID="catalog-search-filter-button"
            accessibilityRole="button"
            accessibilityLabel={`Filters${activeCount(filters) ? `, ${activeCount(filters)} active` : ''}`}
            onPress={() => { Keyboard.dismiss(); setSheetOpen(true); }}
            style={({ pressed }) => [styles.filterButton, { backgroundColor: activeCount(filters) ? c.accent : c.secondary, opacity: pressed ? 0.82 : 1 }]}
          >
            <Feather name="sliders" size={16} color={activeCount(filters) ? c.accentForeground : c.secondaryForeground} />
            <Text style={[styles.filterLabel, { color: activeCount(filters) ? c.accentForeground : c.secondaryForeground }]}>Filters{activeCount(filters) ? ` · ${activeCount(filters)}` : ''}</Text>
          </Pressable>
        <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.activeChips}>
          {([null, 'strength', 'yoga', 'mobility', 'conditioning', 'sports'] as (Activity['discipline'] | null)[]).map(value => {
            const on = value === null ? filters.discipline.length === 0 : filters.discipline.length === 1 && filters.discipline[0] === value;
            return (
              <Pressable
                key={value ?? 'all'}
                testID={`quick-discipline-${value ?? 'all'}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => quick(value)}
                style={[styles.quick, { backgroundColor: on ? c.accent : c.card, borderColor: on ? c.accent : c.border }]}
              >
                <Text style={[styles.quickText, { color: on ? c.accentForeground : c.foreground }]}>{value === null ? 'All' : value === 'conditioning' ? 'Conditioning' : value === 'mobility' ? 'Mobility' : DISCIPLINE_LABEL[value]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        </View>
        {filterChips.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.activeChips}>
            {filterChips.map(chip => (
              <Pressable
                key={`${chip.key}:${chip.value}`}
                testID={`applied-filter-${chip.key}-${chip.value}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${chip.label} filter`}
                onPress={() => {
                  if (chip.key === 'discipline') setFacet('discipline', filters.discipline.filter(value => value !== chip.value));
                  else setFacet(chip.key, null as never);
                }}
                style={[styles.activeChip, { backgroundColor: c.secondary, borderColor: c.border }]}
              >
                <Text style={[styles.activeChipText, { color: c.secondaryForeground }]}>{chip.label}</Text>
                <Feather name="x" size={14} color={c.secondaryForeground} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={[styles.catalogStatus, { borderBottomColor: c.border }]}>
        <Pressable
          testID="catalog-search-status-toggle"
          accessibilityRole="button"
          accessibilityState={{ expanded: showCatalogStatus }}
          accessibilityLabel={`Catalog status${catalogState.error ? ', update check needs attention' : ''}`}
          onPress={() => setShowCatalogStatus(value => !value)}
          style={styles.catalogStatusSummary}
        >
          <Feather name={catalogState.error ? 'alert-circle' : catalogState.origin === 'network' ? 'check-circle' : 'download-cloud'} size={14} color={catalogState.error ? c.destructive : c.mutedForeground} />
          <Text style={[styles.statusText, { color: c.mutedForeground }]} numberOfLines={2}>
            {catalogState.origin === 'bundled' ? 'Offline catalog available' : catalogState.origin === 'cache' ? 'Saved offline catalog' : 'Catalog ready'}
            {catalogState.checking ? ' · Checking for updates…' : ''}
            {catalogState.error ? ' · Update unavailable' : ''}
          </Text>
          <Feather name={showCatalogStatus ? 'chevron-up' : 'chevron-down'} size={14} color={c.mutedForeground} />
        </Pressable>
        <Button
          testID="catalog-search-refresh"
          compact
          variant="ghost"
          icon="refresh-cw"
          label={catalogState.checking ? 'Checking…' : catalogState.error ? 'Retry' : 'Refresh'}
          disabled={catalogState.checking}
          onPress={() => void repository.refresh()}
        />
      </View>
      {showCatalogStatus ? (
        <Card style={styles.catalogStatusDetails}>
          <Text testID="catalog-search-freshness" style={[styles.statusText, { color: c.mutedForeground }]}>
            {catalogState.release.activities.length} shared activities · {catalogState.release.contentVersion}
            {' · '}{catalogState.origin === 'bundled' ? 'Bundled offline copy' : catalogState.origin === 'cache' ? 'Saved offline copy' : 'Downloaded copy'}
            {' · '}{catalogState.checkedAt ? `Checked ${new Date(catalogState.checkedAt).toLocaleString()}` : 'Not checked for updates'}
          </Text>
          {catalogState.error ? <Text testID="catalog-search-error" accessibilityRole="alert" style={[styles.statusText, { color: c.destructive }]}>{updateErrorSummary(catalogState.error)}</Text> : null}
        </Card>
      ) : null}

      <View style={styles.resultSummary}>
        <Text testID="catalog-search-results" accessibilityLiveRegion="polite" style={[styles.summaryText, { color: c.mutedForeground }]}>
          {results.length} {results.length === 1 ? 'activity' : 'activities'}
        </Text>
        {activeCount(filters) > 0 ? <Pressable testID="catalog-clear-filters" accessibilityRole="button" onPress={clearAllFilters} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[styles.clearLink, { color: c.primary }]}>Clear filters</Text>
        </Pressable> : null}
      </View>
      <FlatList
        testID="catalog-search-list"
        style={{ flex: 1 }}
        data={results}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        windowSize={7}
        scrollEnabled={results.length > 0}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0) + 28, gap: 10, flexGrow: results.length ? 0 : 1 }}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Feather name="search" size={23} color={c.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>No matching activities</Text>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Try a shorter name, clear the search, or remove a filter.</Text>
            {query ? <Button testID="catalog-empty-clear-search" compact variant="soft" icon="x" label="Clear search" onPress={() => setQuery('')} /> : null}
            {activeCount(filters) ? <Button testID="catalog-empty-clear-filters" compact variant="ghost" label="Clear filters" onPress={clearAllFilters} /> : null}
          </Card>
        }
        renderItem={({ item }) => <CatalogResultCard activity={item} saved={saved(item)} onOpen={() => { Keyboard.dismiss(); setSelected(item); }} onToggleSaved={() => toggleSaved(item)} />}
      />

      {sheetOpen ? (
        <CatalogFilterSheet
          visible
          activities={allActivities}
          filters={filters}
          query={query}
          onApply={next => { setFilters(normalizeExploreFilters(next)); setSheetOpen(false); }}
          onCancel={() => setSheetOpen(false)}
        />
      ) : null}
      <ActivityDetailModal activity={selected} onClose={() => setSelected(null)} onSelectRelated={id => {
        const related = allActivities.find(item => item.id === id);
        if (related) setSelected(related);
      }} onToggleSaved={toggleSaved} saved={selected ? saved(selected) : false} />
    </KeyboardAvoidingView>
  );
}

function ActivityDetailModal({ activity, onClose, onSelectRelated, onToggleSaved, saved }: {
  activity: Activity | null;
  onClose: () => void;
  onSelectRelated: (id: string) => void;
  onToggleSaved: (activity: Activity) => void;
  saved: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state: catalog } = useCatalog();
  const tempo = useTempo();
  const [routineChoices, setRoutineChoices] = useState(false);
  if (!activity) return null;
  const history = tempo.state.completions
    .map(completion => ({ completion, log: completion.exercises.find(entry => entry.exerciseId === activity.id) }))
    .filter((item): item is { completion: CompletionV2; log: NonNullable<CompletionV2['exercises'][number]> } => !!item.log)
    .sort((a, b) => b.completion.finishedAt.localeCompare(a.completion.finishedAt));
  const historyLine = (set: ActualSet) => [
    set.reps != null ? `${set.reps} reps` : null,
    set.seconds != null ? `${set.seconds}s` : null,
    set.breaths != null ? `${set.breaths} breaths` : null,
    set.distance != null ? `${set.distance}${set.distanceUnit ? ` ${set.distanceUnit}` : ''}` : null,
    set.load != null ? `${set.load} ${set.unit ?? ''}`.trim() : null,
  ].filter(Boolean).join(' · ') || 'No measured set';

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.detailScreen, { backgroundColor: c.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        <View style={[styles.detailHeader, { borderBottomColor: c.border }]}>
          <IconButton icon="arrow-left" label="Back to search results" onPress={onClose} />
          <Text style={[styles.detailHeaderTitle, { color: c.foreground }]} numberOfLines={1}>{activity.name}</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text testID="catalog-detail-name" style={[styles.detailTitle, { color: c.foreground }]}>{activity.name}</Text>
          <Text style={[styles.resultMeta, { color: c.mutedForeground }]}>{activity.type === 'sequence' ? 'Sequence' : 'Single activity'} · {typeLabel(activity.type)} · {activity.discipline} · {activity.family}</Text>
          <ActivityDetails activity={activity} release={catalog.release} onOpenRelated={onSelectRelated} />
          <Card style={{ gap: 8 }}>
            <Text style={[styles.historyTitle, { color: c.foreground }]}>Your recorded history</Text>
            {history.length ? history.slice(0, 8).map(({ completion, log }) => (
              <View key={`${completion.id}:${log.itemKey}`} style={[styles.historyRow, { borderTopColor: c.border }]}>
                <Text style={[styles.historyDate, { color: c.foreground }]}>{new Date(completion.finishedAt).toLocaleDateString()}</Text>
                <Text style={[styles.resultMeta, { color: c.mutedForeground }]}>
                  {completion.title} · {log.skipped ? 'Skipped' : log.done ? 'Completed' : 'Recorded'}
                </Text>
                {log.sets.length ? <Text style={[styles.resultMeta, { color: c.mutedForeground }]}>{log.sets.map(historyLine).join(' / ')}</Text> : null}
              </View>
            )) : <Text style={[styles.resultMeta, { color: c.mutedForeground }]}>No local history recorded for this catalog identity.</Text>}
          </Card>
          <Button testID={`catalog-save-${activity.id}`} variant="soft" icon="bookmark" label={saved ? 'Saved · remove bookmark' : 'Save to Saved Activities'} onPress={() => onToggleSaved(activity)} />
          {!activity.archived ? (
            <Button testID="catalog-add-routine" label="Add to a routine" icon="plus" onPress={() => setRoutineChoices(true)} />
          ) : null}
        </ScrollView>
        <Modal visible={routineChoices} transparent animationType="slide" onRequestClose={() => setRoutineChoices(false)}>
          <View style={styles.choiceOverlay}>
            <Pressable accessibilityLabel="Dismiss routine choices" onPress={() => setRoutineChoices(false)} style={StyleSheet.absoluteFill} />
            <View style={[styles.choiceSheet, { backgroundColor: c.background, borderColor: c.border, paddingBottom: insets.bottom + 14 }]}>
              <View style={styles.detailHeader}>
                <Text style={[styles.historyTitle, { color: c.foreground, flex: 1 }]}>Choose a routine draft</Text>
                <IconButton icon="x" label="Close routine choices" onPress={() => setRoutineChoices(false)} />
              </View>
              <Text style={[styles.resultMeta, { color: c.mutedForeground }]}>This adds the activity to an editable draft. Nothing is saved until you confirm in the builder.</Text>
              <Button testID="catalog-add-new-routine" label="Start a new routine draft" icon="plus" onPress={() => {
                setRoutineChoices(false);
                onClose();
                router.push({ pathname: '/builder', params: { activityId: activity.id } });
              }} />
              {tempo.state.routines.filter(routine => !routine.archived).map(routine => (
                <Button key={routine.id} testID={`catalog-add-existing-${routine.id}`} variant="soft" label={`Add to “${routine.name}” draft`} icon="layers" onPress={() => {
                  setRoutineChoices(false);
                  onClose();
                  router.push({ pathname: '/builder', params: { id: routine.id, activityId: activity.id } });
                }} />
              ))}
              {!tempo.state.routines.some(routine => !routine.archived) ? <Text style={[styles.resultMeta, { color: c.mutedForeground }]}>No saved routines yet. Start a new draft above.</Text> : null}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 14, paddingBottom: 8, borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputShell: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 24, paddingHorizontal: 14 },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 15, paddingVertical: 0 },
  filterButton: { minHeight: 44, borderRadius: 22, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  filterLabel: { fontFamily: fonts.bodySemi, fontSize: 13 },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  quick: { minHeight: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  activeChips: { gap: 7, paddingTop: 9, paddingBottom: 1, paddingHorizontal: 1 },
  activeChip: { minHeight: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeChipText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  catalogStatus: { minHeight: 42, borderBottomWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 5 },
  catalogStatusSummary: { flex: 1, minWidth: 0, minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7 },
  catalogStatusDetails: { marginHorizontal: 20, marginTop: 8, gap: 6, padding: 12 },
  statusText: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  resultSummary: { minHeight: 42, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  clearLink: { fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: 'underline' },
  resultMeta: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  emptyCard: { alignItems: 'center', gap: 9, padding: 20, marginTop: 14 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 19 },
  emptyText: { fontFamily: fonts.body, textAlign: 'center', fontSize: 13, lineHeight: 19, marginBottom: 3 },
  detailScreen: { flex: 1 },
  detailHeader: { minHeight: 54, borderBottomWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailHeaderTitle: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  detailTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32 },
  historyTitle: { fontFamily: fonts.bodySemi, fontSize: 16 },
  historyRow: { borderTopWidth: 1, paddingTop: 8, gap: 2 },
  historyDate: { fontFamily: fonts.bodySemi, fontSize: 13 },
  choiceOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  choiceSheet: { borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 18, gap: 10 },
});
