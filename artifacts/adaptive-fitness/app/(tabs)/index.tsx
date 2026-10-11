import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { estimateSec, minutesLabel, occurrencesBetween } from '@/lib/domain';
import { useColors } from '@/hooks/useColors';
import { DAY_SHORT, addDays, prettyDate, weekday } from '@/lib/engine';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

export default function Today() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { ready, state, todayKey, todayOccurrences, loadError, dismissLoadError } = useTempo();

  if (!ready) {
    return (
      <View style={[s.root, { backgroundColor: c.background, paddingTop: top + 16 }]}>
        <View style={[s.skel, { height: 18, width: 140, backgroundColor: c.muted }]} />
        <View style={[s.skel, { height: 36, width: 220, backgroundColor: c.muted, marginTop: 10 }]} />
        <View style={[s.skel, { height: 320, backgroundColor: c.muted, marginTop: 24, borderRadius: 28 }]} />
      </View>
    );
  }

  const active = state.active;
  const doneToday = state.completions.filter((x) => x.date === todayKey);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(todayKey, i - ((weekday(todayKey) + 6) % 7)));
  const doneDates = new Set(state.completions.map((x) => x.date));
  const plannedDates = new Set(occurrencesBetween(state.schedule, weekDays[0], weekDays[6]).map(o => o.date));

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[s.root, { paddingTop: top + 16, paddingBottom: bottom }]} showsVerticalScrollIndicator={false}>
      <Eyebrow>{prettyDate(todayKey)}</Eyebrow>
      <Text style={[s.greet, { color: c.foreground }]}>{greeting()}</Text>

      {!state.profile.setupDone ? (
        <Pressable testID="setup-banner" onPress={() => router.push('/setup')} style={[s.banner, { backgroundColor: c.secondary }]}>
          <Feather name="sliders" size={18} color={c.secondaryForeground} />
          <Text style={[s.bannerText, { color: c.secondaryForeground }]}>Optional: tell Svasthic your equipment and limits. Four taps.</Text>
          <Feather name="chevron-right" size={18} color={c.secondaryForeground} />
        </Pressable>
      ) : null}

      {active ? (
        <Pressable testID="resume-banner" onPress={() => router.push('/session')} style={[s.banner, { backgroundColor: c.primary }]}>
          <Feather name="play-circle" size={20} color={c.primaryForeground} />
          <Text style={[s.bannerText, { color: c.primaryForeground }]}>
            {active.title} · Resume your session.
          </Text>
          <Feather name="chevron-right" size={18} color={c.primaryForeground} />
        </Pressable>
      ) : null}

      {loadError ? (
        <Pressable testID="load-error" onPress={dismissLoadError} style={[s.banner, { backgroundColor: c.muted, borderWidth: 1.5, borderColor: c.destructive }]}>
          <Feather name="alert-triangle" size={18} color={c.destructive} />
          <Text style={[s.bannerText, { color: c.foreground }]}>{loadError} Tap to dismiss.</Text>
        </Pressable>
      ) : null}

      {todayOccurrences.length ? (
        <View style={{ gap: 10, marginTop: 18 }}>
          <Eyebrow>Your plan today</Eyebrow>
          {todayOccurrences.map((o) => {
            const done = state.completions.some((x) => x.occurrenceKey === o.key);
            return (
              <Pressable key={o.key} testID={`today-occ-${o.key}`} onPress={() => router.push({ pathname: '/occurrence', params: { key: o.key } })} style={[s.occ, { backgroundColor: done ? c.secondary : c.accent }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.occTitle, { color: done ? c.secondaryForeground : c.accentForeground }]}>{o.snapshot.title}</Text>
                  <Text style={[s.occMeta, { color: done ? c.secondaryForeground : c.accentMuted }]}>{o.snapshot.items.length} activities · {minutesLabel(estimateSec(o.snapshot.items))}{done ? ' · done' : ''}</Text>
                </View>
                <Feather name={done ? 'check-circle' : 'play-circle'} size={26} color={done ? c.secondaryForeground : c.done} />
              </Pressable>
            );
          })}
          <Text style={[s.hint, { color: c.mutedForeground }]}>Tap a workout to start it, edit it or remove it.</Text>
        </View>
      ) : (
      <View style={[s.hero, { backgroundColor: c.accent }]}>
        <View style={[s.ring, { borderColor: c.primary }]} />
        <View style={[s.ring2, { borderColor: c.done }]} />
        <Text style={[s.heroEyebrow, { color: c.accentMuted }]}>YOUR DAY</Text>
        <Text style={[s.heroTitle, { color: c.accentForeground }]}>Nothing scheduled today</Text>
        <Text style={[s.note, { color: c.accentMuted }]}>Choose a routine or an activity when you want to work out. Svasthic won’t add sessions for you.</Text>
        <Button testID="today-schedule" label="Schedule a workout" icon="plus" onPress={() => router.push({ pathname: '/schedule-add', params: { date: todayKey } })} style={{ marginTop: 18 }} />
        <Button testID="today-routines" label="Browse routines & activities" variant="ghost" onPress={() => router.push('/library')} style={{ marginTop: 8 }} />
      </View>
      )}

      {todayOccurrences.length ? (
        <Button testID="today-add-workout" label="Add another workout" variant="soft" icon="plus" onPress={() => router.push({ pathname: '/schedule-add', params: { date: todayKey } })} style={{ marginTop: 16 }} />
      ) : null}
      {doneToday.length ? (
        <Card style={{ marginTop: 24 }}>
          <Eyebrow>Completed today</Eyebrow>
          {doneToday.map(x => (
            <Pressable key={x.id} onPress={() => router.navigate('/progress')} style={[s.moveRow, { marginTop: 12 }]}>
              <Feather name="check-circle" size={18} color={c.done} />
              <Text style={[s.moveName, { color: c.foreground }]}>{x.title}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginTop: 24 }}>
        <Eyebrow>This week</Eyebrow>
        <View style={s.weekRow}>
          {weekDays.map((d) => {
            const isToday = d === todayKey;
            const done = doneDates.has(d);
            const planned = plannedDates.has(d);
            return (
              <View key={d} style={s.weekCell}>
                <Text style={[s.weekLabel, { color: isToday ? c.primary : c.mutedForeground }]}>{DAY_SHORT[weekday(d)].slice(0, 1)}</Text>
                <View style={[s.dot, { backgroundColor: done ? c.done : 'transparent', borderColor: done ? c.done : planned ? c.accent : c.border, borderWidth: isToday ? 2.5 : 1.5 }]}>
                  {done ? <Feather name="check" size={14} color={c.doneForeground} /> : null}
                </View>
              </View>
            );
          })}
        </View>
        <Text style={[s.hint, { color: c.mutedForeground, marginTop: 12 }]}>Outlined dots are workouts you scheduled. Filled dots are sessions you finished.</Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { paddingHorizontal: 20, flexGrow: 1 },
  skel: { borderRadius: 10 },
  greet: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 6, marginBottom: 18, lineHeight: 34 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, marginBottom: 12, minHeight: 56 },
  bannerText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 19 },
  hero: { borderRadius: 30, padding: 22, overflow: 'hidden' },
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 18, right: -80, top: -90, opacity: 0.9 },
  ring2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 10, right: 40, top: -70, opacity: 0.8 },
  heroEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.6 },
  heroTitle: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -1, marginTop: 6 },
  heroStats: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 6, marginBottom: 10 },
  heroBig: { fontFamily: fonts.display, fontSize: 64, letterSpacing: -3, lineHeight: 66 },
  heroUnit: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 19, paddingBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tagText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moveIdx: { fontFamily: fonts.displayMedium, fontSize: 13, width: 22 },
  moveName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15 },
  moveTarget: { fontFamily: fonts.displayMedium, fontSize: 13 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 14 },
  section: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.5, marginTop: 28, marginBottom: 12 },
  occ: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 18 },
  occTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.6 },
  occMeta: { fontFamily: fonts.body, fontSize: 13, marginTop: 3 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, marginTop: 10 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  weekCell: { alignItems: 'center', gap: 8 },
  weekLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
