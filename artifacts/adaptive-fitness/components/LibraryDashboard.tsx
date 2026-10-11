import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button, Card, IconButton, notify, success } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { estimateSec, minutesLabel, routineLaunchSnapshot } from '@/lib/domain';
import { CatalogBrowser } from '@/components/CatalogBrowser';

export function LibraryDashboard({ openTab }: { openTab: (tab: 'saved' | 'personal' | 'routines') => void }) {
  const c = useColors();
  const { state, todayKey, startSnapshot } = useTempo();
  const { width: viewportWidth } = useWindowDimensions();
  const activityCardWidth = Math.max(164, Math.min(186, (viewportWidth - 48) / 2));
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
          <View style={styles.headingActions}>
            <IconButton icon="plus" label="Create a routine" testID="library-new-routine" onPress={() => router.push('/builder')} />
            <Button compact variant="ghost" label="View all" icon="arrow-right" testID="library-routines-view-all" onPress={() => openTab('routines')} />
          </View>
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
          {routines.length ? routines.map((routine) => (
            <RoutineLaunchCard
              key={routine.id}
              routine={routine}
              active={!!state.active}
              custom={state.customExercises}
              onStart={() => startRoutine(routine)}
            />
          )) : (
            <View style={[styles.emptyRoutine, { borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>No routines yet</Text>
              <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>Create a routine to save your first plan. Use the plus button above to get started.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>My Activities</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          accessibilityLabel="My Activities destinations"
        >
          <ActivityDestinationCard
            title="Saved Activities"
            count={state.savedActivities.length}
            icon="bookmark"
            testID="library-saved-destination"
            onPress={() => openTab('saved')}
            width={activityCardWidth}
          />
          <ActivityDestinationCard
            title="Custom Activities"
            count={state.customExercises.filter((exercise) => !exercise.archived).length}
            icon="edit-3"
            testID="library-custom-destination"
            onPress={() => openTab('personal')}
            width={activityCardWidth}
          />
        </ScrollView>
      </View>

      <CatalogBrowser />
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
  return (
    <View testID={`library-routine-card-${routine.id}`}>
    <Card style={styles.routineCard}>
      <View style={{ gap: 5 }}>
        <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>{routine.name}</Text>
        <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>
          {routine.items.length} {routine.items.length === 1 ? 'activity' : 'activities'} · {blocked ? 'Targets need review' : minutesLabel(estimate)}
        </Text>
        {blocked ? <Text style={[styles.blockedHint, { color: c.destructive }]} numberOfLines={2}>{errors[0]}</Text> : null}
      </View>
      <View style={styles.routineActions}>
        <Button
          compact
          icon={active ? 'play' : blocked ? 'edit-2' : 'play'}
          label={active ? 'Resume' : blocked ? 'Fix targets' : 'Start'}
          testID={`library-start-${routine.id}`}
          accessibilityLabel={`${active ? 'Resume active session' : blocked ? 'Fix targets' : 'Start'}: ${routine.name}`}
          onPress={blocked && !active ? () => router.push({ pathname: '/builder', params: { id: routine.id } }) : onStart}
          style={{ flex: 1 }}
        />
        <Button
          compact
          variant="ghost"
          icon="edit-3"
          label="Edit"
          testID={`library-edit-${routine.id}`}
          accessibilityLabel={`Edit routine: ${routine.name}`}
          onPress={() => router.push({ pathname: '/builder', params: { id: routine.id } })}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
    </View>
  );
}

function ActivityDestinationCard({ title, count, icon, testID, onPress, width }: {
  title: string; count: number; icon: 'bookmark' | 'edit-3'; testID: string; onPress: () => void; width: number;
}) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count} ${count === 1 ? 'activity' : 'activities'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.activityCard, { width, backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.86 : 1 }]}
    >
      <Feather name={icon} size={18} color={c.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.activityTitle, { color: c.foreground }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.activityCount, { color: c.mutedForeground }]}>{count} {count === 1 ? 'activity' : 'activities'}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  headingActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4 },
  carousel: { gap: 8, paddingRight: 20, paddingBottom: 2 },
  routineCard: { width: 252, minHeight: 132, padding: 12, justifyContent: 'space-between', gap: 10 },
  emptyRoutine: { width: 252, minHeight: 94, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', padding: 14, justifyContent: 'center', gap: 4 },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.25 },
  cardMeta: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  blockedHint: { fontFamily: fonts.bodyMedium, fontSize: 11.5, lineHeight: 16 },
  resumeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 13 },
  resumeText: { flex: 1, gap: 2 },
  routineActions: { flexDirection: 'row', gap: 8 },
  activityCard: { minHeight: 70, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  activityTitle: { fontFamily: fonts.bodyMedium, fontSize: 13.5, lineHeight: 18 },
  activityCount: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
});
