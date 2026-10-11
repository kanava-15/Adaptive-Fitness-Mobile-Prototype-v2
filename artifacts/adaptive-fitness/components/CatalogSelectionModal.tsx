import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityDetails } from '@/components/ActivityDetails';
import { CatalogFilterSheet } from '@/components/CatalogFilterSheet';
import { Button, Chip, IconButton, notify } from '@/components/ui';
import { useCatalog } from '@/context/CatalogContext';
import { useTempo } from '@/context/TempoContext';
import { fonts } from '@/constants/colors';
import {
  CatalogSearchFilters,
  ExerciseDef,
  ExerciseLibrarySource,
  activityDef,
  emptyCatalogSearchFilters,
  exerciseSourceLabel,
  findExercise,
  knowledgeOf,
  personalCatalog,
  searchCatalog,
  searchLibrary,
} from '@/lib/domain';
import { useColors } from '@/hooks/useColors';
import { ExerciseRow } from './planner';

type Source = ExerciseLibrarySource | 'saved';
type Selection = { key: string; definition: ExerciseDef };
type Props = {
  visible: boolean;
  custom: ExerciseDef[];
  onClose: () => void;
  onConfirm: (selected: ExerciseDef[]) => void;
};

const sources: { value: Source; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'shared', label: 'Shared' },
  { value: 'saved', label: 'Saved' },
  { value: 'local', label: 'Custom' },
  { value: 'legacy', label: 'Legacy' },
];
const activeFilterCount = (filters: CatalogSearchFilters) =>
  filters.discipline.length + [filters.equipment, filters.difficulty, filters.area, filters.muscle, filters.joint, filters.type, filters.family, filters.metric].filter(Boolean).length;

export function CatalogSelectionModal({ visible, custom, onClose, onConfirm }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const tempo = useTempo();
  const catalog = useCatalog();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CatalogSearchFilters>(emptyCatalogSearchFilters);
  const [filterSheet, setFilterSheet] = useState(false);
  const [source, setSource] = useState<Source>('all');
  const [selection, setSelection] = useState<Selection[]>([]);
  const [detail, setDetail] = useState<ExerciseDef | null>(null);
  const savedDefinitions = useMemo(() => tempo.state.savedActivities.map(saved => ({
    ...activityDef(saved.fallback),
    sequenceMembers: saved.sequenceMembers,
  })), [tempo.state.savedActivities]);
  const detailRelease = useMemo(
    () => personalCatalog([...custom, ...savedDefinitions]),
    [custom, savedDefinitions, catalog.state.release],
  );
  const results = useMemo(() => {
    const libraryFilter = {
      query,
      discipline: filters.discipline.length === 1 ? filters.discipline[0] : null,
      gear: filters.equipment,
      area: filters.area,
      tracking: filters.metric === 'duration' ? 'time' as const : filters.metric,
      type: filters.type,
      muscle: filters.muscle,
      joint: filters.joint,
      difficulty: filters.difficulty,
    };
    const matchesSaved = () => savedDefinitions.filter(definition =>
      searchLibrary([definition], { ...libraryFilter, source: 'all' }).some(result => result.id === definition.id));
    const shared = searchCatalog(catalog.state.release.activities, filters, query).map(activityDef);
    const local = searchLibrary(custom, { ...libraryFilter, source: 'local' })
      .filter(definition => !filters.discipline.length || filters.discipline.includes(definition.discipline as never));
    const legacy = searchLibrary(custom, { ...libraryFilter, source: 'legacy' })
      .filter(definition => !filters.discipline.length || filters.discipline.includes(definition.discipline as never));
    const savedMatches = matchesSaved();
    const byId = new Map<string, ExerciseDef>();
    const add = (items: ExerciseDef[]) => items.forEach(item => { if (!byId.has(item.id)) byId.set(item.id, item); });
    if (source === 'shared') add(shared);
    else if (source === 'saved') add(savedMatches);
    else if (source === 'local') add(local);
    else if (source === 'legacy') add(legacy);
    else {
      add(shared);
      add(local);
      add(legacy);
      add(savedMatches);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog.state.release.activities, custom, filters, query, savedDefinitions, source]);
  const saved = (definition: ExerciseDef) => tempo.state.savedActivities.some(item => item.id === definition.id);
  const canBookmark = (definition: ExerciseDef) =>
    !!definition.activity && catalog.state.release.activities.some(item => item.id === definition.id);
  const append = (definition: ExerciseDef) =>
    setSelection(items => [...items, { key: `${Date.now()}-${Math.random()}`, definition }]);
  const close = () => {
    setSelection([]);
    setDetail(null);
    onClose();
  };
  const confirmSelection = () => {
    if (!selection.length) return;
    const definitions = selection.map(item => item.definition);
    onConfirm(definitions);
    setSelection([]);
    setDetail(null);
  };
  const toggleSaved = (definition: ExerciseDef) => {
    if (!canBookmark(definition)) return;
    tempo.setActivitySaved(definition.id, !saved(definition));
  };
  const inQueue = (definition: ExerciseDef) => selection.some(item => item.definition.id === definition.id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 24) : insets.top + 8, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.foreground }]}>Select activities</Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>Search and filter activities; each selection is queued in order.</Text>
          </View>
          <IconButton testID="selection-close" icon="x" label="Cancel selection" onPress={close} />
        </View>
        {detail ? (
          <>
            <View style={styles.detailNav}>
              <IconButton icon="arrow-left" label="Back to selection results" onPress={() => setDetail(null)} />
              <Text style={[styles.detailTitle, { color: c.foreground }]} numberOfLines={1}>{detail.name}</Text>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 24 }}>
              <ActivityDetails activity={knowledgeOf(detail)} release={detailRelease} onOpenRelated={id => {
                const related = results.find(item => item.id === id) ?? findExercise([...custom, ...savedDefinitions], id);
                if (related) setDetail(related);
                else notify('Activity unavailable', 'This related activity is not available in the current library.');
              }} />
            </ScrollView>
            <View style={[styles.detailFooter, { borderTopColor: c.border, backgroundColor: c.background }]}>
              <Button testID="selection-detail-add" label={detail.activity?.type === 'sequence' ? 'Select sequence' : 'Select activity'} icon="plus" onPress={() => { append(detail); setDetail(null); }} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.searchRow}>
              <View style={[styles.searchInput, { backgroundColor: c.card, borderColor: c.border }]}>
                <Feather name="search" size={18} color={c.mutedForeground} />
                <TextInput
                  testID="selection-search"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search names, Sanskrit, aliases…"
                  placeholderTextColor={c.mutedForeground}
                  style={[styles.searchText, { color: c.foreground }]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={Keyboard.dismiss}
                  accessibilityLabel="Search activities to select"
                />
                {query ? <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}><Feather name="x-circle" size={18} color={c.mutedForeground} /></Pressable> : null}
              </View>
              <Pressable
                testID="selection-filter-button"
                accessibilityRole="button"
                accessibilityLabel={`Filters${activeFilterCount(filters) ? `, ${activeFilterCount(filters)} active` : ''}`}
                onPress={() => { Keyboard.dismiss(); setFilterSheet(true); }}
                style={[styles.filterButton, { backgroundColor: activeFilterCount(filters) ? c.accent : c.muted }]}
              >
                <Feather name="sliders" size={18} color={activeFilterCount(filters) ? c.accentForeground : c.foreground} />
                {activeFilterCount(filters) ? <Text style={[styles.actionText, { color: c.accentForeground }]}>{activeFilterCount(filters)}</Text> : null}
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sources}>
              {sources.map(item => (
                <Chip key={item.value} testID={`selection-source-${item.value}`} label={item.label} active={source === item.value} onPress={() => setSource(item.value)} />
              ))}
            </ScrollView>
            <View style={styles.resultLine}>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>{results.length} results · {selection.length} selected</Text>
              {activeFilterCount(filters) ? <Pressable onPress={() => setFilters(emptyCatalogSearchFilters())} accessibilityRole="button">
                <Text style={[styles.clear, { color: c.primary }]}>Clear filters</Text>
              </Pressable> : null}
              {selection.length ? <Pressable testID="selection-clear" onPress={() => setSelection([])} accessibilityRole="button">
                <Text style={[styles.clear, { color: c.primary }]}>Clear selections</Text>
              </Pressable> : null}
            </View>
            {selection.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queue}>
                {selection.map((item, index) => (
                  <Pressable key={item.key} testID={`selection-queued-${index}`} accessibilityRole="button" accessibilityLabel={`Remove selection ${index + 1}, ${item.definition.name}`} onPress={() => setSelection(current => current.filter(entry => entry.key !== item.key))} style={[styles.queueItem, { backgroundColor: c.accent, borderColor: c.accent }]}>
                    <Text numberOfLines={1} style={[styles.queueText, { color: c.accentForeground }]}>{index + 1}. {item.definition.name}</Text>
                    <Feather name="x" size={14} color={c.accentForeground} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <FlatList
              testID="selection-results"
              style={{ flex: 1, marginTop: 8 }}
              data={results}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              scrollEnabled={results.length > 0}
              contentContainerStyle={{ gap: 8, paddingBottom: 12, flexGrow: results.length ? 0 : 1 }}
              ListEmptyComponent={<Text style={[styles.empty, { color: c.mutedForeground }]}>No matches. Change the source or clear a filter.</Text>}
              renderItem={({ item }) => (
                <View style={styles.result}>
                  <ExerciseRow testID={`selection-result-${item.id}`} e={item} onPress={() => setDetail(item)} right={<Feather name="info" size={18} color={c.mutedForeground} />} />
                  <View style={styles.rowActions}>
                    <Pressable testID={`selection-add-${item.id}`} accessibilityRole="button" accessibilityLabel={`${inQueue(item) ? 'Add another' : 'Select'} ${item.name}`} onPress={() => append(item)} style={[styles.action, { borderColor: c.primary }]}>
                      <Feather name="plus" size={14} color={c.primary} />
                      <Text style={[styles.actionText, { color: c.primary }]}>{inQueue(item) ? 'Add again' : 'Select'}</Text>
                    </Pressable>
                    {canBookmark(item) ? (
                      <Pressable testID={`selection-save-${item.id}`} accessibilityRole="button" accessibilityLabel={saved(item) ? `Saved ${item.name}; remove bookmark` : `Save ${item.name}`} onPress={() => toggleSaved(item)} style={[styles.action, { borderColor: c.border }]}>
                        <Feather name="bookmark" size={14} color={saved(item) ? c.primary : c.mutedForeground} />
                        <Text style={[styles.actionText, { color: saved(item) ? c.primary : c.mutedForeground }]}>{saved(item) ? 'Saved' : 'Save'}</Text>
                      </Pressable>
                    ) : null}
                    <Text style={[styles.sourceLabel, { color: c.mutedForeground }]}>{exerciseSourceLabel(item)}</Text>
                  </View>
                </View>
              )}
            />
            {filterSheet ? <CatalogFilterSheet
              visible
              activities={catalog.state.release.activities}
              filters={filters}
              query={query}
              onApply={next => { setFilters(next); setFilterSheet(false); }}
              onCancel={() => setFilterSheet(false)}
            /> : null}
            <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
              <Button testID="selection-cancel" label="Cancel" variant="ghost" onPress={close} style={{ flex: 1 }} />
              <Button testID="selection-confirm" label={`Add ${selection.length} selection${selection.length === 1 ? '' : 's'}`} icon="plus" disabled={!selection.length} onPress={confirmSelection} style={{ flex: 1.5 }} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  searchInput: { flex: 1, minWidth: 0, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12 },
  searchText: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 15, paddingVertical: 0 },
  filterButton: { height: 44, minWidth: 44, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  sources: { gap: 7, paddingVertical: 10, paddingRight: 8 },
  resultLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  clear: { fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: 'underline' },
  queue: { gap: 7, paddingVertical: 8 },
  queueItem: { minHeight: 36, maxWidth: 220, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  queueText: { fontFamily: fonts.bodySemi, fontSize: 12, flexShrink: 1 },
  result: { gap: 0 },
  rowActions: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  action: { minHeight: 36, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  sourceLabel: { flex: 1, textAlign: 'right', fontFamily: fonts.body, fontSize: 10, lineHeight: 13 },
  empty: { textAlign: 'center', marginTop: 28, fontFamily: fonts.body, fontSize: 14 },
  detailNav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  detailTitle: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16 },
  detailFooter: { paddingVertical: 10, borderTopWidth: 1 },
  footer: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
});
