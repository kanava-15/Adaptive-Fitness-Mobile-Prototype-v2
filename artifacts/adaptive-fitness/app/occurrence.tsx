import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { MonthGrid, Segmented, ToggleRow } from '@/components/planner';
import { Button, Chip, Eyebrow, IconButton, confirm, notify, success } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { EST_EXPLAIN, Scope, minutesLabel } from '@/lib/domain';
import { DAY_SHORT, prettyDate } from '@/lib/engine';

type Panel = null | 'move' | 'delete';

export default function OccurrenceScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { state, todayKey, occurrence, previewAdapt, startSnapshot, moveOcc, deleteOcc } = useTempo();
  const occ = key ? occurrence(key) : null;
  const [target, setTarget] = useState<number | null>(null);
  const [lowEnergy, setLowEnergy] = useState(false);
  const [approved, setApproved] = useState<Record<string, string>>({});
  const [panel, setPanel] = useState<Panel>(null);
  const [moveTo, setMoveTo] = useState(occ?.date ?? todayKey);
  const [month, setMonth] = useState(occ?.date ?? todayKey);
  const [scope, setScope] = useState<Scope>('one');
  const top = Platform.OS === 'web' ? 67 : Platform.OS === 'ios' ? 20 : insets.top + 12;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  const res = useMemo(
    () => (occ ? previewAdapt(occ.snapshot, { targetMinutes: target, lowEnergy, approvedSubs: approved }, occ.date) : null),
    [occ?.snapshot.id, target, lowEnergy, approved, state.profile, state.customExercises], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const done = state.completions.filter((x) => x.occurrenceKey === key);

  if (!occ || !res) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
        <Feather name="calendar" size={32} color={c.mutedForeground} />
        <Text style={[s.title, { color: c.foreground }]}>Session not found</Text>
        <Text style={[s.hint, { color: c.mutedForeground, textAlign: 'center' }]}>It may have been deleted. Your history is unaffected.</Text>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const start = () => {
    if (state.active) {
      notify('A session is already running', 'Finish or discard it first.');
      router.replace('/session');
      return;
    }
    const errs = startSnapshot({ date: todayKey, occurrenceKey: occ.key, snapshot: occ.snapshot, items: res.items, plannedMinutes: Math.round(res.estimateAfter / 60), adaptation: [...res.safety, ...res.notes] });
    if (errs.length) return notify('Can’t start yet', res.items.length ? errs.join('\n') : 'Every move was removed for safety. Edit the session to add moves you can do.');
    success();
    router.replace('/session');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top, paddingBottom: 150 }}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Eyebrow>{`${prettyDate(occ.date)}${occ.recurring ? ` · every ${occ.weekdays!.map((d) => DAY_SHORT[d]).join(', ')}` : ''}${occ.modified ? ' · edited' : ''}`}</Eyebrow>
            <Text style={[s.title, { color: c.foreground }]}>{occ.snapshot.title}</Text>
          </View>
          <IconButton testID="occ-close" icon="x" label="Close" onPress={() => router.back()} />
        </View>

        {done.length ? (
          <View style={[s.banner, { backgroundColor: c.secondary }]}>
            <Feather name="check-circle" size={16} color={c.secondaryForeground} />
            <Text style={[s.bannerText, { color: c.secondaryForeground }]}>Logged {done.length}× — see Progress for details.</Text>
          </View>
        ) : null}

        <View style={[s.est, { backgroundColor: c.accent }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.estK, { color: c.accentMuted }]}>{res.changed ? 'ADAPTED ESTIMATE' : 'ESTIMATE'}</Text>
            <Text testID="occ-estimate" style={[s.estV, { color: c.accentForeground }]}>{minutesLabel(res.estimateAfter)}</Text>
          </View>
          {res.changed ? <Text style={[s.estNote, { color: c.accentMuted }]}>planned {minutesLabel(res.estimateBefore)}</Text> : null}
        </View>
        <Text style={[s.hint, { color: c.mutedForeground, marginTop: 8 }]}>{EST_EXPLAIN}</Text>

        <Text style={[s.label, { color: c.foreground }]}>Time available</Text>
        <View style={s.wrap}>
          {[null, 10, 15, 20, 30, 45].map((m) => <Chip key={String(m)} testID={`target-${m ?? 'none'}`} label={m ? `${m} min` : 'As planned'} active={target === m} onPress={() => setTarget(m)} />)}
        </View>
        <ToggleRow testID="occ-low-energy" label="Low energy today" hint="Trims sets and holds on unlocked moves. Locked and rehab moves stay as planned." value={lowEnergy} onChange={setLowEnergy} />

        {res.safety.length ? (
          <View style={[s.box, { borderColor: c.destructive }]}>
            <Text style={[s.boxTitle, { color: c.destructive }]}>Safety</Text>
            {res.safety.map((x, i) => <Text key={i} style={[s.boxText, { color: c.foreground }]}>{x}</Text>)}
          </View>
        ) : null}
        {res.infeasible ? (
          <View testID="occ-infeasible" style={[s.box, { borderColor: c.primary }]}>
            <Text style={[s.boxTitle, { color: c.primary }]}>Won’t fit</Text>
            <Text style={[s.boxText, { color: c.foreground }]}>{res.infeasible}</Text>
          </View>
        ) : null}
        {res.notes.length ? (
          <View style={[s.box, { borderColor: c.border }]}>
            <Text style={[s.boxTitle, { color: c.foreground }]}>What changed</Text>
            {res.notes.map((x, i) => <Text key={i} style={[s.boxText, { color: c.mutedForeground }]}>{x}</Text>)}
          </View>
        ) : null}
        {res.suggestions.map((sg) => (
          <View key={sg.itemKey} style={[s.box, { borderColor: c.border }]}>
            <Text style={[s.boxTitle, { color: c.foreground }]}>Swap {sg.itemName}?</Text>
            <Text style={[s.boxText, { color: c.mutedForeground }]}>{sg.reason}</Text>
            <View style={[s.wrap, { marginTop: 8 }]}>
              {sg.options.map((o) => (
                <Chip key={o.id} label={o.name} active={approved[sg.itemKey] === o.id} onPress={() => setApproved((a) => (a[sg.itemKey] === o.id ? Object.fromEntries(Object.entries(a).filter(([k]) => k !== sg.itemKey)) : { ...a, [sg.itemKey]: o.id }))} />
              ))}
            </View>
          </View>
        ))}

        <Text style={[s.label, { color: c.foreground }]}>Moves</Text>
        <View style={{ gap: 6 }}>
          {res.items.length === 0 ? <Text style={[s.hint, { color: c.mutedForeground }]}>No moves left after safety exclusions.</Text> : null}
          {res.items.map((i, n) => (
            <View key={i.key} style={[s.row, { borderBottomColor: c.border }]}>
              <Text style={[s.n, { color: c.mutedForeground }]}>{n + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: c.foreground }]}>{i.name}</Text>
                <Text style={[s.meta, { color: c.mutedForeground }]}>
                  {i.sets} × {i.tracking === 'reps' ? `${i.reps} reps` : `${i.seconds}s`}{i.perSide ? ' / side' : ''} · rest {i.restSec}s{i.load != null ? ` · ${i.load} ${i.unit}` : ''}
                </Text>
              </View>
              {i.locked ? <Feather name="lock" size={14} color={c.mutedForeground} /> : null}
              {i.rehab ? <Feather name="shield" size={14} color={c.secondaryForeground} /> : null}
            </View>
          ))}
        </View>

        <View style={[s.actions]}>
          <Button compact variant="ghost" icon="edit-3" label="Edit" onPress={() => router.push({ pathname: '/builder', params: { occ: occ.key } })} style={{ flex: 1 }} />
          <Button testID="occ-move" compact variant={panel === 'move' ? 'soft' : 'ghost'} icon="move" label="Move" onPress={() => setPanel(panel === 'move' ? null : 'move')} style={{ flex: 1 }} />
          <Button testID="occ-delete" compact variant={panel === 'delete' ? 'danger' : 'ghost'} icon="trash-2" label="Delete" onPress={() => setPanel(panel === 'delete' ? null : 'delete')} style={{ flex: 1 }} />
        </View>

        {panel === 'move' ? (
          <View style={[s.panel, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.hint, { color: c.mutedForeground, marginBottom: 8 }]}>Moves only this session{occ.recurring ? '; the rest of the series stays put' : ''}.</Text>
            <MonthGrid month={month} onMonth={setMonth} selected={moveTo} onSelect={setMoveTo} />
            <Button testID="occ-move-confirm" label={`Move to ${prettyDate(moveTo)}`} disabled={moveTo === occ.date} onPress={() => { moveOcc(occ, moveTo); success(); router.back(); }} style={{ marginTop: 12 }} />
          </View>
        ) : null}
        {panel === 'delete' ? (
          <View style={[s.panel, { backgroundColor: c.card, borderColor: c.border }]}>
            {occ.recurring ? <Segmented testID="occ-delete-scope" options={[{ value: 'one', label: 'Only this one' }, { value: 'future', label: 'This and future' }]} value={scope} onChange={setScope} /> : null}
            <Text style={[s.hint, { color: c.mutedForeground, marginVertical: 10 }]}>Logged history is never deleted.</Text>
            <Button testID="occ-delete-confirm" variant="danger" label={occ.recurring && scope === 'future' ? 'Delete this and future' : 'Delete session'} onPress={() => confirm('Delete scheduled session?', occ.recurring && scope === 'future' ? 'Removes this date and all later ones in the series.' : 'Removes only this date.', 'Delete', () => { deleteOcc(occ, occ.recurring ? scope : 'one'); router.back(); }, true)} />
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
      <View style={[s.footer, { paddingBottom: bottom, backgroundColor: c.background, borderTopColor: c.border }]}>
        <Button testID="occ-start" label={state.active ? 'Resume running session' : occ.date === todayKey ? 'Start session' : 'Start now'} icon="play" onPress={state.active ? () => router.replace('/session') : start} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 4 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginBottom: 12 },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  est: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16 },
  estK: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.3 },
  estV: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  estNote: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  label: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, marginTop: 22, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  box: { borderWidth: 1.5, borderRadius: 16, padding: 14, marginTop: 14, gap: 4 },
  boxTitle: { fontFamily: fonts.bodySemi, fontSize: 14 },
  boxText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  n: { fontFamily: fonts.display, fontSize: 14, width: 18 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 22 },
  panel: { borderWidth: 1, borderRadius: 20, padding: 14, marginTop: 12 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
