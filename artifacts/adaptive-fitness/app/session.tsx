import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, IconButton, confirm, success, tap, warn, notify } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { clockMs, useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { ExercisePicker, Segmented, NumField } from '@/components/planner';
import { SessionAddition } from '@/components/SessionAddition';
import { CompletionV2, SnapItem, Unit, buildSet, nextLoad, targetLabel, ExerciseDef, DistanceUnit, Side, ActualSet } from '@/lib/domain';
import { REGION_LABEL, Region, formatDuration } from '@/lib/engine';

const targetOf = targetLabel;


function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [active]);
  return now;
}

export default function SessionScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = useTempo();
  const a = t.state.active;
  const [stage, setStage] = useState<'run' | 'finish' | 'pain' | 'done'>('run');
  const [rpe, setRpe] = useState<number | null>(null);
  const [painRegion, setPainRegion] = useState<Region | null>(null);
  const [result, setResult] = useState<CompletionV2 | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { reps?: number; load?: number; unit?: Unit; distanceUnit?: DistanceUnit; side?: Side }>>({});
  const [picking, setPicking] = useState(false);
  const [addition, setAddition] = useState<ExerciseDef | null>(null);
  const now = useNow(!!a && (!!a.clock.since || !!a.exClock.since));
  const firedRef = useRef<string>('');

  const top = Platform.OS === 'web' ? 67 : insets.top + 8;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 12;

  const ex = a ? a.items[a.index] ?? null : null;
  const log = a ? a.logs[a.index] : null;
  const exSec = a ? clockMs(a.exClock, now) / 1000 : 0;
  const remaining = ex?.tracking === 'time' ? Math.max(0, (ex.seconds ?? 0) - exSec) : 0;
  // Drafts are keyed per move, so a load typed on one move never leaks into another.
  const draft = ex ? drafts[ex.key] ?? {} : {};
  const resumed = ex && log ? nextLoad(ex, log.sets) : { load: 0, unit: 'kg' as Unit };
  const loadState = { load: draft.load ?? resumed.load, unit: draft.unit ?? resumed.unit };
  const setDraft = (p: { reps?: number; load?: number; unit?: Unit; distanceUnit?: DistanceUnit; side?: Side }) => { if (ex) setDrafts((d) => ({ ...d, [ex.key]: { ...d[ex.key], ...p } })); };
  const loadRef = useRef(loadState);
  loadRef.current = loadState;
  const sideRef = useRef(draft.side);
  sideRef.current = draft.side;
  const record = (set: ActualSet) => {
    const errors = t.logSet(set);
    if (errors.length) notify('Check actual set', errors.join('\n'));
    else success();
  };

  // Auto-log a timed set when the countdown hits zero.
  useEffect(() => {
    if (!a || !ex || ex.tracking !== 'time' || !a.exClock.since) return;
    const key = `${a.index}-${log?.sets.length}`;
    if (remaining <= 0 && firedRef.current !== key) {
      firedRef.current = key;
      record(buildSet({ ...ex, side: sideRef.current ?? ex.side }, ex.seconds ?? 0, loadRef.current));
    }
  }, [remaining, a, ex, log, t]);

  if (stage === 'done' && result) {
    const sets = result.exercises.reduce((n, e) => n + e.sets.length, 0);
    const moves = result.exercises.filter((e) => e.done).length;
    return (
      <View style={[s.root, { backgroundColor: c.accent, paddingTop: top + 30, paddingBottom: bottom }]}>
        <View style={[s.doneBadge, { backgroundColor: c.done }]}>
          <Feather name={result.stoppedForPain ? 'shield' : 'check'} size={34} color={c.doneForeground} />
        </View>
        <Text style={[s.doneTitle, { color: c.accentForeground }]}>{result.stoppedForPain ? 'Stopped. Good call.' : result.finishedEarly ? 'Saved. Partial still counts.' : 'Session done.'}</Text>
        <Text style={[s.doneBody, { color: c.accentMuted }]}>
          {result.stoppedForPain
            ? 'If pain persists or was sharp, check in with a qualified health professional before your next session. Svasthic is not medical advice.'
            : 'Logged exactly what you did. Tomorrow’s plan will take it into account, conservatively.'}
        </Text>
        <View style={s.doneStats}>
          <Stat label="active time" value={formatDuration(result.activeSeconds)} />
          <Stat label="activities" value={`${moves}/${result.exercises.length}`} />
          <Stat label="sets" value={String(sets)} />
        </View>
        <View style={{ flex: 1 }} />
        <Button testID="done-close" label="Back to today" onPress={() => router.replace('/')} />
      </View>
    );
  }

  if (!a || !ex || !log) {
    return (
      <View style={[s.root, { backgroundColor: c.background, paddingTop: top + 30, alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
        <Feather name="pause-circle" size={36} color={c.mutedForeground} />
        <Text style={[s.exName, { color: c.foreground, textAlign: 'center' }]}>No session running</Text>
        <Button label="Back to today" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const running = !!a.clock.since;
  const total = clockMs(a.clock, now) / 1000;
  const doneCount = a.logs.filter((l) => l.done).length;
  const reps = draft.reps ?? ex.reps ?? ex.breaths ?? ex.distance ?? 0;
  const actualItem = { ...ex, distanceUnit: draft.distanceUnit ?? ex.distanceUnit, side: draft.side ?? (ex.perSide && ex.side === 'unspecified' ? 'both' : ex.side) };
  const showLoad = ex.loadable || ex.load != null;
  const { load, unit } = loadState;

  const finishNow = (stoppedForPain = false) => {
    const r = t.finish({ rpe, stoppedForPain, excludeRegion: stoppedForPain && painRegion ? painRegion : undefined });
    if (r) {
      success();
      setResult(r);
      setStage('done');
    }
  };

  if (stage === 'finish' || stage === 'pain') {
    const isPain = stage === 'pain';
    return (
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[s.root, { paddingTop: top + 12, paddingBottom: bottom + 20 }]}>
        <View style={s.topBar}>
          <IconButton icon="arrow-left" label="Back to session" onPress={() => setStage('run')} />
        </View>
        <Text style={[s.finTitle, { color: c.foreground }]}>{isPain ? 'Stop and save' : doneCount === a.logs.length ? 'Nice. Wrap it up.' : 'Finish early?'}</Text>
        {isPain ? (
          <>
            <Text style={[s.body, { color: c.mutedForeground }]}>Stop if anything hurts — sharp, pinching, or worsening pain is a signal, not a challenge. Where did you feel it? Svasthic can leave out movements that load that area from now on.</Text>
            <View style={s.wrap}>
              {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
                <Chip key={r} label={REGION_LABEL[r]} active={painRegion === r} onPress={() => setPainRegion(painRegion === r ? null : r)} />
              ))}
            </View>
          </>
        ) : (
          <Text style={[s.body, { color: c.mutedForeground }]}>
            {doneCount} of {a.logs.length} activities done in {formatDuration(total)}. Whatever you did gets saved as-is. Nothing carries over as debt.
          </Text>
        )}
        <Text style={[s.label, { color: c.foreground }]}>Session effort (optional RPE)</Text>
        <Text style={[s.small, { color: c.mutedForeground, marginBottom: 8 }]}>0 = rest · 10 = maximum effort. Leave blank if you prefer.</Text>
        <View style={s.rpeScale}>
          {Array.from({ length: 11 }, (_, score) => (
            <Pressable
              key={score}
              testID={`rpe-${score}`}
              accessibilityRole="button"
              accessibilityLabel={`Rate session effort ${score} out of 10`}
              accessibilityState={{ selected: rpe === score }}
              onPress={() => {
                tap();
                setRpe(rpe === score ? null : score);
              }}
              style={[s.rpeButton, { backgroundColor: rpe === score ? c.accent : c.card, borderColor: rpe === score ? c.accent : c.border }]}
            >
              <Text style={[s.rpeNum, { color: rpe === score ? c.accentForeground : c.foreground }]}>{score}</Text>
            </Pressable>
          ))}
        </View>
        <Button testID="save-completion" label={isPain ? 'Stop and save' : 'Save session'} icon="check" onPress={() => finishNow(isPain)} style={{ marginTop: 22 }} />
        <Text style={[s.small, { color: c.mutedForeground }]}>A high rating may make the next plan lighter. A low rating never makes it harder.</Text>
      </ScrollView>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: top, paddingBottom: bottom }]}>
      <View style={s.topBar}>
        <IconButton
          testID="session-close"
          icon="chevron-down"
          label="Minimise"
          onPress={() => router.back()}
        />
        <Pressable testID="session-clock" onPress={() => { tap(); t.toggleClock(); }} style={[s.clock, { backgroundColor: running ? c.accent : c.primary }]}>
          <Feather name={running ? 'pause' : 'play'} size={16} color={running ? c.accentForeground : c.primaryForeground} />
          <Text style={[s.clockText, { color: running ? c.accentForeground : c.primaryForeground }]}>{formatDuration(total)}</Text>
        </Pressable>
        <IconButton
          testID="session-discard"
          icon="trash-2"
          label="Discard"
          onPress={() =>
            confirm('Discard this session?', 'Nothing from this run will be saved. Finish early instead to keep what you did.', 'Discard', () => {
              t.discardActive();
              router.back();
            }, true)
          }
        />
      </View>

      <View style={s.progress}>
        {a.logs.map((l, i) => (
          <Pressable key={l.itemKey} onPress={() => { tap(); t.goTo(i); }} hitSlop={8} style={[s.seg, { backgroundColor: l.done ? c.done : l.skipped ? c.border : i === a.index ? c.primary : c.muted }]} />
        ))}
      </View>
      {!running ? <Text style={[s.paused, { color: c.primary }]}>Paused — tap the clock to resume</Text> : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.counter, { color: c.mutedForeground }]}>ACTIVITY {a.index + 1} OF {a.logs.length}</Text>
        <Text style={[s.exName, { color: c.foreground }]}>{ex.name}</Text>
        <Text style={[s.target, { color: c.primary }]}>
          Set {Math.min(log.sets.length + 1, ex.sets)} of {ex.sets} · {targetOf(ex)}{log.added ? ' · added' : ''}
        </Text>
        <View style={{ gap: 6, marginTop: 14 }}>
          {ex.cues.map((cue, i) => (
            <View key={i} style={s.cue}>
              <View style={[s.cueDot, { backgroundColor: c.accent }]} />
              <Text style={[s.body, { color: c.foreground, flex: 1 }]}>{cue}</Text>
            </View>
          ))}
        </View>

        <View style={[s.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          {ex.tracking === 'time' ? (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <Text style={[s.big, { color: c.foreground }]}>{formatDuration(Math.ceil(remaining))}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button testID="ex-timer" compact label={a.exClock.since ? 'Pause' : exSec > 0 ? 'Resume' : 'Start timer'} icon={a.exClock.since ? 'pause' : 'play'} variant="accent" onPress={t.toggleExClock} />
                <Button compact label="Reset" icon="rotate-ccw" variant="ghost" onPress={t.resetExClock} />
              </View>
              <Button compact label={`Log ${Math.round(exSec) || ex.seconds}s set`} variant="soft" onPress={() => record(buildSet(actualItem, Math.round(exSec) || (ex.seconds ?? 0), loadState))} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 12 }}>
              {ex.tracking === 'distance' ? <>
                <NumField testID="actual-distance" label="Actual distance" value={reps} min={0} decimals max={1000000} onChange={v => setDraft({ reps: v ?? 0 })} />
                <Segmented options={(ex.definition?.activity?.distanceUnits ?? ['m', 'km', 'mi', 'yd'] as DistanceUnit[]).map(u => ({ value: u, label: u }))} value={actualItem.distanceUnit ?? 'm'} onChange={distanceUnit => setDraft({ distanceUnit })} />
              </> : null}
              <View style={s.stepper}>
                <IconButton icon="minus" label={`Fewer ${ex.tracking}`} onPress={() => setDraft({ reps: Math.max(0, reps - 1) })} />
                <Text style={[s.big, { color: c.foreground, minWidth: 90, textAlign: 'center' }]}>{reps}</Text>
                <IconButton icon="plus" label={`More ${ex.tracking}`} onPress={() => setDraft({ reps: reps + 1 })} />
              </View>
              <Text style={{ color: c.mutedForeground }}>{ex.tracking === 'distance' ? actualItem.distanceUnit : ex.tracking}{ex.tracking !== 'reps' ? ' · No duration inferred' : ''}</Text>
              <Button testID="log-set" compact label={`Log set of ${reps}`} icon="check" variant="accent" onPress={() => { record(buildSet(actualItem, reps, loadState)); setDraft({ reps: undefined }); }} />
            </View>
          )}
          {ex.perSide || ['unilateral', 'alternating'].includes(ex.definition?.activity?.laterality ?? '') ? <Segmented options={(['left', 'right', 'both', 'alternating'] as Side[]).map(side => ({ value: side, label: side }))} value={actualItem.side === 'unspecified' || !actualItem.side ? 'both' : actualItem.side} onChange={side => setDraft({ side })} /> : null}
          {showLoad ? (
            <View style={{ alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 }}>
              <View style={s.stepper}>
                <IconButton icon="minus" label="Less load" onPress={() => setDraft({ load: Math.max(0, Math.round((load - (unit === 'kg' ? 2.5 : 5)) * 100) / 100) })} />
                <Text testID="load-value" style={[s.loadBig, { color: c.foreground }]}>{load} {unit}</Text>
                <IconButton icon="plus" label="More load" onPress={() => setDraft({ load: Math.round((load + (unit === 'kg' ? 2.5 : 5)) * 100) / 100 })} />
              </View>
              <View style={{ width: 140 }}>
                <Segmented options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={unit} onChange={(u) => setDraft({ unit: u })} />
              </View>
            </View>
          ) : null}
          {log.sets.length ? (
            <View style={s.logged}>
              {log.sets.map((r, i) => (
                <View key={i} style={[s.logChip, { backgroundColor: c.done }]}>
                  <Text style={[s.logText, { color: c.doneForeground }]}>{targetLabel(r)}</Text>
                </View>
              ))}
              <Pressable onPress={() => { tap(); t.undoSet(); }} hitSlop={10}>
                <Text style={[s.undo, { color: c.mutedForeground }]}>Undo</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={[s.small, { color: c.mutedForeground }]}>Rest about {ex.restSec}s between sets. Fewer reps than listed is completely fine.</Text>
          {(a.adaptation ?? []).length && a.index === 0 ? <Text style={[s.small, { color: c.mutedForeground }]}>{a.adaptation.join(' ')}</Text> : null}
        </View>
      </ScrollView>

      <View style={s.navRow}>
        <IconButton icon="chevron-left" label="Previous" onPress={() => { t.goTo(a.index - 1); }} />
        <Button testID="mark-done" label={log.done ? 'Done — undo' : 'Mark activity done'} icon={log.done ? 'rotate-ccw' : 'check-circle'} variant={log.done ? 'soft' : 'primary'} onPress={() => { success(); t.markDone(); }} style={{ flex: 1 }} />
        <IconButton icon="chevron-right" label="Next" onPress={() => { t.goTo(a.index + 1); }} />
      </View>
      <View style={[s.navRow, { marginTop: 10 }]}>
        <Button testID="pain-stop" compact label="Pain? Stop" icon="alert-octagon" variant="danger" onPress={() => { warn(); setStage('pain'); }} style={{ flex: 1 }} />
        <Button compact label="Skip activity" variant="ghost" onPress={() => { t.skipExercise(); }} style={{ flex: 1 }} />
        <IconButton testID="session-add-move" icon="plus" label="Add an activity" onPress={() => setPicking(true)} />
        <Button testID="finish" compact label={doneCount === a.logs.length ? 'Finish' : 'Finish early'} variant="accent" onPress={() => setStage('finish')} style={{ flex: 1 }} />
      </View>
      <ExercisePicker visible={picking} custom={t.state.customExercises} title="Add to this session" onClose={() => setPicking(false)} onPick={(e) => { setAddition(e); setPicking(false); }} />
      {addition ? <SessionAddition definition={addition} close={() => setAddition(null)} /> : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.statVal, { color: c.accentForeground }]}>{value}</Text>
      <Text style={[s.statLabel, { color: c.accentMuted }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flexGrow: 1, flex: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 44, borderRadius: 22 },
  clockText: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.3 },
  progress: { flexDirection: 'row', gap: 5, marginBottom: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  paused: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 6 },
  counter: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 1.5, marginTop: 18 },
  exName: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -1, marginTop: 4, lineHeight: 36 },
  target: { fontFamily: fonts.displayMedium, fontSize: 17, marginTop: 6 },
  cue: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cueDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  panel: { borderRadius: 24, borderWidth: 1, padding: 18, marginTop: 20, gap: 12 },
  loadBig: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8, minWidth: 110, textAlign: 'center' },
  big: { fontFamily: fonts.display, fontSize: 56, letterSpacing: -2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logged: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center' },
  logChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  logText: { fontFamily: fonts.displayMedium, fontSize: 14 },
  undo: { fontFamily: 'Inter_500Medium', fontSize: 13, marginLeft: 6, textDecorationLine: 'underline' },
  small: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  finTitle: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -1, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  label: { fontFamily: fonts.display, fontSize: 18, marginTop: 24, marginBottom: 10 },
  rpeScale: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rpeButton: { width: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 },
  rpeNum: { fontFamily: fonts.display, fontSize: 17 },
  doneBadge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: fonts.display, fontSize: 36, letterSpacing: -1.2, marginTop: 24, lineHeight: 40 },
  doneBody: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 12 },
  doneStats: { flexDirection: 'row', marginTop: 32, gap: 12 },
  statVal: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
});
