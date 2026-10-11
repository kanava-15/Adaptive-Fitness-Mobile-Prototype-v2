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
import { AREAS, AREA_LABEL, DISCIPLINES, DISCIPLINE_LABEL, DistanceUnit, Discipline, ExerciseDef, GEARS, GEAR_LABEL, PersonalPreset, REGIONS, Tracking, findExercise, validateExercise } from '@/lib/domain';
import { REGION_LABEL, newId } from '@/lib/engine';
import { activitySchema, membershipSchema, type Activity } from '@workspace/activity-catalog';
import { z } from 'zod';
import { ActivityDetails } from '@/components/ActivityDetails';
import { KnowledgeEditor } from '@/components/KnowledgeEditor';
import { useCatalog } from '@/context/CatalogContext';
import { knowledgeOf, sequenceDefinitions, personalCatalog, editActivityText } from '@/lib/domain';
import { DetailDisclosure } from '@/components/ExploreActivityContent';

const blank = (): ExerciseDef => ({
  id: newId('cx'),
  version: 1,
  name: '',
  discipline: 'strength',
  gear: ['none'],
  areas: [],
  tracking: 'reps',
  defaultReps: undefined,
  defaultSeconds: undefined,
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
  const [e, setE] = useState<ExerciseDef>(existing ? { ...existing, ...state.presets[existing.id] } : blank());
  const [preset, setPreset] = useState<PersonalPreset>(() => existing ? { ...state.presets[existing.id] } : {});
  const [knowledge, setKnowledge] = useState<Activity>(() => knowledgeOf(existing ?? blank()));
  const [members, setMembers] = useState(() => JSON.stringify(existing?.sequenceMembers ?? [], null, 2));
  const catalog = useCatalog();
  const [advanced, setAdvanced] = useState('');
  const [cuesText, setCuesText] = useState(existing ? knowledgeOf(existing).execution.join('\n') : '');
  const [errors, setErrors] = useState<string[]>([]);
  const top = Platform.OS === 'web' ? 67 : Platform.OS === 'ios' ? 20 : insets.top + 12;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 16;
  const readOnly = !!existing && !existing.custom;
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const set = (p: Partial<ExerciseDef>) => setE((x) => ({ ...x, ...p }));
  const syncAdvanced = (patch: Partial<Activity>) => {
    if (!advanced.trim()) return;
    try { setAdvanced(JSON.stringify({ ...JSON.parse(advanced), ...patch }, null, 2)); }
    catch { /* Keep the invalid draft visible; Save reports its JSON error. */ }
  };
  const editNotes = (notes: string) => {
    set({ instructions: notes });
    setKnowledge(a => editActivityText(a, { notes }));
    syncAdvanced({ description: notes });
  };
  const editSteps = (steps: string) => {
    setCuesText(steps);
    const next = editActivityText(knowledge, { steps });
    setKnowledge(next);
    syncAdvanced({ execution: next.execution });
  };
  const chooseDiscipline = (discipline: Discipline) => {
    set({ discipline, ...(discipline === 'sports' ? { tracking: 'time' as const, areas: [] } : {}) });
    setKnowledge(current => {
      const type = discipline === 'sports' ? 'sport'
        : current.type === 'sport' ? discipline === 'yoga' ? 'asana' : discipline === 'mobility' ? 'mobility-drill' : discipline === 'conditioning' ? 'conditioning-activity' : 'exercise'
          : current.type;
      const next: Activity = {
        ...current,
        discipline,
        type,
        ...(discipline === 'sports' ? { supportedMetrics: ['duration'], distanceUnits: [], laterality: 'not-applicable' as const } : {}),
      };
      syncAdvanced(next);
      return next;
    });
  };
  const editAdvanced = (text: string) => {
    setAdvanced(text);
    try {
      const parsed = activitySchema.safeParse(JSON.parse(text));
      if (!parsed.success) return;
      setKnowledge(parsed.data);
      set({ instructions: parsed.data.description, discipline: parsed.data.discipline, gear: parsed.data.equipment ?? [],
        loadable: parsed.data.loadUnits.length > 0, perSide: ['unilateral', 'alternating'].includes(parsed.data.laterality),
        tracking: parsed.data.supportedMetrics[0] === 'duration' ? 'time' : parsed.data.supportedMetrics[0] ?? 'reps' });
      setCuesText(parsed.data.execution.join('\n'));
    } catch { /* Invalid drafts stay editable and cannot be saved. */ }
  };

  const save = () => {
    const errs = validateExercise(e);
    let a: Activity = { ...knowledge, id: e.id, name: e.name.trim(), discipline: e.discipline, equipment: e.gear,
      loadUnits: e.loadable ? ['kg', 'lb'] : [], description: knowledge.description || e.instructions || e.name,
      authorship: 'user', reviewStatus: 'unreviewed', archived: e.archived };
    if (advanced.trim()) {
      try { a = { ...JSON.parse(advanced), id: e.id, name: e.name.trim(), authorship: 'user', reviewStatus: 'unreviewed' }; }
      catch { errs.push('Structured JSON is invalid. Correct it or clear the advanced field.'); }
    }
    const checked = activitySchema.safeParse(a);
    if (!checked.success) checked.error.issues.forEach(i => errs.push(`${i.path.join('.')}: ${i.message}`));
    if (a.type !== 'sequence' && !a.supportedMetrics.length) errs.push('Select at least one measurement capability so this activity can accept a personal target.');
    if (e.tracking === 'distance' && preset.defaultDistanceUnit && !a.distanceUnits.includes(preset.defaultDistanceUnit)) {
      errs.push('Choose a personal preset distance unit supported by this activity.');
    }
    let sequenceMembers: ExerciseDef['sequenceMembers'];
    if (a.type === 'sequence') {
      try {
        const parsed = z.array(membershipSchema).min(1).max(500).parse(JSON.parse(members));
        if (parsed.some((m, n) => m.sequenceId !== e.id || m.order !== n)) throw new Error('Use the sequence ID shown below and consecutive order starting at 0.');
        sequenceMembers = parsed;
        sequenceDefinitions(e.id, [...state.customExercises.filter(x => x.id !== e.id), { ...e, activity: a, sequenceMembers }]);
      } catch (err) { errs.push(`Sequence membership: ${err instanceof Error ? err.message : 'invalid JSON'}`); }
    }
    setErrors(errs);
    if (errs.length) return;
    const persist = () => {
      const cues = cuesText.split('\n').map((x) => x.trim()).filter(Boolean);
      saveExercise({ ...e, activity: a, sequenceMembers, name: e.name.trim(), cues: a.execution.length ? a.execution : cues, instructions: a.description, tracking: a.supportedMetrics[0] === 'duration' ? 'time' : a.supportedMetrics[0] ?? 'reps', perSide: ['unilateral', 'alternating'].includes(a.laterality) }, preset);
      success();
      router.back();
    };
    const affectedRoutines = existing && existing.tracking !== e.tracking
      ? state.routines.filter(r => r.items.some(it => it.exerciseId === existing.id)).length
      : 0;
    if (affectedRoutines) {
      confirm(
        'Keep saved routine targets?',
        `${affectedRoutines} saved ${affectedRoutines === 1 ? 'routine uses' : 'routines use'} this activity. Saving a new measurement does not change their pinned definitions or targets; edit those routines separately if you want to use the new measurement.`,
        'Save activity',
        persist,
      );
    } else persist();
  };

  if (id && !existing) {
    return (
      <View style={[s.root, { backgroundColor: c.background, paddingTop: top, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Feather name="help-circle" size={32} color={c.mutedForeground} />
        <Text style={[s.title, { color: c.foreground }]}>Activity not found</Text>
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
          <Fact k="Measurement" v={knowledgeOf(existing).supportedMetrics.join(', ')} />
          <Fact k="Equipment" v={existing.gear.map((g) => GEAR_LABEL[g]).join(' + ')} />
          <Fact k="Areas" v={existing.areas.map((a) => AREA_LABEL[a]).join(', ')} />
          <Fact k="Loads" v={existing.stresses.length ? existing.stresses.map((r) => REGION_LABEL[r]).join(', ') : 'Nothing flagged'} />
        </View>
        <ActivityDetails activity={knowledgeOf(existing)} release={personalCatalog(state.customExercises)} />
        <Text style={[s.label, { color: c.foreground }]}>How to</Text>
        {existing.cues.map((cue, i) => (
          <View key={i} style={s.cue}>
            <Text style={[s.cueNum, { color: c.primary }]}>{i + 1}</Text>
            <Text style={[s.body, { color: c.foreground }]}>{cue}</Text>
          </View>
        ))}
        <Text style={[s.hint, { color: c.mutedForeground, marginTop: 14 }]}>General guidance only. Move within a comfortable range and stop if anything hurts.</Text>
        <Button testID="schedule-move" label={existing.activity?.type === 'sequence' ? 'Expand into routine — enter targets' : 'Schedule this activity'} icon="calendar" onPress={() => router.replace(existing.activity?.type === 'sequence' ? { pathname: '/builder', params: { activityId: existing.id } } : { pathname: '/schedule-add', params: { exerciseId: existing.id } })} style={{ marginTop: 20 }} />
        <Button label="Add to a new routine" variant="soft" onPress={() => router.replace({ pathname: '/builder', params: { activityId: existing.id } })} style={{ marginTop: 10 }} />
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={[s.root, { paddingTop: top, paddingBottom: 140 }]} keyboardShouldPersistTaps="handled" bottomOffset={90}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Eyebrow>{existing ? `${existing.contentImport ? 'Externally imported · unverified' : 'User-authored activity'} · v${existing.version} · unreviewed` : 'New custom activity'}</Eyebrow>
            <Text style={[s.title, { color: c.foreground }]}>{existing ? 'Edit activity' : 'Create an activity'}</Text>
          </View>
          <IconButton testID="exercise-close" icon="x" label="Close" onPress={() => router.back()} />
        </View>
        <View style={[s.note, { backgroundColor: c.secondary }]}>
          <Feather name="info" size={16} color={c.secondaryForeground} />
          <Text style={[s.noteText, { color: c.secondaryForeground }]}>User-authored activities are unreviewed and never automatically altered. Edits create a new version; saved routines, sessions and history keep the version they used.</Text>
        </View>
        {existing?.contentImport ? <Text selectable style={[s.hint, { color: c.mutedForeground }]}>Imported from outside Svasthic · author: {existing.contentImport.author ?? 'not stated'} · origin: {existing.contentImport.origin?.origin.id ?? 'unknown'} v{existing.contentImport.origin?.origin.version ?? 'unknown'}. Original authorship/review claims are attribution only, not local verification.</Text> : null}
        {existing?.contentImport?.origin ? <DetailDisclosure title="Imported knowledge and original attribution">
          <ActivityDetails activity={knowledgeOf(existing)} release={{ ...personalCatalog(state.customExercises), sources: [
            ...existing.contentImport.origin.sources,
            ...catalog.state.release.sources.filter(s => !existing.contentImport!.origin!.sources.some(origin => origin.id === s.id)),
          ] }} />
          <Text selectable style={[s.hint, { color: c.mutedForeground }]}>Original claims (unverified): {(existing.contentImport.origin.attribution?.activity ?? existing.contentImport.origin.activity).authorship} · {(existing.contentImport.origin.attribution?.activity ?? existing.contentImport.origin.activity).reviewStatus}</Text>
        </DetailDisclosure> : null}

        <Text style={[s.label, { color: c.foreground }]}>Name</Text>
        <TextInput testID="exercise-name" value={e.name} onChangeText={(name) => set({ name })} placeholder="e.g. Cable face pull" placeholderTextColor={c.mutedForeground} style={[s.input, { borderColor: c.border, backgroundColor: c.card, color: c.foreground }]} />

        <Text style={[s.label, { color: c.foreground }]}>Category</Text>
        <View style={s.wrap}>{DISCIPLINES.map((d) => <Chip key={d} label={DISCIPLINE_LABEL[d]} active={e.discipline === d} onPress={() => chooseDiscipline(d)} />)}</View>

        <Text style={[s.label, { color: c.foreground }]}>Equipment needed</Text>
        <View style={s.wrap}>{GEARS.map((g) => <Chip key={g} label={GEAR_LABEL[g]} active={e.gear.includes(g)} onPress={() => set({ gear: g === 'none' ? ['none'] : toggle(e.gear.filter((x) => x !== 'none'), g) })} />)}</View>

        {e.discipline !== 'sports' ? <>
          <Text style={[s.label, { color: c.foreground }]}>Movement areas</Text>
          <View style={s.wrap}>{AREAS.map((a) => <Chip key={a} label={AREA_LABEL[a]} active={e.areas.includes(a)} onPress={() => set({ areas: toggle(e.areas, a) })} />)}</View>
        </> : <Text style={[s.hint, { color: c.mutedForeground, marginTop: 10 }]}>Sports stay unassigned to movement areas unless you add a specific custom activity with known areas.</Text>}

        <Text style={[s.label, { color: c.foreground }]}>Measurement type</Text>
        <Text style={[s.hint, { color: c.mutedForeground }]}>Choose what you can track for this activity. This is separate from your optional personal preset below.</Text>
        <Segmented testID="exercise-tracking" options={[
          { value: 'reps', label: 'Reps' }, { value: 'time', label: 'Duration' },
          { value: 'distance', label: 'Distance' }, { value: 'breaths', label: 'Breaths' },
        ]} value={e.tracking} onChange={(tracking: Tracking) => {
          set({ tracking });
          setKnowledge(a => ({ ...a, supportedMetrics: [tracking === 'time' ? 'duration' : tracking], distanceUnits: tracking === 'distance' ? ['m', 'km', 'mi', 'yd'] : [] }));
        }} />
        <Text style={[s.label, { color: c.foreground }]}>Personal preset (optional)</Text>
        <Text style={[s.hint, { color: c.mutedForeground }]}>Stored separately from activity knowledge. It only prefills your own routine target and is never presented as a catalog prescription.</Text>
        <View style={[s.row, { marginTop: 12 }]}>
          {e.tracking === 'reps' ? (
            <NumField testID="exercise-reps" label="Preset reps" optional value={preset.defaultReps} min={1} max={200} onChange={(v) => setPreset(x => ({ ...x, defaultReps: v }))} />
          ) : (
            e.tracking === 'time' ? <NumField testID="exercise-seconds" label="Preset duration" optional suffix="s" step={5} value={preset.defaultSeconds} min={5} max={3600} onChange={(v) => setPreset(x => ({ ...x, defaultSeconds: v }))} />
              : e.tracking === 'breaths' ? <NumField testID="exercise-breaths" label="Preset breaths" optional value={preset.defaultBreaths} min={1} max={10000} onChange={(v) => setPreset(x => ({ ...x, defaultBreaths: v }))} />
                : <NumField testID="exercise-distance" label="Preset distance" optional decimals suffix={preset.defaultDistanceUnit ?? 'm'} value={preset.defaultDistance} min={0.01} max={1000000} onChange={(v) => setPreset(x => ({ ...x, defaultDistance: v }))} />
          )}
        </View>
        {e.tracking === 'distance' ? (
          <Segmented testID="exercise-distance-unit" options={(['m', 'km', 'mi', 'yd'] as DistanceUnit[]).map(value => ({ value, label: value }))} value={preset.defaultDistanceUnit ?? 'm'} onChange={(defaultDistanceUnit: DistanceUnit) => setPreset(x => ({ ...x, defaultDistanceUnit }))} />
        ) : null}
        {existing && existing.tracking !== e.tracking && state.routines.some(r => r.items.some(it => it.exerciseId === existing.id)) ? (
          <Text style={[s.hint, { color: c.mutedForeground, marginTop: 8 }]}>Existing routines keep their saved measurement and targets. The next routine can use {e.tracking === 'time' ? 'duration' : e.tracking}.</Text>
        ) : null}
        <ToggleRow label="Per side" hint="Counts each side separately, e.g. left and right leg." value={e.perSide} onChange={(perSide) => { set({ perSide }); setKnowledge(a => ({ ...a, laterality: perSide ? 'unilateral' : 'bilateral' })); }} />
        <ToggleRow label="Track load" hint="Shows a weight field (kg or lb) when logging." value={e.loadable} onChange={(loadable) => set({ loadable })} />

        <Text style={[s.label, { color: c.foreground }]}>Areas it loads</Text>
        <Text style={[s.hint, { color: c.mutedForeground, marginBottom: 8 }]}>Used to respect your exclusions. Leave empty if unsure; Svasthic will tell you it couldn’t check.</Text>
        <View style={s.wrap}>{REGIONS.map((r) => <Chip key={r} label={REGION_LABEL[r]} active={e.stresses.includes(r)} onPress={() => set({ stresses: toggle(e.stresses, r) })} />)}</View>

        <ToggleRow testID="exercise-rehab" label="Prescribed rehabilitation" hint="Svasthic will never shorten, progress or swap this activity. Follow the professional who prescribed it." value={e.rehab} onChange={(rehab) => set({ rehab })} />

        <Text style={[s.label, { color: c.foreground }]}>Steps (one per line)</Text>
        <TextInput testID="exercise-steps" value={cuesText} onChangeText={editSteps} multiline placeholder={'Set up…\nMove…\nReturn…'} placeholderTextColor={c.mutedForeground} style={[s.input, s.area, { borderColor: c.border, backgroundColor: c.card, color: c.foreground }]} />
        <Text style={[s.label, { color: c.foreground }]}>Notes</Text>
        <TextInput testID="exercise-notes" value={knowledge.description} onChangeText={editNotes} multiline placeholder="Seat height 4, slow lowering…" placeholderTextColor={c.mutedForeground} style={[s.input, s.area, { borderColor: c.border, backgroundColor: c.card, color: c.foreground }]} />
        <KnowledgeEditor value={{ ...knowledge, discipline: e.discipline }} onChange={a => {
          setKnowledge(a);
          set({ tracking: a.supportedMetrics[0] === 'duration' ? 'time' : a.supportedMetrics[0] ?? 'reps' });
          syncAdvanced(a);
        }} />
        <Text style={[s.label, { color: c.foreground }]}>Advanced structured knowledge (optional JSON)</Text>
        <Text style={[s.hint, { color: c.mutedForeground }]}>For qualified benefits, provenance references, series context, movement patterns and complete mobility metadata. Uses the same validated activity schema; no dosage allowed.</Text>
        <Button compact variant="soft" label="Populate from current knowledge" onPress={() => setAdvanced(JSON.stringify({ ...knowledge, id: e.id, name: e.name, equipment: e.gear, description: knowledge.description || e.instructions || e.name }, null, 2))} />
        <TextInput accessibilityLabel="Advanced structured knowledge JSON" value={advanced} onChangeText={editAdvanced} multiline style={[s.input, s.area, { color: c.foreground, borderColor: c.border }]} />
        {knowledge.type === 'sequence' || advanced.includes('"sequence"') ? <>
          <Text style={[s.label, { color: c.foreground }]}>Ordered sequence membership</Text>
          <Text selectable style={[s.hint, { color: c.mutedForeground }]}>Sequence ID: {e.id}. JSON array: each entry has sequenceId, activityId, order (starting at 0), and side (left/right/both/unspecified). Repeated activities are retained. No dose belongs here; enter targets when expanding into a routine.</Text>
          <Button compact variant="soft" label="Insert membership example" onPress={() => setMembers(JSON.stringify([{ sequenceId: e.id, activityId: 'march', order: 0, side: 'unspecified' }], null, 2))} />
          <TextInput accessibilityLabel="Sequence membership JSON" value={members} onChangeText={setMembers} multiline style={[s.input, s.area, { color: c.foreground, borderColor: c.border }]} />
          {existing?.activity?.type === 'sequence' ? <ActivityDetails activity={existing.activity} release={personalCatalog(state.customExercises)} /> : null}
        </> : null}

        {errors.length ? (
          <View style={[s.errBox, { borderColor: c.destructive }]}>
            {errors.map((x) => <Text key={x} style={[s.err, { color: c.destructive }]}>{x}</Text>)}
          </View>
        ) : null}

        {existing ? (
          <View style={{ gap: 10, marginTop: 20 }}>
            <Button testID="exercise-export" label="Export this activity" icon="upload" variant="ghost" onPress={() => router.push({ pathname: '/content-exchange', params: { activityId: existing.id } })} />
            <Button label={existing.activity?.type === 'sequence' ? 'Expand into routine — enter targets' : 'Schedule this activity'} icon="calendar" variant="soft" onPress={() => router.replace(existing.activity?.type === 'sequence' ? { pathname: '/builder', params: { activityId: existing.id } } : { pathname: '/schedule-add', params: { exerciseId: existing.id } })} />
            <Button
              testID="exercise-archive"
              label={existing.archived ? 'Restore activity' : 'Archive activity'}
              icon={existing.archived ? 'rotate-ccw' : 'archive'}
              variant="danger"
              onPress={() =>
                existing.archived
                  ? (setExerciseArchived(existing.id, false), router.back())
                  : confirm('Archive this activity?', 'It leaves the library and pickers. Routines, scheduled sessions and history that use it keep working and stay readable.', 'Archive', () => {
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
        <Button testID="exercise-save" label="Save activity" icon="check" onPress={save} style={{ flex: 1.4 }} />
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
