import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Eyebrow, success, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { estimateSec, minutesLabel } from '@/lib/domain';
import { useColors } from '@/hooks/useColors';
import { ADJUST_LABEL, AdjustKind, DAY_SHORT, addDays, dateKey, estimatedSetCount, prettyDate, targetLabel, weekday } from '@/lib/engine';

const KINDS: { kind: AdjustKind; icon: keyof typeof Feather.glyphMap }[] = [
  { kind: '10', icon: 'zap' },
  { kind: '20', icon: 'clock' },
  { kind: '30', icon: 'watch' },
  { kind: 'low', icon: 'battery' },
  { kind: 'noequip', icon: 'home' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Morning. Here’s what fits.';
  if (h < 17) return 'Afternoon. Still room for this.';
  return 'Evening. Short counts too.';
}

export default function Today() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { ready, state, today, startSession, todayOccurrences, loadError, dismissLoadError } = useTempo();

  if (!ready || !today) {
    return (
      <View style={[s.root, { backgroundColor: c.background, paddingTop: top + 16 }]}>
        <View style={[s.skel, { height: 18, width: 140, backgroundColor: c.muted }]} />
        <View style={[s.skel, { height: 36, width: 220, backgroundColor: c.muted, marginTop: 10 }]} />
        <View style={[s.skel, { height: 320, backgroundColor: c.muted, marginTop: 24, borderRadius: 28 }]} />
      </View>
    );
  }

  const session = today.session;
  const active = state.active;
  const todayKey = dateKey();
  const doneToday = state.completions.filter((x) => x.date === todayKey);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(todayKey, i - ((weekday(todayKey) + 6) % 7)));
  const doneDates = new Set(state.completions.map((x) => x.date));

  const begin = () => {
    if (!active) {
      startSession();
      success();
    }
    router.push('/session');
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[s.root, { paddingTop: top + 16, paddingBottom: bottom }]} showsVerticalScrollIndicator={false}>
      <Eyebrow>{prettyDate(todayKey)}</Eyebrow>
      <Text style={[s.greet, { color: c.foreground }]}>{greeting()}</Text>

      {!state.profile.setupDone ? (
        <Pressable testID="setup-banner" onPress={() => router.push('/setup')} style={[s.banner, { backgroundColor: c.secondary }]}>
          <Feather name="sliders" size={18} color={c.secondaryForeground} />
          <Text style={[s.bannerText, { color: c.secondaryForeground }]}>Optional: tell Tempo your equipment and limits. Four taps.</Text>
          <Feather name="chevron-right" size={18} color={c.secondaryForeground} />
        </Pressable>
      ) : null}

      {active ? (
        <Pressable testID="resume-banner" onPress={() => router.push('/session')} style={[s.banner, { backgroundColor: c.primary }]}>
          <Feather name="play-circle" size={20} color={c.primaryForeground} />
          <Text style={[s.bannerText, { color: c.primaryForeground }]}>
            {active.title} is paused mid-way. Pick up where you left off.
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
                  <Text style={[s.occMeta, { color: done ? c.secondaryForeground : c.accentMuted }]}>{o.snapshot.items.length} moves · about {minutesLabel(estimateSec(o.snapshot.items))}{done ? ' · done' : ''}</Text>
                </View>
                <Feather name={done ? 'check-circle' : 'play-circle'} size={26} color={done ? c.secondaryForeground : c.done} />
              </Pressable>
            );
          })}
          <Text style={[s.hint, { color: c.mutedForeground }]}>Tempo’s own suggestion steps aside on days you’ve scheduled something.</Text>
        </View>
      ) : (
      <View style={[s.hero, { backgroundColor: c.accent }]}>
        <View style={[s.ring, { borderColor: c.primary }]} />
        <View style={[s.ring2, { borderColor: c.done }]} />
        {session ? (
          <>
            <Text style={[s.heroEyebrow, { color: c.accentMuted }]}>{doneToday.length ? 'DONE TODAY · GO AGAIN IF YOU LIKE' : 'TODAY’S SESSION'}</Text>
            <Text style={[s.heroTitle, { color: c.accentForeground }]}>{session.title}</Text>
            <View style={s.heroStats}>
              <Text style={[s.heroBig, { color: c.accentForeground }]}>{session.minutes}</Text>
              <Text style={[s.heroUnit, { color: c.accentMuted }]}>min{'\n'}{session.exercises.length} moves · {estimatedSetCount(session)} sets</Text>
            </View>
            <View style={s.tagRow}>
              {session.lowEnergy ? <Tag label="Low energy" /> : null}
              {session.noEquipment ? <Tag label="Bodyweight" /> : null}
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              {session.exercises.map((e, i) => (
                <View key={e.exerciseId} style={s.moveRow}>
                  <Text style={[s.moveIdx, { color: c.accentMuted }]}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={[s.moveName, { color: c.accentForeground }]} numberOfLines={1}>{e.name}</Text>
                  <Text style={[s.moveTarget, { color: c.accentMuted }]}>{e.sets}×{targetLabel(e)}</Text>
                </View>
              ))}
            </View>
            {session.note ? <Text style={[s.note, { color: c.accentMuted }]}>{session.note}</Text> : null}
            <Button testID="start-session" label={active ? 'Resume session' : doneToday.length ? 'Start another round' : 'Start session'} icon="play" onPress={begin} style={{ marginTop: 18 }} />
          </>
        ) : (
          <>
            <Text style={[s.heroEyebrow, { color: c.accentMuted }]}>TODAY</Text>
            <Text style={[s.heroTitle, { color: c.accentForeground }]}>Rest day</Text>
            <Text style={[s.note, { color: c.accentMuted, marginTop: 8 }]}>{today.reason} Nothing is owed. If you have a spare ten minutes and want to move, add a short one below.</Text>
          </>
        )}
      </View>
      )}

      <Text style={[s.section, { color: c.foreground }]}>Day changed? Adjust in one tap.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
        {KINDS.map((k) => {
          const on = session ? (k.kind === 'low' ? session.lowEnergy : k.kind === 'noequip' ? session.noEquipment : String(session.minutes) === k.kind) : false;
          return <Chip testID={`adjust-${k.kind}`} key={k.kind} label={ADJUST_LABEL[k.kind]} icon={k.icon} active={on} onPress={() => router.push({ pathname: '/adjust', params: { kind: k.kind } })} />;
        })}
      </ScrollView>
      <Text style={[s.hint, { color: c.mutedForeground }]}>You’ll see a before-and-after preview before anything changes.</Text>

      <Card style={{ marginTop: 24 }}>
        <Eyebrow>This week</Eyebrow>
        <View style={s.weekRow}>
          {weekDays.map((d) => {
            const isToday = d === todayKey;
            const done = doneDates.has(d);
            const planned = state.plan?.days.find((p) => p.date === d)?.type === 'session';
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
        <Text style={[s.hint, { color: c.mutedForeground, marginTop: 12 }]}>Filled dots are sessions you finished. Missed days just pass — they don’t stack up.</Text>
      </Card>
    </ScrollView>
  );
}

function Tag({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={[s.tag, { backgroundColor: c.done }]}>
      <Text style={[s.tagText, { color: c.doneForeground }]}>{label}</Text>
    </View>
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
