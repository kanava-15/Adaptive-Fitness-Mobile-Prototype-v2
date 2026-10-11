import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, IconButton, tap } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import {
  AREAS,
  AREA_LABEL,
  Area,
  DISCIPLINES,
  DISCIPLINE_LABEL,
  Discipline,
  ExerciseDef,
  GEARS,
  GEAR_LABEL,
  Gear,
  LibraryFilter,
  Tracking,
  searchLibrary,
} from '@/lib/domain';
import { DAY_SHORT, addDays, dateKey, parseKey, weekday } from '@/lib/engine';
import { numericValue } from '@/lib/numeric-input';
import { activityTypeSchema, muscleSchema, jointSchema } from '@workspace/activity-catalog';
import { knowledgeOf } from '@/lib/domain';
import { useCatalog } from '@/context/CatalogContext';

// ---------------------------------------------------------------- segmented control
export function Segmented<T extends string>({ options, value, onChange, testID }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string }) {
  const c = useColors();
  return (
    <View testID={testID} style={[s.seg, { backgroundColor: c.muted }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={testID ? `${testID}-${o.value}` : undefined}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[s.segItem, on && { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Text style={[s.segText, { color: on ? c.foreground : c.mutedForeground }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- numeric field with stepper
export function NumField({ label, value, onChange, step = 1, min = 0, max = 9999, suffix, optional, decimals, testID }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; step?: number; min?: number; max?: number; suffix?: string; optional?: boolean; decimals?: boolean; testID?: string }) {
  const c = useColors();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? '' : String(value));
  const bump = (d: number) => {
    const base = draft == null ? value ?? 0 : numericValue(draft, { min, max, optional, decimals }) ?? 0;
    const n = Math.max(min, Math.min(max, Math.round((base + d) * 100) / 100));
    setDraft(null);
    onChange(n);
  };
  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: c.mutedForeground }]}>{label}</Text>
      <View style={[s.stepper, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable accessibilityLabel={`Decrease ${label}`} hitSlop={4} onPress={() => { tap(); bump(-step); }} style={s.stepBtn}>
          <Feather name="minus" size={16} color={c.foreground} />
        </Pressable>
        <TextInput
          testID={testID}
          value={shown}
          onChangeText={(text) => {
            const normalized = text.replace(',', '.') === '.' ? '0.' : text.replace(',', '.');
            if (!(decimals ? /^\d*(?:\.\d{0,2})?$/ : /^\d*$/).test(normalized)) return;
            const next = numericValue(normalized, { min, max, optional, decimals });
            setDraft(normalized);
            onChange(next);
          }}
          // Already committed on edit; blur must not overwrite a subsequent step.
          onBlur={() => setDraft(null)}
          onSubmitEditing={() => setDraft(null)}
          keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
          placeholder={optional ? '—' : '0'}
          placeholderTextColor={c.mutedForeground}
          style={[s.stepInput, { color: c.foreground }]}
        />
        {suffix ? <Text style={[s.suffix, { color: c.mutedForeground }]}>{suffix}</Text> : null}
        <Pressable accessibilityLabel={`Increase ${label}`} hitSlop={4} onPress={() => { tap(); bump(step); }} style={s.stepBtn}>
          <Feather name="plus" size={16} color={c.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange, testID }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const c = useColors();
  return (
    <View style={s.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={[s.toggleLabel, { color: c.foreground }]}>{label}</Text>
        {hint ? <Text style={[s.toggleHint, { color: c.mutedForeground }]}>{hint}</Text> : null}
      </View>
      <Switch testID={testID} value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.border }} thumbColor={c.card} />
    </View>
  );
}

// ---------------------------------------------------------------- calendar
export interface DayMark {
  user: number;
  done: number;
}

export function monthStart(k: string) {
  return `${k.slice(0, 7)}-01`;
}
export function shiftMonth(k: string, n: number) {
  const d = parseKey(monthStart(k));
  d.setMonth(d.getMonth() + n);
  return dateKey(d);
}
export function weekStart(k: string) {
  return addDays(k, -((weekday(k) + 6) % 7)); // Monday-first
}

function DayCell({ d, selected, today, mark, dim, onPress, big }: { d: string; selected: boolean; today: boolean; mark?: DayMark; dim?: boolean; onPress: () => void; big?: boolean }) {
  const c = useColors();
  const fg = selected ? c.primaryForeground : dim ? c.border : c.foreground;
  return (
    <Pressable
      testID={`day-${d}`}
      accessibilityLabel={d}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.cell, big && s.cellBig, { backgroundColor: selected ? c.primary : 'transparent', borderColor: today && !selected ? c.accent : 'transparent' }]}
    >
      <Text style={[s.cellNum, big && { fontSize: 20 }, { color: fg }]}>{Number(d.slice(8))}</Text>
      <View style={s.markRow}>
        {mark?.done ? <View style={[s.mark, { backgroundColor: selected ? c.primaryForeground : c.done }]} /> : null}
        {mark && mark.user > mark.done ? <View style={[s.mark, { backgroundColor: selected ? c.primaryForeground : c.accent }]} /> : null}
      </View>
    </Pressable>
  );
}

export function MonthGrid({ month, selected, onSelect, marks, onMonth, minDate }: { month: string; selected: string; onSelect: (d: string) => void; marks?: Record<string, DayMark>; onMonth: (m: string) => void; minDate?: string }) {
  const c = useColors();
  const today = dateKey();
  const first = monthStart(month);
  const gridStart = weekStart(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const rows = days[35].slice(0, 7) === first.slice(0, 7) ? 6 : 5;
  return (
    <View>
      <View style={s.monthHead}>
        <IconButton icon="chevron-left" label="Previous month" onPress={() => onMonth(shiftMonth(first, -1))} />
        <Text style={[s.monthTitle, { color: c.foreground }]}>{parseKey(first).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <IconButton icon="chevron-right" label="Next month" onPress={() => onMonth(shiftMonth(first, 1))} />
      </View>
      <View style={s.weekRow}>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <Text key={d} style={[s.dow, { color: c.mutedForeground }]}>{DAY_SHORT[d].slice(0, 2)}</Text>
        ))}
      </View>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={s.weekRow}>
          {days.slice(r * 7, r * 7 + 7).map((d) => (
            <DayCell key={d} d={d} selected={d === selected} today={d === today} mark={marks?.[d]} dim={d.slice(0, 7) !== first.slice(0, 7) || (!!minDate && d < minDate)} onPress={() => (minDate && d < minDate ? undefined : onSelect(d))} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function WeekStrip({ anchor, selected, onSelect, marks, onShift }: { anchor: string; selected: string; onSelect: (d: string) => void; marks?: Record<string, DayMark>; onShift: (d: string) => void }) {
  const c = useColors();
  const today = dateKey();
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View>
      <View style={s.monthHead}>
        <IconButton icon="chevron-left" label="Previous week" onPress={() => onShift(addDays(start, -7))} />
        <Text style={[s.monthTitle, { color: c.foreground }]}>
          {parseKey(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {parseKey(days[6]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </Text>
        <IconButton icon="chevron-right" label="Next week" onPress={() => onShift(addDays(start, 7))} />
      </View>
      <View style={s.weekRow}>
        {days.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[s.dow, { color: d === today ? c.primary : c.mutedForeground }]}>{DAY_SHORT[weekday(d)].slice(0, 2)}</Text>
            <DayCell d={d} big selected={d === selected} today={d === today} mark={marks?.[d]} onPress={() => onSelect(d)} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const c = useColors();
  return (
    <View style={s.weekRow}>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const on = value.includes(d);
        return (
          <Pressable
            key={d}
            testID={`weekday-${d}`}
            accessibilityLabel={DAY_SHORT[d]}
            onPress={() => {
              tap();
              onChange(on ? value.filter((x) => x !== d) : [...value, d].sort());
            }}
            style={[s.wd, { backgroundColor: on ? c.accent : c.card, borderColor: on ? c.accent : c.border }]}
          >
            <Text style={[s.wdText, { color: on ? c.accentForeground : c.foreground }]}>{DAY_SHORT[d].slice(0, 2)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- library filters + list
export function useLibraryFilter() {
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [gear, setGear] = useState<Gear | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [type, setType] = useState<LibraryFilter['type']>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [joint, setJoint] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<LibraryFilter['difficulty']>(null);
  const filter: LibraryFilter = { query, discipline, gear, area, tracking, type, muscle, joint, difficulty };
  const active = [discipline, gear, area, tracking, type, muscle, joint, difficulty].filter(Boolean).length;
  return { filter, query, setQuery, discipline, setDiscipline, gear, setGear, area, setArea, tracking, setTracking, type, setType, muscle, setMuscle, joint, setJoint, difficulty, setDifficulty, active, clear: () => { setDiscipline(null); setGear(null); setArea(null); setTracking(null); setType(null); setMuscle(null); setJoint(null); setDifficulty(null); setQuery(''); } };
}
export type LibraryFilterState = ReturnType<typeof useLibraryFilter>;

function ChipRow<T extends string>({ label, values, labels, value, onChange }: { label: string; values: T[]; labels: Record<T, string>; value: T | null; onChange: (v: T | null) => void }) {
  const c = useColors();
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[s.rowLabel, { color: c.mutedForeground }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 20 }}>
        {values.map((v) => (
          <Chip key={v} label={labels[v]} active={value === v} onPress={() => onChange(value === v ? null : v)} />
        ))}
      </ScrollView>
    </View>
  );
}

export function LibraryFilters({ f }: { f: LibraryFilterState }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <View style={[s.search, { backgroundColor: c.card, borderColor: c.border }]}>
        <Feather name="search" size={18} color={c.mutedForeground} />
        <TextInput testID="library-search" value={f.query} onChangeText={f.setQuery} placeholder="Search activities, Sanskrit, aliases…" placeholderTextColor={c.mutedForeground} style={[s.searchInput, { color: c.foreground }]} autoCorrect={false} />
        {f.query ? (
          <Pressable onPress={() => f.setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Feather name="x-circle" size={18} color={c.mutedForeground} />
          </Pressable>
        ) : null}
        <Pressable testID="library-filter-toggle" onPress={() => { tap(); setOpen(!open); }} hitSlop={8} style={[s.filterBtn, { backgroundColor: f.active ? c.accent : c.muted }]} accessibilityLabel="Filters">
          <Feather name="sliders" size={15} color={f.active ? c.accentForeground : c.foreground} />
          {f.active ? <Text style={[s.filterCount, { color: c.accentForeground }]}>{f.active}</Text> : null}
        </Pressable>
      </View>
      {open ? (
        <View>
          <ChipRow label="Discipline" values={DISCIPLINES} labels={DISCIPLINE_LABEL} value={f.discipline} onChange={f.setDiscipline} />
          <ChipRow label="Equipment" values={GEARS} labels={GEAR_LABEL} value={f.gear} onChange={f.setGear} />
          <ChipRow label="Movement area" values={AREAS} labels={AREA_LABEL} value={f.area} onChange={f.setArea} />
          <ChipRow label="Measurement" values={['reps', 'time', 'breaths', 'distance'] as Tracking[]} labels={{ reps: 'Reps', time: 'Duration', breaths: 'Breaths', distance: 'Distance' }} value={f.tracking} onChange={f.setTracking} />
          <ChipRow label="Activity type" values={activityTypeSchema.options} labels={Object.fromEntries(activityTypeSchema.options.map(v => [v, v])) as Record<typeof activityTypeSchema.options[number], string>} value={f.type ?? null} onChange={f.setType} />
          <ChipRow label="Muscle" values={muscleSchema.options} labels={Object.fromEntries(muscleSchema.options.map(v => [v, v]))} value={f.muscle} onChange={f.setMuscle} />
          <ChipRow label="Joint" values={jointSchema.options} labels={Object.fromEntries(jointSchema.options.map(v => [v, v]))} value={f.joint} onChange={f.setJoint} />
          <ChipRow label="Difficulty" values={['beginner', 'intermediate', 'advanced', 'unknown'] as const as ('beginner' | 'intermediate' | 'advanced' | 'unknown')[]} labels={{ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', unknown: 'Unknown' }} value={f.difficulty ?? null} onChange={f.setDifficulty} />
          {f.active ? (
            <Pressable onPress={f.clear} hitSlop={8} style={{ marginTop: 10 }}>
              <Text style={[s.link, { color: c.primary }]}>Clear filters</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ExerciseRow({ e, onPress, right, testID }: { e: ExerciseDef; onPress: () => void; right?: React.ReactNode; testID?: string }) {
  const c = useColors();
  return (
    <Pressable testID={testID} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [s.exRow, { backgroundColor: c.card, borderColor: c.border, opacity: e.archived ? 0.55 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <View style={[s.exBadge, { backgroundColor: e.custom ? c.secondary : c.muted }]}>
        <Text style={[s.exBadgeText, { color: e.custom ? c.secondaryForeground : c.mutedForeground }]}>{e.discipline.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.exName, { color: c.foreground }]} numberOfLines={1}>{e.name}</Text>
        <Text style={[s.exMeta, { color: c.mutedForeground }]} numberOfLines={1}>
          {e.custom ? 'User-authored · unreviewed · ' : ''}{knowledgeOf(e).type} · {knowledgeOf(e).supportedMetrics.join('/')} · {e.gear.map((g) => GEAR_LABEL[g]).join(' + ') || 'Equipment unknown'}{e.archived ? ' · archived' : ''}
        </Text>
      </View>
      {right ?? <Feather name="chevron-right" size={18} color={c.mutedForeground} />}
    </Pressable>
  );
}

export function ExercisePicker({ visible, onClose, onPick, custom, title = 'Add an activity' }: { visible: boolean; onClose: () => void; onPick: (e: ExerciseDef) => void; custom: ExerciseDef[]; title?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const f = useLibraryFilter();
  const catalog = useCatalog();
  const list = searchLibrary(custom, f.filter);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? 67 : Platform.OS === 'ios' ? 16 : insets.top + 12, paddingHorizontal: 20 }}>
        <View style={s.monthHead}>
          <Text style={[s.pickTitle, { color: c.foreground }]}>{title}</Text>
          <IconButton testID="picker-close" icon="x" label="Close" onPress={onClose} />
        </View>
        <LibraryFilters f={f} />
        <FlatList
          style={{ marginTop: 12 }}
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={list.length > 0}
          contentContainerStyle={{ gap: 8, paddingBottom: insets.bottom + 40 }}
          ListEmptyComponent={<Text style={[s.exMeta, { color: c.mutedForeground, textAlign: 'center', marginTop: 30 }]}>No activities match. Clear a filter or create a custom activity from the Library tab.</Text>}
          renderItem={({ item }) => <ExerciseRow testID={`pick-${item.id}`} e={item} onPress={() => onPick(item)} right={<Feather name="plus-circle" size={20} color={c.primary} />} />}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  segItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 8 },
  segText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  field: { flex: 1, minWidth: 140 },
  fieldLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, height: 46 },
  stepBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepInput: { flex: 1, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, minWidth: 30, paddingVertical: 0 },
  suffix: { fontFamily: fonts.bodyMedium, fontSize: 12, marginRight: 2 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitle: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dow: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 11, marginBottom: 4 },
  cell: { flex: 1, aspectRatio: 1, maxHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginVertical: 2 },
  cellBig: { width: '100%', maxHeight: 60, aspectRatio: 0.8 },
  cellNum: { fontFamily: fonts.displayMedium, fontSize: 15 },
  markRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  mark: { width: 6, height: 6, borderRadius: 3 },
  markRing: { width: 6, height: 6, borderRadius: 3, borderWidth: 1.2 },
  wd: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wdText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 6, height: 50 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, paddingVertical: 0 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 38, minWidth: 38, paddingHorizontal: 10, borderRadius: 12, justifyContent: 'center' },
  filterCount: { fontFamily: fonts.bodySemi, fontSize: 12 },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: 'underline' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 12, minHeight: 64 },
  exBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exBadgeText: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.5 },
  exName: { fontFamily: fonts.bodySemi, fontSize: 15 },
  exMeta: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  toggleLabel: { fontFamily: fonts.bodySemi, fontSize: 15 },
  toggleHint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  pickTitle: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.8 },
});
