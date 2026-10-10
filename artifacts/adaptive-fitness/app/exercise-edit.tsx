import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { NumField, Segmented, ToggleRow } from '@/components/planner';
import { Button, Chip, Eyebrow, IconButton, confirm, success } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { AREAS, AREA_LABEL, DISCIPLINES, DISCIPLINE_LABEL, ExerciseDef, GEARS, GEAR_LABEL, REGIONS, findExercise, validateExercise } from '@/lib/domain';
import { REGION_LABEL, newId } from '@/lib/engine';

const blank = (): ExerciseDef => ({
  id: newId('cx'),
  version: 1,
  name: '',
  discipline: 'strength',
  gear: ['none'],
  areas: [],
  tracking: 'reps',
  defaultReps: 10,
  defaultSeconds: 30,
  perSide: false,
  loadable: false,
  stresses: [],
  intensity: 1,
  instructions: '',
  cues: [],
  custom: true,
  verified: false,
  rehab: false,
  archived: false,
  createdAt: '',
  updatedAt: '',
});

export default function ExerciseEdit() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, saveExercise, setExerciseArchived } = useTempo();
  const existing = id ? findExercise(state.customExercises, id) : undefined;
  const [e, setE] = useState<ExerciseDef>(existing ? { ...existing } : blank());
  const [cuesText, setCuesText] = useState((existing?.cues ?? []).join('\n'));
  const [errors, setErrors] = useState<string[]>([]);
  const top = Platform.OS === 'web' ? 67 : Platform.OS === 'ios' ? 20 : insets.top + 12;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 16;
  const readOnly = !!existing && !existing.custom;
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const set = (p: Partial<ExerciseDef>) => setE((x) => ({ ...x, ...p }));

  const save = () => {
    const errs = validateExercise(e);
    setErrors(errs);
    if (errs.length) return;
    const cues = cuesText.split('\n').map((x) => x.trim()).filter(Boolean);
    saveExercise({ ...e, name: e.name.trim(), cues, instructions: e.instructions.trim() || cues.join(' '), defaultReps: e.tracking === 'reps' ? e.defaultReps : undefined, defaultSeconds: e.tracking === 'time' ? e.defaultSeconds : undefined });
    success();
    router.back();
  };

  if (id && !existing) {
    return (
      <View style={[s.root, { backgroundColor: c.background, paddingTop: top, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Feather name="help-circle" size={32} color={c.mutedForeground} />
        <Text style={[s.title, { color: c.foreground }]}>Move not found</Text>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  if (readOnly && existing) {
    return (
      <KeyboardAwareScrollViewCompat style={{ backgroundColor: c.background }} contentContainerStyle={[s.root, { paddingTop: top, paddingBottom: bottom + 20 }]}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Eyebrow>{`${DISCIPLINE_LABEL[existing.discipline]} · built-in`}</Eyebrow>
            <Text style={[s.title, { color: c.foreground }]}>{existing.name}</Text>
          </View>
          <IconButton testID="exercise-close" icon="x" label="Close" onPress={() => router.back()} />
        </View>
        <View style={[s.facts, { backgroundColor: c.accent }]}>
          <Fact k="Target" v={existing.tracking === 'reps' ? `${existing.defaultReps} reps${existing.perSide ? ' / side' : ''}` : `${existing.defaultSeconds}s${existing.perSide ? ' / side' : ''}`} />
          <Fact k="Equipment" v={existing.gear.map((g) => GEAR_LABEL[g]).join(' + ')} />
          <Fact k="Areas" v={existing.areas.map((a) => AREA_LABEL[a]).join(', ')} />
          <Fact k="Loads" v={existing.stresses.length ? existing.stresses.map((r) => REGION_LABEL[r]).join(', ') : 'Nothing flagged'} />
        </View>
        <Text style={[s.label, { color: c.foreground }]}>How to</Text>
        {existing.cues.map((cue, i) => (
          <View key={i} style={s.cue}>
            <Text style={[s.cueNum, { color: c.primary }]}>{i + 1}</Text>
            <Text style={[s.body, { color: c.foreground }]}>{cue}</Text>
          </View>
        ))}
        <Text style={[s.hint, { color: c.mutedForeground, marginTop: 14 }]}>General guidance only. Move within a comfortable range and stop if anything hurts.</Text>
        <Button testID="schedule-move" label="Schedule this move" icon="calendar" onPress={() => router.replace({ pathname: '/schedule-add', params: { exerciseId: existing.id } })} style={{ marginTop: 20 }} />
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={[s.root, { paddingTop: top, paddingBottom: 140 }]} keyboardShouldPersistTaps="handled" bottomOffset={90}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Eyebrow>{existing ? `Custom move · v${existing.version}` : 'New custom move'}</Eyebrow>
            <Text style={[s.title, { color: c.foreground }]}>{existing ? 'Edit move' : 'Create a move'}</Text>
          </View>
          <IconButton testID="exercise-close" icon="x" label="Close" onPress={() => router.back()} />
        </View>
        <View style={[s.note, { backgroundColor: c.secondary }]}>
          <Feather name="info" size={16} color={c.secondaryForeground} />
          <Text style={[s.noteText, { color: c.secondaryForeground }]}>Custom moves are never treated as verified safe and are never swapped automatically. Edits create a new version; past sessions keep the version they used.</Text>
        </View>

        <Text style={[s.label, { color: c.foreground }]}>Name</Text>
        <TextInput testID="exercise-name" value={e.name} onChangeText={(name) => set({ name })} placeholder="e.g. Cable face pull" placeholderTextColor={c.mutedForeground} style={[s.input, { borderColor: c.border, backgroundColor: c.card, color: c.foreground }]} />

        <Text style={[s.label, { color: c.foreground }]}>Category</Text>
        <View style={s.wrap}>{DISCIPLINES.map((d) => <Chip key={d} label={DISCIPLINE_LABEL[d]} active={e.discipline === d} onPress={() => set({ discipline: d })} />)}</View>

        <Text style={[s.label, { color: c.foreground }]}>Equipment needed</Text>
        <View style={s.wrap}>{GEARS.map((g) => <Chip key={g} label={GEAR_LABEL[g]} active={e.gear.includes(g)} onPress={() => set({ gear: g === 'none' ? ['none'] : toggle(e.gear.filter((x) => x !== 'none'), g) })} />)}</View>

        <Text style={[s.label, { color: c.foreground }]}>Movement areas</Text>
        <View style={s.wrap}>{AREAS.map((a) => <Chip key={a} label={AREA_LABEL[a]} active={e.areas.includes(a)} onPress={() => set({ areas: toggle(e.areas, a) })} />)}</View>

        <Text style={[s.label, { color: c.foreground }]}>Tracking</Text>
        <Segmented testID="exercise-tracking" options={[{ value: 'reps', label: 'Reps' }, { value: 'time', label: 'Timed' }]} value={e.tracking} onChange={(tracking) => set({ tracking })} />
        <View style={[s.row, { marginTop: 12 }]}>
          {e.tracking === 'reps' ? (
            <NumField testID="exercise-reps" label="Default reps" value={e.defaultReps} min={1} max={200} onChange={(v) => set({ defaultReps: v })} />
          ) : (
            <NumField testID="exercise-seconds" label="Default time" suffix="s" step={5} value={e.defaultSeconds} min={5} max={3600} onChange={(v) => set({ defaultSeconds: v })} />
          )}
        </View>
        <ToggleRow label="Per side" hint="Counts each side separately, e.g. left and right leg." value={e.perSide} onChange={(perSide) => set({ perSide })} />
        <ToggleRow label="Track load" hint="Shows a weight field (kg or lb) when logging." value={e.loadable} onChange={(loadable) => set({ loadable })} />

        <Text style={[s.label, { color: c.foreground }]}>Areas it loads</Text>
        <Text style={[s.hint, { color: c.mutedForeground, marginBottom: 8 }]}>Used to respect your exclusions. Leave empty if unsure; Tempo will tell you it couldn’t check.</Text>
        <View style={s.wrap}>{REGIONS.map((r) => <Chip key={r} label={REGION_LABEL[r]} active={e.stresses.includes(r)} onPress={() => set({ stresses: toggle(e.stresses, r) })} />)}</View>

        <ToggleRow testID="exercise-rehab" label="Prescribed rehabilitation" hint="Tempo will never shorten, progress or swap this move. Follow the professional who prescribed it." value={e.rehab} onChange={(rehab) => set({ rehab })} />

        <Text style={[s.label, { color: c.foreground }]}>Steps (one per line)</Text>
        <TextInput value={cuesText} onChangeText={setCuesText} multiline placeholder={'Set up…\nMove…\nReturn…'} placeholderTextColor={c.mutedForeground} style={[s.input, s.area, { borderColor: c.border, backgroundColor: c.card, color: c.foreground }]} />
        <Text style={[s.label, { color: c.foreground }]}>Notes</Text>
        <TextInput value={e.instructions} onChangeText={(instructions) => set({ instructions })} multiline placeholder="Seat height 4, slow lowering…" placeholderTextColor={c.mutedForeground} style={[s.input, s.area, { borderColor: c.border, backgroundColor: c.card, color: c.foreground }]} />

        {errors.length ? (
          <View style={[s.errBox, { borderColor: c.destructive }]}>
            {errors.map((x) => <Text key={x} style={[s.err, { color: c.destructive }]}>{x}</Text>)}
          </View>
        ) : null}

        {existing ? (
          <View style={{ gap: 10, marginTop: 20 }}>
            <Button label="Schedule this move" icon="calendar" variant="soft" onPress={() => router.replace({ pathname: '/schedule-add', params: { exerciseId: existing.id } })} />
            <Button
              testID="exercise-archive"
              label={existing.archived ? 'Restore move' : 'Archive move'}
              icon={existing.archived ? 'rotate-ccw' : 'archive'}
              variant="danger"
              onPress={() =>
                existing.archived
                  ? (setExerciseArchived(existing.id, false), router.back())
                  : confirm('Archive this move?', 'It leaves the library and pickers. Routines, scheduled sessions and history that use it keep working and stay readable.', 'Archive', () => {
                      setExerciseArchived(existing.id, true);
                      router.back();
                    })
              }
            />
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
      <View style={[s.footer, { paddingBottom: bottom, backgroundColor: c.background, borderTopColor: c.border }]}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button testID="exercise-save" label="Save move" icon="check" onPress={save} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  const c = useColors();
  return (
    <View style={s.fact}>
      <Text style={[s.factK, { color: c.accentMuted }]}>{k.toUpperCase()}</Text>
      <Text style={[s.factV, { color: c.accentForeground }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingHorizontal: 20, flexGrow: 1 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 4 },
  note: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16 },
  noteText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, marginTop: 22, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 48, fontFamily: fonts.body, fontSize: 15 },
  area: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  toggleLabel: { fontFamily: fonts.bodySemi, fontSize: 15 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  errBox: { borderWidth: 1.5, borderRadius: 14, padding: 12, marginTop: 18, gap: 4 },
  err: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  facts: { borderRadius: 22, padding: 18, gap: 12 },
  fact: { gap: 2 },
  factK: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.3 },
  factV: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  cue: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  cueNum: { fontFamily: fonts.display, fontSize: 16, width: 16 },
  body: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
});
