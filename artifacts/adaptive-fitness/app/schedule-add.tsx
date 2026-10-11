import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { MonthGrid, Segmented, WeekdayPicker } from '@/components/planner';
import { Button, Chip, EmptyState, Eyebrow, IconButton, success } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { estimateSec, exerciseSourceLabel, findExercise, minutesLabel, snapshotFromItems, snapshotFromRoutine, snapshotErrors, makeItem, snapItem, RoutineItem } from '@/lib/domain';
import { TargetEditor } from '@/components/TargetEditor';
import { DAY_SHORT, addDays, prettyDate, weekday } from '@/lib/engine';

type Mode = 'today' | 'date' | 'weekly';

export default function ScheduleAdd() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ routineId?: string; exerciseId?: string; date?: string }>();
  const { state, todayKey, addSchedule } = useTempo();
  const routines = state.routines.filter((r) => !r.archived);
  const [routineId, setRoutineId] = useState<string | null>(p.routineId ?? (p.exerciseId ? null : routines[0]?.id ?? null));
  const exercise = p.exerciseId ? findExercise(state.customExercises, p.exerciseId) : undefined;
  const [target, setTarget] = useState<RoutineItem | null>(() => exercise ? makeItem(exercise, 'kg', state.presets[exercise.id]) : null);
  const routine = state.routines.find((r) => r.id === routineId);
  const initial = p.date && p.date >= todayKey ? p.date : todayKey;
  const [mode, setMode] = useState<Mode>(p.date && p.date !== todayKey ? 'date' : 'today');
  const [date, setDate] = useState(initial);
  const [month, setMonth] = useState(initial);
  const [weekdays, setWeekdays] = useState<number[]>([weekday(initial)]);
  const [weeks, setWeeks] = useState<'0' | '4' | '8' | '12'>('0');
  const top = Platform.OS === 'web' ? 67 : Platform.OS === 'ios' ? 20 : insets.top + 12;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  const snap = exercise && target ? snapshotFromItems(exercise.name, [snapItem(target, exercise)]) : routine ? snapshotFromRoutine(routine, state.customExercises) : null;
  const start = mode === 'today' ? todayKey : date;
  const until = weeks === '0' ? null : addDays(start, Number(weeks) * 7 - 1);
  const snapErrs = snap ? snapshotErrors(snap.items) : [];
  const canSave = !!snap && snapErrs.length === 0 && (mode !== 'weekly' || weekdays.length > 0);

  const save = () => {
    if (!snap || !canSave) return;
    const errs = addSchedule(snap, start, mode === 'weekly' ? weekdays : null, mode === 'weekly' ? until : null);
    if (errs.length) return;
    success();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top, paddingBottom: 140 }}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Schedule</Eyebrow>
            <Text style={[s.title, { color: c.foreground }]}>Put it on the calendar</Text>
          </View>
          <IconButton testID="schedule-close" icon="x" label="Close" onPress={() => router.back()} />
        </View>

        {exercise ? (
          <View style={{ gap: 12 }}>
            <Text style={[s.pillText, { color: c.foreground }]}>Activity: {exercise.name}</Text>
            <Text style={[s.hint, { color: c.mutedForeground }]}>{exerciseSourceLabel(exercise)} · enter your own target; source review is not clinical certification.</Text>
            {exercise.activity?.type === 'sequence' ? <Button label="Expand sequence — enter member targets" variant="soft" onPress={() => router.replace({ pathname: '/builder', params: { activityId: exercise.id } })} /> : target ? <TargetEditor item={target} definition={exercise} onChange={patch => setTarget(t => t ? { ...t, ...patch } : t)} /> : null}
          </View>
        ) : routines.length === 0 ? (
          <EmptyState icon="layers" title="No routines yet" body="Build a routine first, then schedule it on any day or repeat it weekly.">
            <Button compact icon="plus" label="New routine" onPress={() => router.replace('/builder')} />
          </EmptyState>
        ) : (
          <>
            <Text style={[s.label, { color: c.foreground }]}>Routine</Text>
            <View style={s.wrap}>
              {routines.map((r) => <Chip key={r.id} testID={`pick-routine-${r.id}`} label={r.name} active={r.id === routineId} onPress={() => setRoutineId(r.id)} />)}
            </View>
          </>
        )}
        {snap ? <Text style={[s.hint, { color: c.mutedForeground, marginTop: 10 }]}>{snap.items.length} activities · {minutesLabel(estimateSec(snap.items))}. A copy is saved with each scheduled session, so later edits to the routine don’t silently change it.</Text> : null}

        <Text style={[s.label, { color: c.foreground }]}>When</Text>
        <Segmented testID="schedule-mode" options={[{ value: 'today', label: 'Today' }, { value: 'date', label: 'Pick a date' }, { value: 'weekly', label: 'Weekly' }]} value={mode} onChange={setMode} />

        {mode !== 'today' ? (
          <View style={[s.cal, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.sub, { color: c.mutedForeground }]}>{mode === 'weekly' ? 'STARTING' : 'DATE'} · {prettyDate(date)}</Text>
            <MonthGrid month={month} onMonth={setMonth} selected={date} minDate={todayKey} onSelect={(d) => { setDate(d); if (mode === 'weekly' && !weekdays.length) setWeekdays([weekday(d)]); }} />
          </View>
        ) : null}

        {mode === 'weekly' ? (
          <>
            <Text style={[s.label, { color: c.foreground }]}>Repeat on</Text>
            <WeekdayPicker value={weekdays} onChange={setWeekdays} />
            <Text style={[s.label, { color: c.foreground }]}>For</Text>
            <Segmented options={[{ value: '0', label: 'No end' }, { value: '4', label: '4 wks' }, { value: '8', label: '8 wks' }, { value: '12', label: '12 wks' }]} value={weeks} onChange={setWeeks} />
            <Text style={[s.hint, { color: c.mutedForeground, marginTop: 10 }]}>
              {weekdays.length ? `Every ${weekdays.map((d) => DAY_SHORT[d]).join(', ')} from ${prettyDate(start)}${until ? ` until ${prettyDate(until)}` : ''}.` : 'Pick at least one day.'}
            </Text>
          </>
        ) : null}
      </KeyboardAwareScrollViewCompat>
      <View style={[s.footer, { paddingBottom: bottom, backgroundColor: c.background, borderTopColor: c.border }]}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
        {snapErrs.length ? (
          <View testID="schedule-blocked" style={{ position: 'absolute', left: 20, right: 20, bottom: '100%', gap: 6, padding: 12, borderRadius: 16, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.destructive }}>
            {snapErrs.map((x, i) => <Text key={i} style={{ color: c.destructive, fontFamily: 'Inter_500Medium', fontSize: 13 }}>{x}</Text>)}
            {routine ? <Button compact variant="soft" label="Open routine to fix" icon="edit-2" onPress={() => router.replace({ pathname: '/builder', params: { id: routine.id } })} /> : null}
          </View>
        ) : null}
        <Button testID="schedule-save" label="Schedule" icon="calendar" disabled={!canSave} onPress={save} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 4 },
  label: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, marginTop: 22, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  pill: { borderRadius: 16, padding: 14 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  cal: { borderRadius: 22, borderWidth: 1, padding: 14, marginTop: 14 },
  sub: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.2, marginBottom: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
