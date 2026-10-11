import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '@workspace/activity-catalog';
import { activityTypeSchema, equipmentSchema, jointSchema } from '@workspace/activity-catalog';
import { ActivityDetails } from '@/components/ActivityDetails';
import { Button, Card, IconButton } from '@/components/ui';
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
    return next;
  };
  const [filters, setFilters] = useState<CatalogSearchFilters>(initialFilters);
  const [query, setQuery] = useState('');
  const [browseAll, setBrowseAll] = useState(!!disciplineParam || !!equipmentParam || !!jointParam);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCatalogStatus, setShowCatalogStatus] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);
  const { repository, state: catalogState } = useCatalog();
  const tempo = useTempo();
  const allActivities = catalogState.release.activities;
  const results = useMemo(() => searchCatalog(allActivities, filters, query), [allActivities, filters, query]);
  const showResults = browseAll || !!query.trim() || activeCount(filters) > 0;
  const saved = (activity: Activity) => tempo.state.savedActivities.some(item => item.id === activity.id);
  const toggleSaved = (activity: Activity) => tempo.setActivitySaved(activity.id, !saved(activity));
  const clearAllFilters = () => setFilters(emptyCatalogSearchFilters());
  const setFacet = <K extends keyof CatalogSearchFilters>(facet: K, value: CatalogSearchFilters[K]) =>
    setFilters(current => ({ ...current, [facet]: value }));
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
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.border }]}>
        <View style={styles.searchRow}>
          <IconButton testID="catalog-search-back" icon="arrow-left" label="Back to Library" onPress={() => router.back()} />
          <View style={[styles.inputShell, { backgroundColor: c.card, borderColor: c.border }]}>
            <Feather name="search" size={18} color={c.mutedForeground} />
            <TextInput
              testID="catalog-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder="Search names, Sanskrit, aliases…"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
              accessibilityLabel="Search shared catalog"
            />
            {query ? <Pressable testID="catalog-search-clear" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={18} color={c.mutedForeground} />
            </Pressable> : null}
          </View>
          <Pressable
            testID="catalog-search-filter-button"
            accessibilityRole="button"
            accessibilityLabel={`Filters${activeCount(filters) ? `, ${activeCount(filters)} active` : ''}`}
            onPress={() => { Keyboard.dismiss(); setSheetOpen(true); }}
            style={({ pressed }) => [styles.filterButton, { backgroundColor: activeCount(filters) ? c.accent : c.muted, opacity: pressed ? 0.82 : 1 }]}
          >
            <Feather name="sliders" size={18} color={activeCount(filters) ? c.accentForeground : c.foreground} />
            {activeCount(filters) > 0 ? <Text style={[styles.filterCount, { color: c.accentForeground }]}>{activeCount(filters)}</Text> : null}
          </Pressable>
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
            {catalogState.error ? ` · ${updateErrorSummary(catalogState.error)}` : ''}
          </Text>
          <Feather name={showCatalogStatus ? 'chevron-up' : 'chevron-down'} size={14} color={c.mutedForeground} />
        </Pressable>
        <Button
          testID="catalog-search-refresh"
          compact
          variant="ghost"
          icon="refresh-cw"
          label={catalogState.checking ? 'Checking…' : 'Refresh'}
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
          {catalogState.error ? <Text testID="catalog-search-error" accessibilityRole="alert" style={[styles.statusText, { color: c.destructive }]}>{catalogState.error}</Text> : null}
        </Card>
      ) : null}

      {showResults ? (
        <>
          <View style={styles.resultSummary}>
            <Text testID="catalog-search-results" style={[styles.summaryText, { color: c.mutedForeground }]}>
              {results.length} {results.length === 1 ? 'activity' : 'activities'}
            </Text>
            {activeCount(filters) > 0 ? <Pressable onPress={clearAllFilters} hitSlop={8}>
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
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: insets.bottom + 28, gap: 9, flexGrow: results.length ? 0 : 1 }}
            ListEmptyComponent={
              <Card style={styles.emptyCard}>
                <Feather name="search" size={23} color={c.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: c.foreground }]}>No matching activities</Text>
                <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Try a shorter name, clear the search, or remove a filter.</Text>
                {query ? <Button compact variant="soft" icon="x" label="Clear search" onPress={() => setQuery('')} /> : null}
                {activeCount(filters) ? <Button compact variant="ghost" label="Clear filters" onPress={clearAllFilters} /> : null}
              </Card>
            }
            renderItem={({ item }) => <CatalogResultRow activity={item} saved={saved(item)} onOpen={() => { Keyboard.dismiss(); setSelected(item); }} onToggleSaved={() => toggleSaved(item)} />}
          />
        </>
      ) : (
        <View style={styles.promptWrap}>
          <View style={[styles.promptIcon, { backgroundColor: c.secondary }]}>
            <Feather name="search" size={25} color={c.secondaryForeground} />
          </View>
          <Text style={[styles.promptTitle, { color: c.foreground }]}>Find an activity</Text>
          <Text style={[styles.promptBody, { color: c.mutedForeground }]}>Search by name, English or Sanskrit name, or alias. Browse the shared catalog when you’re ready.</Text>
          <Button testID="catalog-browse-all" icon="grid" label="Browse all activities" onPress={() => setBrowseAll(true)} />
        </View>
      )}

      {sheetOpen ? (
        <CatalogFilterSheet
          visible
          activities={allActivities}
          filters={filters}
          query={query}
          onApply={next => { setFilters(next); setBrowseAll(true); setSheetOpen(false); }}
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

function CatalogResultRow({ activity, saved, onOpen, onToggleSaved }: { activity: Activity; saved: boolean; onOpen: () => void; onToggleSaved: () => void }) {
  const c = useColors();
  const subtitle = [activity.englishName !== activity.name ? activity.englishName : null, activity.sanskritName && activity.sanskritName !== activity.name ? activity.sanskritName : null]
    .filter(Boolean).join(' · ');
  return (
    <Card style={styles.resultCard}>
      <Pressable testID={`catalog-result-${activity.id}`} accessibilityRole="button" onPress={onOpen} style={styles.resultMain}>
        <View style={[styles.typeIcon, { backgroundColor: activity.type === 'sequence' ? c.secondary : c.muted }]}>
          <Feather name={activity.type === 'sequence' ? 'layers' : 'activity'} size={19} color={activity.type === 'sequence' ? c.secondaryForeground : c.foreground} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.resultName, { color: c.foreground }]}>{activity.name}</Text>
          {subtitle ? <Text style={[styles.resultSubtitle, { color: c.mutedForeground }]} numberOfLines={2}>{subtitle}</Text> : null}
          <Text style={[styles.resultMeta, { color: c.mutedForeground }]} numberOfLines={2}>
            Shared catalog · {activity.type === 'sequence' ? 'Sequence' : 'Single activity'} · {typeLabel(activity.type)} · {activity.discipline} · {activity.reviewStatus}
            {activity.family === 'cars' ? ' · CARs' : ''}
            {activity.instructionNeeded ? ' · Instruction recommended' : ''}
          </Text>
          <Text style={[styles.resultTag, { color: c.mutedForeground }]} numberOfLines={1}>
            {activity.equipment === null ? 'Equipment unknown' : `Equipment: ${activity.equipment.map(item => item === 'none' ? 'none' : GEAR_LABEL[item]).join(', ') || 'not applicable'}`}
            {' · '}{activity.difficulty === 'unknown' ? 'Difficulty unknown' : activity.difficulty}
            {' · '}{activity.supportedMetrics.join(', ')}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={c.mutedForeground} />
      </Pressable>
      <Pressable
        testID={`catalog-quick-save-${activity.id}`}
        accessibilityRole="button"
        accessibilityLabel={saved ? `Saved ${activity.name}; remove bookmark` : `Save ${activity.name}`}
        onPress={onToggleSaved}
        style={[styles.quickSave, { borderTopColor: c.border }]}
      >
        <Feather name={saved ? 'bookmark' : 'bookmark'} size={15} color={saved ? c.primary : c.mutedForeground} />
        <Text style={[styles.quickSaveText, { color: saved ? c.primary : c.mutedForeground }]}>{saved ? 'Saved' : 'Save'}</Text>
      </Pressable>
    </Card>
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
  inputShell: { flex: 1, minWidth: 0, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 15, paddingVertical: 0 },
  filterButton: { height: 44, minWidth: 44, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  filterCount: { fontFamily: fonts.bodySemi, fontSize: 12 },
  activeChips: { gap: 7, paddingTop: 9, paddingBottom: 1, paddingHorizontal: 1 },
  activeChip: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeChipText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  catalogStatus: { minHeight: 42, borderBottomWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 5 },
  catalogStatusSummary: { flex: 1, minWidth: 0, minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7 },
  catalogStatusDetails: { marginHorizontal: 20, marginTop: 8, gap: 6, padding: 12 },
  statusText: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  resultSummary: { minHeight: 42, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  clearLink: { fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: 'underline' },
  resultCard: { padding: 0, overflow: 'hidden' },
  resultMain: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingTop: 13, paddingBottom: 11 },
  typeIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultName: { fontFamily: fonts.bodySemi, fontSize: 14.5 },
  resultSubtitle: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17 },
  resultMeta: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  resultTag: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  quickSave: { minHeight: 37, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingHorizontal: 14 },
  quickSaveText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  emptyCard: { alignItems: 'center', gap: 9, padding: 20, marginTop: 14 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 19 },
  emptyText: { fontFamily: fonts.body, textAlign: 'center', fontSize: 13, lineHeight: 19, marginBottom: 3 },
  promptWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 13, paddingBottom: 40 },
  promptIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  promptTitle: { fontFamily: fonts.display, fontSize: 23 },
  promptBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 7 },
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
