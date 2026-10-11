import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Discipline } from '@/lib/domain';
import { DISCIPLINE_LABEL } from '@/lib/domain';
import { useCatalog } from '@/context/CatalogContext';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/colors';
import { Button, Card } from '@/components/ui';

export function CatalogBrowser() {
  const c = useColors();
  const { repository, state } = useCatalog();
  const [showStatus, setShowStatus] = useState(false);
  const browseDisciplines: Discipline[] = ['strength', 'yoga', 'mobility', 'conditioning'];
  const openSearch = (discipline?: Discipline) => router.push({
    pathname: '/catalog-search',
    params: discipline ? { discipline } : {},
  });
  const statusSummary = state.checking
    ? 'Checking for updates…'
    : state.origin === 'bundled'
      ? 'Bundled offline copy'
      : state.origin === 'cache'
        ? 'Saved offline copy'
        : 'Downloaded copy';
  return (
    <View style={styles.container}>
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
            {state.release.activities.length} shared activities · {state.release.contentVersion}
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

      <Pressable
        testID="catalog-open-search"
        accessibilityRole="button"
        onPress={() => openSearch()}
        style={({ pressed }) => [styles.searchEntry, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.88 : 1 }]}
      >
        <Feather name="search" size={20} color={c.primary} />
        <Text style={[styles.searchLabel, { color: c.mutedForeground }]}>Search the shared catalog</Text>
        <Feather name="arrow-up-right" size={18} color={c.mutedForeground} />
      </Pressable>

      <View style={styles.gridHeader}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Browse by discipline</Text>
        <Text style={[styles.status, { color: c.mutedForeground }]}>Start with a category</Text>
      </View>
      <View style={styles.grid}>
        {browseDisciplines.map((discipline, index) => (
          <Pressable
            key={discipline}
            testID={`catalog-discipline-${discipline}`}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${DISCIPLINE_LABEL[discipline]}`}
            onPress={() => openSearch(discipline)}
            style={({ pressed }) => [
              styles.disciplineTile,
              { backgroundColor: index % 2 ? c.secondary : c.accent, borderColor: index % 2 ? c.border : c.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name={icons[discipline]} size={21} color={index % 2 ? c.secondaryForeground : c.accentForeground} />
            <Text style={[styles.tileName, { color: index % 2 ? c.secondaryForeground : c.accentForeground }]}>{DISCIPLINE_LABEL[discipline]}</Text>
            <Feather name="arrow-up-right" size={16} color={index % 2 ? c.secondaryForeground : c.accentForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const icons: Record<Discipline, keyof typeof Feather.glyphMap> = {
  yoga: 'wind', mobility: 'rotate-cw', strength: 'activity', conditioning: 'zap',
};
const styles = StyleSheet.create({
  container: { marginTop: 16, gap: 14 },
  statusToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 14 },
  statusToggleText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19 },
  status: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  searchEntry: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 17, borderWidth: 1 },
  searchLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15 },
  gridHeader: { gap: 2, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  disciplineTile: { width: '48%', minHeight: 112, borderRadius: 19, borderWidth: 1, padding: 15, justifyContent: 'space-between' },
  tileName: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
});
