import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ExercisePicker, NumField, Segmented, ToggleRow, WeekdayPicker } from '@/components/planner';
import { CatalogSelectionModal } from '@/components/CatalogSelectionModal';
import { Button, Chip, Eyebrow, IconButton, confirm, success, tap, notify } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import {
  EST_EXPLAIN,
  ExerciseDef,
  PRIORITY_LABEL,
  Priority,
  Routine,
  RoutineItem,
  Scope,
  SnapItem,
  estimateSec,
  findExercise,
  activityDef,
  itemsFromSelection,
  itemOf,
  makeItem,
  minutesLabel,
  snapItem,
  snapshotFromItems,
  validateItem,
  reconcileItem,
  routineMismatches,
  selectionErrors,
} from '@/lib/domain';
import { newId, prettyDate } from '@/lib/engine';
import { TargetEditor } from '@/components/TargetEditor';
import { targetLabel, trackingOf, definitionOfSnap, dosageFree } from '@/lib/domain';

export default function Builder() {
  const { ready } = useTempo();
  const c = useColors();
  const params = useLocalSearchParams<{ id?: string; occ?: string; activityId?: string; explore?: string }>();
  // A deep link/reload can mount the route before device records hydrate.
  // Never initialize a draft from that temporarily empty state.
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 20 }}>
    <Text style={{ color: c.foreground }}>Loading your routine…</Text>
  </View>;
  return <BuilderDraft key={[params.id, params.occ, params.activityId, params.explore].join(':')} />;
}

function BuilderDraft() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id, occ: occKey, activityId, explore } = useLocalSearchParams<{ id?: string; occ?: string; activityId?: string; explore?: string }>();
  const { state, saveRoutine, futureUses, pushRoutineToFuture, occurrence, editOcc } = useTempo();
  const navigation = useNavigation();
  const custom = state.customExercises;
  const routine = id ? state.routines.find((r) => r.id === id) : undefined;
  const occ = occKey ? occurrence(occKey) : null;
  const fallback = useMemo(() => new Map<string, SnapItem>((occ?.snapshot.items ?? []).map((i) => [i.key, i])), [occ?.snapshot.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [name, setName] = useState(routine?.name ?? occ?.snapshot.title ?? '');
  const [notes, setNotes] = useState(routine?.notes ?? '');
  const [initial] = useState(() => {
    const base = routine
      ? routine.items.map(i => ({ ...i }))
      : occ
        ? occ.snapshot.items.map(itemOf)
        : [] as RoutineItem[];
    if (!activityId) return { items: base, error: '' };
    const saved = state.savedActivities.find(item => item.id === activityId);
    const d = findExercise(custom, activityId) ?? (saved ? { ...activityDef(saved.fallback), sequenceMembers: saved.sequenceMembers } : undefined);
    if (!d || d.archived || (explore && !findExercise([], activityId))) return { items: base, error: 'Activity unavailable. Choose another activity from the library.' };
    const batch = itemsFromSelection([d], custom, state.presets);
    if (batch.error) return { items: base, error: batch.error };
    return { items: [...base, ...batch.items], error: '' };
  });
  const [items, setItems] = useState<RoutineItem[]>(initial.items);
  const [open, setOpen] = useState<string | null>(activityId ? initial.items[routine?.items.length ?? 0]?.key ?? null : null);
  const [originalRoutine] = useState(routine ? JSON.stringify(routine) : null);
  const [originalItemCount] = useState(routine?.items.length ?? 0);
  const saving = useRef(false);
  const [picker, setPicker] = useState<{ mode: 'replace'; key: string } | null>(null);
  const [selectionVisible, setSelectionVisible] = useState(false);
  const [errors, setErrors] = useState<string[]>(initial.error ? [initial.error] : []);
  const [batchError, setBatchError] = useState(initial.error);
  const [scope, setScope] = useState<Scope>('one');
  const [weekdays, setWeekdays] = useState<number[]>(occ?.weekdays ?? []);
  const uses = routine ? futureUses(routine.id) : 0;
  const [updateFuture, setUpdateFuture] = useState(false);
  const [itemPositions, setItemPositions] = useState<Record<string, { y: number; height: number }>>({});
  const itemPositionsRef = useRef(itemPositions);
  itemPositionsRef.current = itemPositions;
  const allowExitRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);
  const dragTargetRef = useRef<string | null>(null);
  const top = Platform.OS === 'web' ? 67 : Platform.OS === 'ios' ? 20 : insets.top + 12;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  const resolve = (it: RoutineItem): SnapItem | null => {
    const f = fallback.get(it.key);
    if (f) return { ...f, ...it, tracking: trackingOf(it, f.tracking) };
    const d = it.definition ?? findExercise(custom, it.exerciseId);
    return d ? snapItem(it, d) : null;
  };
  const resolved = items.map(resolve).filter((x): x is SnapItem => !!x);
  const est = estimateSec(resolved);

  const patch = (key: string, p: Partial<RoutineItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const moveItem = (key: string, d: number) =>
    setItems((xs) => {
      const i = xs.findIndex((x) => x.key === key);
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const n = [...xs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const moveItemTo = (key: string, target: number) => setItems(xs => {
    const from = xs.findIndex(item => item.key === key);
    if (from < 0 || target < 0 || target >= xs.length || from === target) return xs;
    const next = [...xs];
    const [item] = next.splice(from, 1);
    next.splice(target, 0, item);
    return next;
  });
  const startDrag = (key: string) => {
    const position = itemPositionsRef.current[key];
    dragStartRef.current = position ? position.y + position.height / 2 : null;
    dragTargetRef.current = key;
  };
  const dragItem = (key: string, dy: number) => {
    if (dragTargetRef.current !== key || dragStartRef.current == null) return;
    const y = dragStartRef.current + dy;
    const positions = itemPositionsRef.current;
    const sorted = items.map((item, index) => ({ item, index, position: positions[item.key] }))
      .filter(entry => !!entry.position)
      .sort((a, b) => a.position!.y - b.position!.y);
    const target = Math.max(0, Math.min(items.length - 1,
      sorted.filter(entry => entry.position!.y + entry.position!.height / 2 < y).length));
    moveItemTo(key, target);
  };
  const endDrag = () => { dragStartRef.current = null; dragTargetRef.current = null; };
  const pick = (e: ExerciseDef) => {
    if (!picker) return;
    if (e.activity?.type === 'sequence') {
      const expanded = itemsFromSelection([e], custom, state.presets);
      if (expanded.error) { notify('Sequence unavailable', expanded.error); return; }
      setItems(xs => xs.flatMap(x => x.key === picker.key ? expanded.items : [x]));
      setOpen(expanded.items[0]?.key ?? null);
      setPicker(null);
      return;
    }
    setItems((xs) => xs.map((x) => (x.key === picker.key ? { ...makeItem(e, x.unit, state.presets[e.id]), key: newId('it'), sets: x.sets, restSec: x.restSec, priority: x.priority, locked: x.locked } : x)));
    setPicker(null);
  };
  const addSelection = (selected: ExerciseDef[]) => {
    const batch = itemsFromSelection(selected, custom, state.presets);
    if (batch.error) {
      setBatchError(batch.error);
      setErrors([batch.error]);
      notify('Sequence unavailable', batch.error);
      setSelectionVisible(false);
      return;
    }
    setItems(current => [...current, ...batch.items]);
    setOpen(batch.items[0]?.key ?? null);
    setBatchError('');
    setErrors([]);
    setSelectionVisible(false);
  };

  const mismatches = routineMismatches({ items }, custom);
  const reconcileAll = () =>
    setItems((xs) => xs.map((x) => {
      const d = findExercise(custom, x.exerciseId);
      return d ? reconcileItem(x, d) : x;
    }));

  const validate = () => {
    const errs: string[] = [];
    if (activityId) {
      if (id && (!routine || routine.archived || JSON.stringify(routine) !== originalRoutine)) errs.push('The original routine changed or is unavailable. Close this draft and select it again.');
      const added = initial.items.slice(originalItemCount);
      errs.push(...selectionErrors(activityId, added, custom));
    }
    if (!name.trim()) errs.push(occ ? 'Give the session a title.' : 'Name the routine.');
    if (!items.length) errs.push('Add at least one activity.');
    items.forEach((it) => {
      const r = resolve(it);
      if (!r) errs.push('An activity is missing from the library.');
      else validateItem(it, r.tracking).forEach((e) => errs.push(`${r.name}: ${e}`));
    });
    if (mismatches.length) errs.push('Confirm new targets for activities whose tracking changed.');
    if (batchError) errs.push(batchError);
    if (occ && scope === 'future' && occ.recurring && !weekdays.length) errs.push('Pick at least one weekday for the series.');
    setErrors(errs);
    return errs.length === 0;
  };
  const hasUnsavedChanges = !!activityId || name !== (routine?.name ?? occ?.snapshot.title ?? '') ||
    notes !== (routine?.notes ?? '') || JSON.stringify(items) !== JSON.stringify(initial.items) ||
    scope !== 'one' || updateFuture;
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (!hasUnsavedChanges || allowExitRef.current) return;
    event.preventDefault();
    confirm(
      'Leave without saving?',
      'Your routine changes are still a draft. Leave now and discard them?',
      'Leave',
      () => {
        allowExitRef.current = true;
        navigation.dispatch(event.data.action);
      },
      true,
    );
  }), [hasUnsavedChanges, navigation]);
  const leaveDraft = () => {
    if (router.canGoBack()) router.back();
    else router.replace(activityId ? '/catalog-search' : '/(tabs)/library');
  };
  const closeDraft = () => {
    const leave = () => { allowExitRef.current = true; leaveDraft(); };
    if (!hasUnsavedChanges) { leave(); return; }
    confirm('Leave without saving?', 'Your routine changes are still a draft. Leave now and discard them?', 'Leave', leave, true);
  };

  const save = () => {
    if (saving.current) return;
    if (!validate()) return;
    saving.current = true;
    if (occ) {
      editOcc(occ, snapshotFromItems(name.trim(), resolved), occ.recurring ? scope : 'one', scope === 'future' ? weekdays : undefined);
      success();
      allowExitRef.current = true;
      leaveDraft();
      return;
    }
    const base: Routine = routine ?? { id: newId('rt'), name: '', notes: '', items: [], version: 0, archived: false, createdAt: '', updatedAt: '' };
    const saved = saveRoutine({ ...base, name: name.trim(), notes: notes.trim(), items });
    if (routine && updateFuture && uses) pushRoutineToFuture(saved);
    success();
    allowExitRef.current = true;
    leaveDraft();
  };

  if ((id && !routine) || (occKey && !occ)) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
        <Feather name="help-circle" size={32} color={c.mutedForeground} />
        <Text style={[s.title, { color: c.foreground }]}>{occKey ? 'Session not found' : 'Routine not found'}</Text>
        <Text style={[s.hint, { color: c.mutedForeground, textAlign: 'center' }]}>It may have been deleted or moved.</Text>
        <Button label="Back" onPress={() => { allowExitRef.current = true; leaveDraft(); }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top, paddingBottom: 160 }} keyboardShouldPersistTaps="handled" bottomOffset={90}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Eyebrow>{occ ? `Scheduled · ${prettyDate(occ.date)}` : routine ? `Routine · v${routine.version}` : 'New routine'}</Eyebrow>
            <Text style={[s.title, { color: c.foreground }]}>{occ ? 'Edit session' : routine ? 'Edit routine' : 'Build a routine'}</Text>
          </View>
          <IconButton testID="builder-close" icon="x" label="Close" onPress={closeDraft} />
        </View>

        <TextInput testID="builder-name" value={name} onChangeText={setName} placeholder={occ ? 'Session title' : 'e.g. Tuesday gym, Morning flow'} placeholderTextColor={c.mutedForeground} style={[s.nameInput, { color: c.foreground, borderColor: c.border }]} />
        {!occ ? <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor={c.mutedForeground} multiline style={[s.notes, { color: c.foreground }]} /> : null}

        <View style={[s.estBar, { backgroundColor: c.accent }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.estK, { color: c.accentMuted }]}>ESTIMATED</Text>
            <Text testID="builder-estimate" style={[s.estV, { color: c.accentForeground }]}>{items.length ? minutesLabel(est) : '—'}</Text>
          </View>
          <Text style={[s.estNote, { color: c.accentMuted }]}>{items.length} activities · {resolved.reduce((n, i) => n + i.sets, 0)} sets{'\n'}rest included when duration known</Text>
        </View>
        <Text style={[s.hint, { color: c.mutedForeground, marginTop: 8 }]}>{EST_EXPLAIN}</Text>

        <View style={{ gap: 10, marginTop: 18 }}>
          <View style={{ gap: 10 }}>
          {items.map((it, n) => {
            const r = resolve(it);
            if (!r) return null;
            const isOpen = open === it.key;
            const target = targetLabel(it);
            return (
              <View key={it.key} onLayout={event => setItemPositions(current => ({ ...current, [it.key]: { y: event.nativeEvent.layout.y, height: event.nativeEvent.layout.height } }))} testID={`item-${n}`} style={[s.item, { backgroundColor: c.card, borderColor: isOpen ? c.primary : c.border }]}>
                <View style={s.itemHead}>
                  <DragHandle label={`Drag to reorder ${r.name}`} onStart={() => startDrag(it.key)} onMove={dy => dragItem(it.key, dy)} onEnd={endDrag} color={c.mutedForeground} />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${r.name} target`} onPress={() => { tap(); setOpen(isOpen ? null : it.key); }} style={s.itemSummary}>
                    <Text style={[s.itemNum, { color: c.mutedForeground }]}>{String(n + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.itemName, { color: c.foreground }]}>{r.name}</Text>
                      <Text style={[s.itemMeta, { color: c.mutedForeground }]}>
                        {it.sets} × {target} · rest {it.restSec}s
                        {it.priority !== 'normal' ? ` · ${PRIORITY_LABEL[it.priority].toLowerCase()}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                  {r.rehab ? <Feather name="shield" size={16} color={c.secondaryForeground} /> : null}
                  <Pressable accessibilityLabel={it.locked ? 'Unlock activity' : 'Lock activity'} testID={`lock-${n}`} hitSlop={8} onPress={() => { tap(); patch(it.key, { locked: !it.locked }); }} style={[s.lock, { backgroundColor: it.locked ? c.primary : c.muted }]}>
                    <Feather name={it.locked ? 'lock' : 'unlock'} size={14} color={it.locked ? c.primaryForeground : c.mutedForeground} />
                  </Pressable>
                </View>
                {isOpen ? (
                  <View style={{ marginTop: 12 }}>
                    <TargetEditor item={it} definition={it.definition ?? definitionOfSnap(r)} index={n} onChange={p => patch(it.key, p)} />
                    <ToggleRow label="Locked" hint="Adaptation won’t trim or swap it. Safety exclusions still remove it, and you’ll be told." value={it.locked} onChange={(locked) => patch(it.key, { locked })} />
                    <Text style={[s.sub, { color: c.mutedForeground }]}>PRIORITY WHEN SHORT ON TIME</Text>
                    <View style={s.wrap}>
                      {(['must', 'normal', 'optional'] as Priority[]).map((p) => <Chip key={p} label={PRIORITY_LABEL[p]} active={it.priority === p} onPress={() => patch(it.key, { priority: p })} />)}
                    </View>
                    {r.rehab ? <Text style={[s.hint, { color: c.secondaryForeground, marginTop: 10 }]}>Marked as prescribed rehab: Tempo will not change it.</Text> : null}
                    <View style={[s.itemActions, { borderTopColor: c.border }]}>
                      <IconButton testID={`move-up-${n}`} icon="arrow-up" label="Move up" onPress={() => moveItem(it.key, -1)} />
                      <IconButton testID={`move-down-${n}`} icon="arrow-down" label="Move down" onPress={() => moveItem(it.key, 1)} />
                      <View style={{ flex: 1 }} />
                      <Button compact variant="ghost" icon="repeat" label="Replace" onPress={() => setPicker({ mode: 'replace', key: it.key })} />
                      <IconButton testID={`remove-${n}`} icon="trash-2" label="Remove" onPress={() => confirm('Remove this activity?', r.name, 'Remove', () => setItems((xs) => xs.filter((x) => x.key !== it.key)), true)} />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
          </View>
        </View>

        {occ && occ.recurring ? (
          <View style={{ marginTop: 24 }}>
            <Text style={[s.sub, { color: c.mutedForeground }]}>APPLY CHANGES TO</Text>
            <Segmented testID="builder-scope" options={[{ value: 'one', label: 'Only this session' }, { value: 'future', label: 'This and future' }]} value={scope} onChange={setScope} />
            {scope === 'future' ? (
              <View style={{ marginTop: 12 }}>
                <Text style={[s.hint, { color: c.mutedForeground, marginBottom: 8 }]}>Repeats on (earlier sessions and history are untouched):</Text>
                <WeekdayPicker value={weekdays} onChange={setWeekdays} />
              </View>
            ) : null}
          </View>
        ) : null}

        {routine && uses > 0 ? (
          <View style={[s.futureBox, { borderColor: c.border, backgroundColor: c.card }]}>
            <ToggleRow testID="builder-update-future" label={`Also update ${uses} upcoming scheduled session${uses === 1 ? '' : 's'}`} hint="Off by default. Scheduled sessions keep the version they were planned with. Past sessions and logged history never change." value={updateFuture} onChange={setUpdateFuture} />
          </View>
        ) : null}

        {mismatches.length ? (
          <View testID="tracking-mismatch" style={[s.mismatch, { backgroundColor: c.card, borderColor: c.destructive }]}>
            <Text style={[s.mmTitle, { color: c.foreground }]}>Tracking changed</Text>
            {mismatches.map((m) => (
              <Text key={m.key} style={[s.mmBody, { color: c.mutedForeground }]}>{m.name} now tracks {m.tracking === 'reps' ? 'reps' : 'time'}. Its old target no longer applies.</Text>
            ))}
            <Text style={[s.mmBody, { color: c.mutedForeground }]}>This can’t be saved or scheduled until you confirm new targets. Start from a personal preset, then adjust below.</Text>
            <Button testID="reconcile" compact variant="soft" icon="check" label={`Reset targets for ${mismatches.length} activities`} onPress={reconcileAll} style={{ marginTop: 8 }} />
          </View>
        ) : null}
        {errors.length ? (
          <View style={[s.errBox, { borderColor: c.destructive }]}>
            {errors.map((x, i) => <Text key={i} style={[s.err, { color: c.destructive }]}>{x}</Text>)}
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
      <View style={[s.footer, { paddingBottom: bottom, backgroundColor: c.background, borderTopColor: c.border }]}>
        <Button testID="builder-add" label="Add Activity" icon="plus" variant="soft" onPress={() => setSelectionVisible(true)} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button testID="builder-cancel" label="Cancel" variant="ghost" onPress={closeDraft} style={{ flex: 1 }} />
          <Button testID="builder-save" label={occ ? 'Save session' : 'Save routine'} icon="check" onPress={save} style={{ flex: 1.4 }} />
        </View>
      </View>
      <ExercisePicker visible={!!picker} custom={custom} title="Replace with" onClose={() => setPicker(null)} onPick={pick} />
      <CatalogSelectionModal visible={selectionVisible} custom={custom} onClose={() => setSelectionVisible(false)} onConfirm={addSelection} />
    </View>
  );
}

function DragHandle({ label, onStart, onMove, onEnd, color }: { label: string; onStart: () => void; onMove: (dy: number) => void; onEnd: () => void; color: string }) {
  const callbacks = useRef({ onStart, onMove, onEnd });
  callbacks.current = { onStart, onMove, onEnd };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 6,
    onPanResponderGrant: () => callbacks.current.onStart(),
    onPanResponderMove: (_event, gesture) => callbacks.current.onMove(gesture.dy),
    onPanResponderRelease: () => callbacks.current.onEnd(),
    onPanResponderTerminate: () => callbacks.current.onEnd(),
  }), []);
  return (
    <View {...responder.panHandlers} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Drag vertically to reorder. Move up and Move down buttons are also available." style={s.dragHandle}>
      <Feather name="menu" size={18} color={color} />
    </View>
  );
}

const s = StyleSheet.create({
  mismatch: { borderWidth: 1.5, borderRadius: 18, padding: 14, marginTop: 14, gap: 4 },
  mmTitle: { fontFamily: fonts.display, fontSize: 17 },
  mmBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 4 },
  nameInput: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.6, borderBottomWidth: 1.5, paddingVertical: 8 },
  notes: { fontFamily: fonts.body, fontSize: 14, marginTop: 8, minHeight: 36 },
  estBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginTop: 16 },
  estK: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.3 },
  estV: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  estNote: { fontFamily: fonts.bodyMedium, fontSize: 13, textAlign: 'right', lineHeight: 19 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  item: { borderRadius: 20, borderWidth: 1.5, padding: 14 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemSummary: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemNum: { fontFamily: fonts.display, fontSize: 14, width: 22 },
  itemName: { fontFamily: fonts.bodySemi, fontSize: 15 },
  itemMeta: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 2 },
  lock: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sub: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 20, minHeight: 56 },
  addText: { fontFamily: fonts.bodySemi, fontSize: 15 },
  futureBox: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingBottom: 14, marginTop: 22 },
  errBox: { borderWidth: 1.5, borderRadius: 14, padding: 12, marginTop: 18, gap: 4 },
  err: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8, paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1 },
  dragHandle: { width: 26, height: 38, alignItems: 'center', justifyContent: 'center' },
});
