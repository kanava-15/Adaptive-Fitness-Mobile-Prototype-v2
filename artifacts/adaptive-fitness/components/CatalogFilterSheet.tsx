import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activityTypeSchema, equipmentSchema, jointSchema, muscleSchema, type Activity } from '@workspace/activity-catalog';
import { AREAS, AREA_LABEL, CatalogSearchFilters, catalogFacetCount, DISCIPLINES, DISCIPLINE_LABEL, GEAR_LABEL, searchCatalog } from '@/lib/domain';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { Button, IconButton } from '@/components/ui';

type Props = {
  visible: boolean;
  activities: Activity[];
  filters: CatalogSearchFilters;
  query: string;
  onApply: (filters: CatalogSearchFilters) => void;
  onCancel: () => void;
};

const difficulties: Activity['difficulty'][] = ['beginner', 'intermediate', 'advanced', 'unknown'];
const families: Activity['family'][] = ['general', 'ashtanga-vinyasa', 'cars'];
const metrics: Activity['supportedMetrics'][number][] = ['reps', 'duration', 'breaths', 'distance'];
const titleCase = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const facetLabels: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', unknown: 'Unknown',
  general: 'General', 'ashtanga-vinyasa': 'Ashtanga vinyasa', cars: 'CARs',
  reps: 'Reps', duration: 'Duration', breaths: 'Breaths', distance: 'Distance',
};

export function CatalogFilterSheet({ visible, activities, filters, query, onApply, onCancel }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState(filters);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const shownCount = searchCatalog(activities, draft, query).length;
  const sheetHeight = Math.min(windowHeight * 0.82, windowHeight - insets.top - 20);

  const toggleDiscipline = (discipline: Activity['discipline']) => setDraft(current => ({
    ...current,
    discipline: current.discipline.includes(discipline)
      ? current.discipline.filter(item => item !== discipline)
      : [...current.discipline, discipline],
  }));
  const select = (facet: Exclude<keyof CatalogSearchFilters, 'discipline'>, value: string) => setDraft(current => ({
    ...current,
    [facet]: current[facet] === value ? null : value,
  }));
  const clearAll = () => setDraft({
    discipline: [], equipment: null, difficulty: null, area: null, muscle: null,
    joint: null, type: null, family: null, metric: null,
  });

  const option = (label: string, facet: keyof CatalogSearchFilters, value: string, selected: boolean, onPress: () => void) => {
    const count = catalogFacetCount(activities, draft, facet, value, query);
    return (
      <Pressable
        key={value}
        testID={`filter-${facet}-${value}`}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: count === 0 && !selected }}
        accessibilityLabel={`${label}, ${count} results${count === 0 && !selected ? ', unavailable' : ''}`}
        disabled={count === 0 && !selected}
        onPress={onPress}
        style={({ pressed }) => [
          styles.option,
          { backgroundColor: selected ? c.accent : c.card, borderColor: selected ? c.accent : c.border, opacity: count === 0 && !selected ? 0.38 : pressed ? 0.82 : 1 },
        ]}
      >
        <Text style={[styles.optionText, { color: selected ? c.accentForeground : c.foreground }]}>{label}</Text>
        <Text style={[styles.optionCount, { color: selected ? c.accentForeground : c.mutedForeground }]}>{count}</Text>
      </Pressable>
    );
  };
  const chips = <T extends string>(values: readonly T[], facet: keyof CatalogSearchFilters, selected: T | null, label: (value: T) => string) => (
    <View style={styles.options}>
      {values.map(value => option(label(value), facet, value, selected === value, () => select(facet as Exclude<keyof CatalogSearchFilters, 'discipline'>, value)))}
    </View>
  );
  const section = (title: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.foreground }]}>{title}</Text>
      {content}
    </View>
  );
  const accordion = (id: string, title: string, content: React.ReactNode, active: boolean) => (
    <View style={[styles.accordion, { borderColor: c.border }]}>
      <Pressable
        testID={`filter-accordion-${id}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!expanded[id] }}
        onPress={() => setExpanded(current => ({ ...current, [id]: !current[id] }))}
        style={styles.accordionHeader}
      >
        <Text style={[styles.sectionTitle, { color: c.foreground, flex: 1 }]}>{title}</Text>
        {active ? <View style={[styles.activeDot, { backgroundColor: c.primary }]} /> : null}
        <Feather name={expanded[id] ? 'chevron-up' : 'chevron-down'} size={18} color={c.mutedForeground} />
      </Pressable>
      {expanded[id] ? <View style={{ paddingBottom: 14 }}>{content}</View> : null}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Dismiss filters" onPress={onCancel} style={StyleSheet.absoluteFill} />
        <View style={[styles.sheet, { height: sheetHeight, backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.title, { color: c.foreground }]}>Filters</Text>
            <Pressable testID="filter-clear-all" accessibilityRole="button" onPress={clearAll} hitSlop={8}>
              <Text style={[styles.clear, { color: c.primary }]}>Clear All</Text>
            </Pressable>
            <IconButton icon="x" label="Cancel filters" onPress={onCancel} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {section('Discipline', <View style={styles.options}>
              {DISCIPLINES.map(discipline => option(DISCIPLINE_LABEL[discipline], 'discipline', discipline, draft.discipline.includes(discipline), () => toggleDiscipline(discipline)))}
            </View>)}
            {section('Equipment', chips(equipmentSchema.options, 'equipment', draft.equipment, value => value === 'none' ? 'No equipment' : GEAR_LABEL[value]))}
            {section('Difficulty', chips(difficulties, 'difficulty', draft.difficulty, value => facetLabels[value]))}
            {accordion('area', 'Movement area', chips(AREAS, 'area', draft.area, value => AREA_LABEL[value]), !!draft.area)}
            {accordion('muscle', 'Muscles', chips(muscleSchema.options, 'muscle', draft.muscle, titleCase), !!draft.muscle)}
            {accordion('joint', 'Joints', chips(jointSchema.options, 'joint', draft.joint, titleCase), !!draft.joint)}
            {accordion('type', 'Activity type', chips(activityTypeSchema.options, 'type', draft.type, titleCase), !!draft.type)}
            {accordion('family', 'Family', chips(families, 'family', draft.family, value => facetLabels[value]), !!draft.family)}
            {accordion('metric', 'Supported measurements', chips(metrics, 'metric', draft.metric, value => facetLabels[value]), !!draft.metric)}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
            <Button testID="filter-show-results" label={`Show ${shownCount} ${shownCount === 1 ? 'result' : 'results'}`} onPress={() => onApply(draft)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12, 18, 15, 0.42)' },
  sheet: { width: '100%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 23 },
  clear: { fontFamily: fonts.bodySemi, fontSize: 14 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: fonts.bodySemi, fontSize: 14 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12 },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  optionCount: { fontFamily: fonts.body, fontSize: 11 },
  accordion: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
