import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { Activity } from '@workspace/activity-catalog';
import { DISCIPLINE_LABEL, emptyCatalogSearchFilters, searchCatalog, type CatalogSearchFilters, type Discipline } from '@/lib/domain';
import { useCatalog } from '@/context/CatalogContext';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/colors';
import { Button, Card, IconButton } from '@/components/ui';

const browseDisciplines: { id: Discipline; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'strength', icon: 'activity' },
  { id: 'yoga', icon: 'wind' },
  { id: 'mobility', icon: 'rotate-cw' },
  { id: 'conditioning', icon: 'zap' },
  { id: 'sports', icon: 'target' },
];
const shelfDefinitions = [
  { id: 'no-equipment', title: 'No-equipment activities', facet: 'equipment', value: 'none' },
  { id: 'mat-friendly', title: 'Mat-friendly activities', facet: 'equipment', value: 'mat' },
  { id: 'hip-joint', title: 'Hip-focused activities', facet: 'joint', value: 'hip' },
] as const;

export function CatalogBrowser() {
  const c = useColors();
  const { repository, state } = useCatalog();
  const tempo = useTempo();
  const { width } = useWindowDimensions();
  const [showStatus, setShowStatus] = useState(false);
  const cardWidth = Math.max(168, Math.min(206, width * 0.55));
  const openSearch = (filters: Record<string, string> = {}) => router.push({
    pathname: '/catalog-search',
    params: filters,
  });
  const activities = state.release.activities;
  const shelves = shelfDefinitions
    .map(definition => {
      const filters = { ...emptyCatalogSearchFilters(), [definition.facet]: definition.value } as CatalogSearchFilters;
      return { ...definition, filters, activities: searchCatalog(activities, filters) };
    })
    .filter(shelf => shelf.activities.length > 0);
  const statusSummary = state.checking
    ? 'Checking for updates…'
    : state.origin === 'bundled'
      ? 'Bundled offline copy'
      : state.origin === 'cache'
        ? 'Saved offline copy'
        : 'Downloaded copy';
  return (
    <View style={styles.container}>
      <View style={styles.discoverHeading}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={[styles.discoverTitle, { color: c.foreground }]}>Discover</Text>
          <Text style={[styles.status, { color: c.mutedForeground }]}>{activities.filter(activity => !activity.archived).length} catalog entries</Text>
        </View>
        <IconButton icon="grid" label="Explore full catalog" testID="library-discover-explore" onPress={() => openSearch()} />
      </View>
      <Pressable
        testID="catalog-status-toggle"
        accessibilityRole="button"
        accessibilityLabel={`Catalog status: ${statusSummary}${state.error ? ', update check needs attention' : ''}`}
        accessibilityState={{ expanded: showStatus }}
        onPress={() => setShowStatus(value => !value)}
        style={({ pressed }) => [styles.statusToggle, { borderColor: c.border, backgroundColor: c.card, opacity: pressed ? 0.86 : 1 }]}
      >
        <Feather name={state.error ? 'alert-circle' : 'database'} size={16} color={state.error ? c.destructive : c.mutedForeground} />
        <Text style={[styles.statusToggleText, { color: c.mutedForeground }]} numberOfLines={1}>Catalog status · {statusSummary}</Text>
        <Feather name={showStatus ? 'chevron-up' : 'chevron-down'} size={16} color={c.mutedForeground} />
      </Pressable>
      {showStatus ? (
        <Card style={{ gap: 8, padding: 14 }}>
          <Text style={[styles.status, { color: c.mutedForeground }]}>
            {activities.length} shared activities · {state.release.contentVersion}
          </Text>
          <Text testID="catalog-freshness" style={[styles.status, { color: c.mutedForeground }]}>
            {state.origin === 'bundled' ? 'Bundled offline copy' : state.origin === 'cache' ? 'Saved offline copy' : 'Downloaded and validated copy'}
            {' · '}{state.checkedAt ? `Checked ${new Date(state.checkedAt).toLocaleString()}` : 'Not checked for updates'}
          </Text>
          {state.error ? <Text testID="catalog-error" accessibilityRole="alert" style={[styles.status, { color: c.destructive }]}>{state.error}</Text> : null}
          <Button
            testID="catalog-refresh"
            compact
            variant="soft"
            icon="refresh-cw"
            label={state.checking ? 'Checking…' : 'Check for updates'}
            disabled={state.checking}
            onPress={() => void repository.refresh()}
          />
        </Card>
      ) : null}

      <View style={styles.gridHeader}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Browse by discipline</Text>
        <Text style={[styles.status, { color: c.mutedForeground }]}>Choose a starting point</Text>
      </View>
      <View style={styles.grid}>
        {browseDisciplines.map(({ id: discipline, icon }, index) => {
          const count = activities.filter(activity => !activity.archived && activity.discipline === discipline).length;
          if (!count) return null;
          return (
          <Pressable
            key={discipline}
            testID={`catalog-discipline-${discipline}`}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${DISCIPLINE_LABEL[discipline]}, ${count} catalog entries`}
            onPress={() => openSearch({ discipline })}
            style={({ pressed }) => [
              styles.disciplineTile,
              { backgroundColor: index % 2 ? c.secondary : c.accent, borderColor: index % 2 ? c.border : c.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name={icon} size={21} color={index % 2 ? c.secondaryForeground : c.accentForeground} />
            <Text style={[styles.tileName, { color: index % 2 ? c.secondaryForeground : c.accentForeground }]}>{DISCIPLINE_LABEL[discipline]}</Text>
            <Text style={[styles.tileCount, { color: index % 2 ? c.secondaryForeground : c.accentForeground }]}>{count} activities</Text>
            <Feather name="arrow-up-right" size={16} color={index % 2 ? c.secondaryForeground : c.accentForeground} />
          </Pressable>
          );
        })}
      </View>
      {shelves.map(shelf => (
        <View key={shelf.id} style={styles.shelf}>
          <View style={styles.shelfHeading}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>{shelf.title}</Text>
            <Button
              compact
              variant="ghost"
              label="View all"
              icon="arrow-right"
              testID={`catalog-shelf-view-all-${shelf.id}`}
              onPress={() => openSearch({ [shelf.facet]: shelf.value })}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfCards}>
            {shelf.activities.slice(0, 10).map(activity => (
              <ActivityShelfCard
                key={activity.id}
                activity={activity}
                width={cardWidth}
                saved={tempo.state.savedActivities.some(saved => saved.id === activity.id)}
                onOpen={() => openSearch({ [shelf.facet]: shelf.value, activityId: activity.id })}
                onToggleSaved={() => tempo.setActivitySaved(activity.id, !tempo.state.savedActivities.some(saved => saved.id === activity.id))}
              />
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

function ActivityShelfCard({ activity, width, saved, onOpen, onToggleSaved }: {
  activity: Activity; width: number; saved: boolean; onOpen: () => void; onToggleSaved: () => void;
}) {
  const c = useColors();
  return (
    <Card style={[styles.shelfCard, { width }]}>
      <Pressable
        testID={`catalog-shelf-activity-${activity.id}`}
        accessibilityRole="button"
        accessibilityLabel={`View ${activity.name}`}
        onPress={onOpen}
        style={{ flex: 1, gap: 8 }}
      >
        <Feather name={activity.type === 'sequence' ? 'layers' : 'activity'} size={18} color={c.primary} />
        <Text style={[styles.activityName, { color: c.foreground }]} numberOfLines={2}>{activity.name}</Text>
        <Text style={[styles.activityMeta, { color: c.mutedForeground }]} numberOfLines={2}>
          {DISCIPLINE_LABEL[activity.discipline]} · {activity.equipment?.includes('none') ? 'No equipment' : activity.equipment?.join(', ') || 'Equipment unknown'}
        </Text>
      </Pressable>
      <View style={[styles.saveAction, { borderTopColor: c.border }]}>
        <IconButton
          icon="bookmark"
          label={saved ? `Remove ${activity.name} from Saved Activities` : `Save ${activity.name}`}
          testID={`catalog-shelf-save-${activity.id}`}
          onPress={onToggleSaved}
        />
        <Text style={[styles.saveLabel, { color: saved ? c.primary : c.mutedForeground }]}>{saved ? 'Saved' : 'Save'}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  discoverHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discoverTitle: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4 },
  statusToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 14 },
  statusToggleText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19 },
  status: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  gridHeader: { gap: 2, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  disciplineTile: { flexGrow: 1, flexBasis: '46%', minHeight: 112, borderRadius: 19, borderWidth: 1, padding: 15, justifyContent: 'space-between' },
  tileName: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  tileCount: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  shelf: { gap: 8 },
  shelfHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  shelfCards: { gap: 9, paddingRight: 20, paddingBottom: 2 },
  shelfCard: { minHeight: 148, padding: 12, gap: 8 },
  activityName: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 18 },
  activityMeta: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  saveAction: { borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginHorizontal: -2 },
  saveLabel: { fontFamily: fonts.bodySemi, fontSize: 11 },
});
