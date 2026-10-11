import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CatalogBrowser } from '@/components/CatalogBrowser';
import { Button, Card, notify, success } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { estimateSec, minutesLabel, routineLaunchSnapshot } from '@/lib/domain';

export function LibraryDashboard({ openTab }: { openTab: (tab: 'saved' | 'personal' | 'routines' | 'explore') => void }) {
  const c = useColors();
  const { state, todayKey, startSnapshot } = useTempo();
  const routines = state.routines
    .filter((routine) => !routine.archived)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const startRoutine = (routine: (typeof routines)[number]) => {
    if (state.active) {
      router.push('/session');
      return;
    }
    const { snapshot, errors } = routineLaunchSnapshot(routine, state.customExercises);
    if (errors.length) {
      notify('Can’t start this routine yet', errors.join('\n'));
      router.push({ pathname: '/builder', params: { id: routine.id } });
      return;
    }
    const estimate = estimateSec(snapshot.items);
    const startErrors = startSnapshot({
      date: todayKey,
      occurrenceKey: null,
      snapshot,
      items: snapshot.items,
      plannedMinutes: Number.isFinite(estimate) ? Math.round(estimate / 60) : undefined,
      adaptation: [],
    });
    if (startErrors.length) {
      notify('Can’t start this routine yet', startErrors.join('\n'));
      router.push({ pathname: '/builder', params: { id: routine.id } });
      return;
    }
    success();
    router.push('/session');
  };

  return (
    <View style={{ gap: 18 }}>
      <View>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Routines</Text>
          <Button compact variant="ghost" label="View all" icon="arrow-right" testID="library-routines-view-all" onPress={() => openTab('routines')} />
        </View>
        {state.active ? (
          <Card style={styles.resumeCard}>
            <View style={styles.resumeText}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>Session in progress</Text>
              <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>{state.active.title}</Text>
            </View>
            <Button compact icon="play" label="Resume" testID="library-resume-active" onPress={() => router.push('/session')} />
          </Card>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          <Card style={[styles.routineCard, styles.newCard]}>
            <View style={[styles.newIcon, { backgroundColor: c.accent }]}>
              <Feather name="plus" size={20} color={c.accentForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>New Routine</Text>
              <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>Build a plan with your own targets.</Text>
            </View>
            <Button compact label="Create routine" icon="plus" testID="library-new-routine" onPress={() => router.push('/builder')} />
          </Card>
          {routines.map((routine) => (
            <RoutineLaunchCard
              key={routine.id}
              routine={routine}
              active={!!state.active}
              custom={state.customExercises}
              onStart={() => startRoutine(routine)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>My Activities</Text>
        <View style={styles.inventoryRow}>
          <InventoryTile
            title="Saved Activities"
            count={state.savedActivities.length}
            icon="bookmark"
            testID="library-saved-destination"
            onPress={() => openTab('saved')}
          />
          <InventoryTile
            title="Custom Activities"
            count={state.customExercises.filter((exercise) => !exercise.archived).length}
            icon="edit-3"
            testID="library-custom-destination"
            onPress={() => openTab('personal')}
          />
        </View>
        <Button compact variant="soft" icon="plus" label="Create custom activity" testID="library-create-custom" onPress={() => router.push('/exercise-edit')} />
      </View>

      <View style={{ gap: 10 }}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Discover</Text>
        <CatalogBrowser />
      </View>
    </View>
  );
}

function RoutineLaunchCard({
  routine,
  active,
  custom,
  onStart,
}: {
  routine: ReturnType<typeof useTempo>['state']['routines'][number];
  active: boolean;
  custom: ReturnType<typeof useTempo>['state']['customExercises'];
  onStart: () => void;
}) {
  const c = useColors();
  const { snapshot, errors } = routineLaunchSnapshot(routine, custom);
  const estimate = estimateSec(snapshot.items);
  const blocked = errors.length > 0;
  const activityNames = snapshot.items.map((item) => item.name).join(' · ');
  return (
    <View testID={`library-routine-card-${routine.id}`}>
    <Card style={styles.routineCard}>
      <View style={{ flex: 1, gap: 7 }}>
        <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>{routine.name}</Text>
        <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>
          {routine.items.length} {routine.items.length === 1 ? 'activity' : 'activities'} · {blocked ? 'Targets need review' : minutesLabel(estimate)}
        </Text>
        {activityNames ? <Text style={[styles.activityNames, { color: c.foreground }]} numberOfLines={2}>{activityNames}</Text> : null}
        {blocked ? <Text style={[styles.blockedHint, { color: c.destructive }]} numberOfLines={2}>{errors[0]}</Text> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Button
          compact
          icon={active ? 'play' : blocked ? 'edit-2' : 'play'}
          label={active ? 'Resume active session' : blocked ? 'Edit targets' : 'Start now'}
          testID={`library-start-${routine.id}`}
          onPress={blocked && !active ? () => router.push({ pathname: '/builder', params: { id: routine.id } }) : onStart}
        />
        <Button
          compact
          variant="ghost"
          icon="edit-3"
          label="Edit routine"
          testID={`library-edit-${routine.id}`}
          onPress={() => router.push({ pathname: '/builder', params: { id: routine.id } })}
        />
      </View>
    </Card>
    </View>
  );
}

function InventoryTile({ title, count, icon, testID, onPress }: {
  title: string; count: number; icon: 'bookmark' | 'edit-3'; testID: string; onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.86 : 1 }]}
    >
      <Feather name={icon} size={18} color={c.primary} />
      <Text style={[styles.tileCount, { color: c.foreground }]}>{count}</Text>
      <Text style={[styles.tileTitle, { color: c.mutedForeground }]} numberOfLines={2}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4 },
  carousel: { gap: 10, paddingRight: 20, paddingBottom: 2 },
  routineCard: { width: 270, minHeight: 190, padding: 14, justifyContent: 'space-between', gap: 12 },
  newCard: { borderStyle: 'dashed' },
  newIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.25 },
  cardMeta: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  activityNames: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  blockedHint: { fontFamily: fonts.bodyMedium, fontSize: 11.5, lineHeight: 16 },
  resumeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 13 },
  resumeText: { flex: 1, gap: 2 },
  inventoryRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, minHeight: 90, borderRadius: 18, borderWidth: 1, padding: 14, gap: 4 },
  tileCount: { fontFamily: fonts.display, fontSize: 25, lineHeight: 30 },
  tileTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
});
