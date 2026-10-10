import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DayMark, MonthGrid, Segmented, WeekStrip, monthStart, weekStart } from '@/components/planner';
import { Button, Eyebrow, IconButton, ScreenTitle, tap, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { estimateSec, minutesLabel, occurrencesBetween } from '@/lib/domain';
import { addDays, prettyDate, targetLabel } from '@/lib/engine';

export default function PlanScreen() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { state, ready, todayKey, startSession } = useTempo();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [selected, setSelected] = useState(todayKey);
  const [anchor, setAnchor] = useState(todayKey);
  const [month, setMonth] = useState(todayKey);
  const [openGen, setOpenGen] = useState(false);

  const from = view === 'week' ? weekStart(anchor) : weekStart(monthStart(month));
  const to = view === 'week' ? addDays(from, 6) : addDays(weekStart(monthStart(month)), 41);
  const occ = useMemo(() => occurrencesBetween(state.schedule, from, to), [state.schedule, from, to]);
  const marks = useMemo(() => {
    const m: Record<string, DayMark> = {};
    const get = (d: string) => (m[d] ??= { user: 0, done: 0, generated: false });
    occ.forEach((o) => get(o.date).user++);
    state.completions.forEach((x) => { if (x.date >= from && x.date <= to) get(x.date).done++; });
    state.plan?.days.forEach((d) => { if (d.session) get(d.date).generated = true; });
    return m;
  }, [occ, state.completions, state.plan, from, to]);

  const dayOcc = occ.filter((o) => o.date === selected);
  const dayDone = state.completions.filter((x) => x.date === selected);
  const gen = state.plan?.days.find((d) => d.date === selected);
  const showGen = !!gen?.session && dayOcc.length === 0;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top + 16, paddingBottom: bottom }}>
      <ScreenTitle eyebrow="Calendar" title="Your schedule" right={<IconButton testID="plan-add" icon="plus" label="Schedule a workout" onPress={() => router.push({ pathname: '/schedule-add', params: { date: selected } })} />} />
      <Segmented testID="plan-view" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={view} onChange={(v) => { setView(v); setAnchor(selected); setMonth(selected); }} />
      <View style={[s.cal, { backgroundColor: c.card, borderColor: c.border }]}>
        {!ready ? (
          <View style={{ height: 120, borderRadius: 16, backgroundColor: c.muted }} />
        ) : view === 'week' ? (
          <WeekStrip anchor={anchor} selected={selected} onSelect={setSelected} onShift={(d) => { setAnchor(d); setSelected(d); }} marks={marks} />
        ) : (
          <MonthGrid month={month} onMonth={setMonth} selected={selected} onSelect={setSelected} marks={marks} />
        )}
        <View style={s.legend}>
          <Legend color={c.accent} label="Scheduled" />
          <Legend color={c.done} label="Done" />
          <Legend ring={c.accentMuted} label="Suggested" />
        </View>
      </View>
      {selected !== todayKey ? (
        <Pressable onPress={() => { tap(); setSelected(todayKey); setAnchor(todayKey); setMonth(todayKey); }} style={{ alignSelf: 'flex-start', marginTop: 10 }} hitSlop={8}>
          <Text style={[s.link, { color: c.primary }]}>Jump to today</Text>
        </Pressable>
      ) : null}

      <View style={s.dayHead}>
        <Text style={[s.dayTitle, { color: c.foreground }]}>{selected === todayKey ? 'Today' : prettyDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Button testID="plan-day-add" compact variant="soft" icon="plus" label="Add" onPress={() => router.push({ pathname: '/schedule-add', params: { date: selected } })} />
      </View>

      <View style={{ gap: 10 }}>
        {dayOcc.map((o) => {
          const doneHere = state.completions.some((x) => x.occurrenceKey === o.key);
          return (
            <Pressable key={o.key} testID={`occ-${o.key}`} onPress={() => { tap(); router.push({ pathname: '/occurrence', params: { key: o.key } }); }} style={({ pressed }) => [s.occ, { backgroundColor: doneHere ? c.secondary : c.accent, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.occTitle, { color: doneHere ? c.secondaryForeground : c.accentForeground }]}>{o.snapshot.title}</Text>
                <Text style={[s.occMeta, { color: doneHere ? c.secondaryForeground : c.accentMuted }]}>
                  {o.snapshot.items.length} activities · {minutesLabel(estimateSec(o.snapshot.items))}{o.recurring ? ' · repeats' : ''}{o.modified ? ' · edited' : ''}{doneHere ? ' · done' : ''}
                </Text>
              </View>
              <Feather name={doneHere ? 'check-circle' : 'chevron-right'} size={20} color={doneHere ? c.secondaryForeground : c.accentForeground} />
            </Pressable>
          );
        })}

        {showGen && gen?.session ? (
          <View style={[s.gen, { borderColor: c.border }]}>
            <Pressable onPress={() => { tap(); setOpenGen(!openGen); }} style={s.genHead}>
              <View style={{ flex: 1 }}>
                <Eyebrow>Suggested by Tempo</Eyebrow>
                <Text style={[s.genTitle, { color: c.foreground }]}>{gen.session.title}</Text>
                <Text style={[s.occMeta, { color: c.mutedForeground }]}>{gen.session.minutes} min · {gen.session.exercises.length} activities{gen.date !== todayKey ? ' · forecast' : ''}</Text>
              </View>
              <Feather name={openGen ? 'chevron-up' : 'chevron-down'} size={20} color={c.mutedForeground} />
            </Pressable>
            {openGen ? (
              <View style={{ marginTop: 10, gap: 6 }}>
                {gen.session.exercises.map((e) => (
                  <View key={e.exerciseId} style={s.exRow}>
                    <Text style={[s.exName, { color: c.foreground }]}>{e.name}</Text>
                    <Text style={[s.exT, { color: c.mutedForeground }]}>{e.sets}×{targetLabel(e)}</Text>
                  </View>
                ))}
                <Text style={[s.hint, { color: c.mutedForeground }]}>{gen.session.note || gen.reason}</Text>
                {gen.date === todayKey ? <Button compact label="Start suggestion" icon="play" onPress={() => { startSession(); router.push('/session'); }} style={{ marginTop: 6 }} /> : <Text style={[s.hint, { color: c.mutedForeground }]}>Rebuilt on the day from your latest history. Your scheduled sessions always take priority.</Text>}
              </View>
            ) : null}
          </View>
        ) : null}

        {dayDone.map((x) => (
          <View key={x.id} style={[s.doneRow, { borderColor: c.border }]}>
            <Feather name="check" size={16} color={c.done} />
            <Text style={[s.exName, { color: c.foreground }]}>{x.title}</Text>
            <Text style={[s.exT, { color: c.mutedForeground }]}>{Math.max(1, Math.round(x.activeSeconds / 60))} min</Text>
          </View>
        ))}

        {!dayOcc.length && !showGen && !dayDone.length ? (
          <View style={[s.empty, { borderColor: c.border }]}>
            <Text style={[s.genTitle, { color: c.foreground }]}>{gen && !gen.session ? 'Rest day' : 'Nothing planned'}</Text>
            <Text style={[s.hint, { color: c.mutedForeground, textAlign: 'center' }]}>{gen && !gen.session ? 'Recovery is part of the plan. You can still add something light.' : 'Schedule a routine or a single activity for this day.'}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[s.hint, { color: c.mutedForeground, marginTop: 24 }]}>
        Your scheduled workouts are never overwritten. Tempo’s suggestions only fill days you leave open, and they’re rebuilt each morning from what you actually did.
      </Text>
      <Pressable onPress={() => router.push('/setup')} style={{ marginTop: 10, alignSelf: 'flex-start' }} hitSlop={8}>
        <Text style={[s.link, { color: c.primary }]}>Edit availability for suggestions</Text>
      </Pressable>
    </ScrollView>
  );
}

function Legend({ color, ring, label }: { color?: string; ring?: string; label: string }) {
  const c = useColors();
  return (
    <View style={s.lg}>
      <View style={[s.lgDot, color ? { backgroundColor: color } : { borderWidth: 1.2, borderColor: ring }]} />
      <Text style={[s.lgText, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  cal: { borderRadius: 24, borderWidth: 1, padding: 12, marginTop: 14 },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 8 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lgDot: { width: 8, height: 8, borderRadius: 4 },
  lgText: { fontFamily: fonts.body, fontSize: 12 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: 'underline' },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  dayTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.6, flex: 1 },
  occ: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 16, gap: 12 },
  occTitle: { fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4 },
  occMeta: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  gen: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 22, padding: 16 },
  genHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  genTitle: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, marginTop: 2 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  exName: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  exT: { fontFamily: fonts.displayMedium, fontSize: 13 },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 22, padding: 22, alignItems: 'center', gap: 6 },
});
