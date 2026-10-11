import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useCatalog } from './CatalogContext';
import {
  ActiveV2,
  ActualSet,
  AdaptOptions,
  AdaptResult,
  CompletionV2,
  ExerciseDef,
  ImportCheck,
  Occurrence,
  PersonalPreset,
  Routine,
  Scope,
  SnapItem,
  Snapshot,
  StateV2,
  addToActive,
  adapt,
  applyRoutineToFuture,
  checkImport as checkImportPure,
  clockMs,
  completeActive,
  deleteOccurrence,
  editOccurrence,
  emptyState,
  exportPayload,
  findExercise,
  findOccurrence,
  futureRoutineUses,
  loadStored,
  logSetOn,
  moveOccurrence,
  occurrencesBetween,
  withoutAutomaticSuggestions,
  scheduleEntry,
  snapshotErrors,
  snapshotFromRoutine,
  startActive,
  dosageFree,
  knowledgeOf,
  useCatalogRelease,
  RoutineItem,
  snapItem,
  actualErrors,
  activityDef,
  userAuthoredDefinition,
  setSavedActivity as updateSavedActivity,
} from '@/lib/domain';
import { Profile, Region, dateKey, newId } from '@/lib/engine';

export { clockMs };
export type { ImportCheck };
export type TempoState = StateV2;
export type ActiveSession = ActiveV2;

const KEY = 'tempo:v3';
const LEGACY_KEY = 'tempo:v1';

const pause = (c: ActiveV2['clock']) => ({ accMs: clockMs(c), since: null });
const resume = (c: ActiveV2['clock']) => (c.since ? c : { ...c, since: Date.now() });

interface Ctx {
  ready: boolean;
  loadError: string | null;
  dismissLoadError: () => void;
  state: StateV2;
  todayKey: string;
  todayOccurrences: Occurrence[];
  saveProfile: (p: Profile) => void;
  // library
  saveExercise: (e: ExerciseDef, preset?: PersonalPreset) => void;
  setActivitySaved: (id: string, saved: boolean) => void;
  setExerciseArchived: (id: string, archived: boolean) => void;
  // routines
  saveRoutine: (r: Routine) => Routine;
  duplicateRoutine: (id: string) => string | null;
  setRoutineArchived: (id: string, archived: boolean) => void;
  futureUses: (routineId: string) => number;
  pushRoutineToFuture: (routine: Routine) => number;
  // schedule
  addSchedule: (snapshot: Snapshot, start: string, weekdays: number[] | null, until: string | null) => string[];
  occurrence: (key: string) => Occurrence | null;
  occurrencesIn: (from: string, to: string) => Occurrence[];
  moveOcc: (occ: Occurrence, to: string) => void;
  deleteOcc: (occ: Occurrence, scope: Scope) => void;
  editOcc: (occ: Occurrence, snapshot: Snapshot, scope: Scope, weekdays?: number[]) => void;
  previewAdapt: (snapshot: Snapshot, opts: AdaptOptions, date: string) => AdaptResult;
  // execution
  startSnapshot: (args: { date: string; occurrenceKey: string | null; snapshot: Snapshot; items: SnapItem[]; plannedMinutes?: number; adaptation?: string[] }) => string[];
  addExerciseToActive: (exerciseId: string, target?: RoutineItem) => void;
  toggleClock: () => void;
  toggleExClock: () => void;
  resetExClock: () => void;
  logSet: (set: ActualSet) => string[];
  undoSet: () => void;
  markDone: () => void;
  skipExercise: () => void;
  goTo: (index: number) => void;
  finish: (opts: { rpe: number | null; stoppedForPain?: boolean; excludeRegion?: Region }) => CompletionV2 | null;
  discardActive: () => void;
  // data
  exportJson: () => string;
  checkImport: (raw: string) => ImportCheck;
  replaceAll: (data: StateV2) => void;
  resetAll: () => void;
}

const TempoCtx = createContext<Ctx | null>(null);

export function TempoProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  useCatalogRelease(catalog.state.release);
  const [state, setState] = useState<StateV2>(emptyState);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState(dateKey());
  const storageBlocked = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    (async () => {
      let s: StateV2 | null = null;
      try {
        const [v3, v2old, v1] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem('tempo:v2'), AsyncStorage.getItem(LEGACY_KEY)]);
        const v2 = v3 ?? v2old;
        const r = loadStored(v2, v1);
        s = r.state;
        if (r.error) {
          storageBlocked.current = true;
          setLoadError(`${r.error} Automatic saving is disabled to protect the original. Import a backup or explicitly erase data in You to resume saving.`);
          if (v2) await AsyncStorage.setItem(`tempo:backup:${Date.now()}`, v2).catch(() => {});
        }
        // Legacy v1 data stays in place under its old key as a recovery copy.
      } catch {
        storageBlocked.current = true;
        setLoadError('Storage could not be read. Automatic saving is disabled to protect your data. Reopen the app to retry, or import a backup in You.');
      }
      const t = dateKey();
      s = withoutAutomaticSuggestions(s ?? emptyState());
      setTodayKey(t);
      setState(s);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready || storageBlocked.current) return;
    const payload = JSON.stringify(state);
    saveQueue.current = saveQueue.current
      .then(() => AsyncStorage.setItem(KEY, payload))
      .catch(() => setLoadError('Couldn’t save to device storage. Export your data to be safe.'));
  }, [state, ready]);

  useEffect(() => {
    const check = () => {
      const t = dateKey();
      setTodayKey((prev) => (prev === t ? prev : t));
    };
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    const iv = setInterval(check, 60000);
    return () => {
      sub.remove();
      clearInterval(iv);
    };
  }, []);

  const todayOccurrences = useMemo(() => occurrencesBetween(state.schedule, todayKey, todayKey), [state.schedule, todayKey]);

  const saveProfile = useCallback((p: Profile) => {
    setState((s) => withoutAutomaticSuggestions({ ...s, profile: { ...p, setupDone: true } }));
  }, []);

  // ---- library
  const saveExercise = useCallback((e: ExerciseDef, preset?: PersonalPreset) => {
    setState((s) => {
      const prev = s.customExercises.find((x) => x.id === e.id);
      const now = new Date().toISOString();
      const next = userAuthoredDefinition(e, prev, now);
      return { ...s, presets: { ...s.presets, [e.id]: preset ?? { defaultReps: e.defaultReps, defaultSeconds: e.defaultSeconds } }, customExercises: prev ? s.customExercises.map((x) => (x.id === e.id ? next : x)) : [...s.customExercises, next] };
    });
  }, []);
  const setActivitySaved = useCallback((id: string, saved: boolean) => {
    setState(s => updateSavedActivity(s, id, saved, catalog.state.release));
  }, [catalog.state.release]);
  const setExerciseArchived = useCallback((id: string, archived: boolean) => {
    setState((s) => ({ ...s, customExercises: s.customExercises.map((x) => (x.id === id ? { ...x, archived, activity: x.activity ? { ...x.activity, archived } : undefined, updatedAt: new Date().toISOString() } : x)) }));
  }, []);

  // ---- routines
  const saveRoutine = useCallback((r: Routine) => {
    const s = stateRef.current;
    const prev = s.routines.find((x) => x.id === r.id);
    const now = new Date().toISOString();
    const next: Routine = { ...r, items: r.items.map(it => {
      const d = it.definition ?? findExercise(s.customExercises, it.exerciseId);
      return d ? { ...it, definition: dosageFree(d) } : it;
    }), version: prev ? prev.version + 1 : 1, createdAt: prev?.createdAt ?? now, updatedAt: now };
    setState((p) => ({ ...p, routines: prev ? p.routines.map((x) => (x.id === r.id ? next : x)) : [...p.routines, next] }));
    return next;
  }, []);
  const duplicateRoutine = useCallback((id: string) => {
    const src = stateRef.current.routines.find((r) => r.id === id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy: Routine = { ...src, id: newId('rt'), name: `${src.name} (copy)`, version: 1, archived: false, createdAt: now, updatedAt: now, items: src.items.map((i) => ({ ...i, key: newId('it') })) };
    setState((s) => ({ ...s, routines: [...s.routines, copy] }));
    return copy.id;
  }, []);
  const setRoutineArchived = useCallback((id: string, archived: boolean) => {
    setState((s) => ({ ...s, routines: s.routines.map((r) => (r.id === id ? { ...r, archived, updatedAt: new Date().toISOString() } : r)) }));
  }, []);
  const futureUses = useCallback((routineId: string) => futureRoutineUses(stateRef.current.schedule, routineId, dateKey()), []);
  const pushRoutineToFuture = useCallback((r: Routine) => {
    const s = stateRef.current;
    const snap = snapshotFromRoutine(r, s.customExercises);
    const from = dateKey();
    const { changed } = applyRoutineToFuture(s.schedule, r.id, snap, from);
    setState((p) => ({ ...p, schedule: applyRoutineToFuture(p.schedule, r.id, snap, from).schedule }));
    return changed;
  }, []);

  // ---- schedule
  const addSchedule = useCallback((snapshot: Snapshot, start: string, weekdays: number[] | null, until: string | null) => {
    const errs = snapshotErrors(snapshot.items);
    if (errs.length) return errs;
    setState((s) => ({ ...s, schedule: [...s.schedule, scheduleEntry(snapshot, start, weekdays, until)] }));
    return [];
  }, []);
  const occurrence = useCallback((key: string) => findOccurrence(stateRef.current.schedule, key), []);
  const occurrencesIn = useCallback((from: string, to: string) => occurrencesBetween(stateRef.current.schedule, from, to), []);
  const moveOcc = useCallback((occ: Occurrence, to: string) => setState((s) => ({ ...s, schedule: moveOccurrence(s.schedule, occ, to) })), []);
  const deleteOcc = useCallback((occ: Occurrence, scope: Scope) => setState((s) => ({ ...s, schedule: deleteOccurrence(s.schedule, occ, scope) })), []);
  const editOcc = useCallback((occ: Occurrence, snapshot: Snapshot, scope: Scope, weekdays?: number[]) => setState((s) => ({ ...s, schedule: editOccurrence(s.schedule, occ, snapshot, scope, weekdays) })), []);
  const previewAdapt = useCallback((snapshot: Snapshot, opts: AdaptOptions, date: string) => {
    const s = stateRef.current;
    return adapt(snapshot, s.profile, s.customExercises, opts, s.completions, date);
  }, []);

  // ---- execution
  const updateActive = (fn: (a: ActiveV2) => ActiveV2) => setState((s) => (s.active ? { ...s, active: fn(s.active) } : s));

  const startSnapshot = useCallback((args: { date: string; occurrenceKey: string | null; snapshot: Snapshot; items: SnapItem[]; plannedMinutes?: number; adaptation?: string[] }) => {
    if (stateRef.current.active) return ['A session is already running.'];
    const errs = snapshotErrors(args.items);
    if (errs.length) return errs;
    setState((s) => (s.active ? s : { ...s, active: startActive(args) }));
    return [];
  }, []);
  const addExerciseToActive = useCallback((exerciseId: string, target?: RoutineItem) => {
    const d = target?.definition ?? findExercise(stateRef.current.customExercises, exerciseId);
    if (!d || !target) return;
    if (snapshotErrors([snapItem(target, d)]).length) return;
    updateActive((a) => addToActive(a, d, target));
  }, []);

  const toggleClock = useCallback(() => updateActive((a) => (a.clock.since ? { ...a, clock: pause(a.clock), exClock: pause(a.exClock) } : { ...a, clock: resume(a.clock) })), []);
  const toggleExClock = useCallback(() => updateActive((a) => (a.exClock.since ? { ...a, exClock: pause(a.exClock) } : { ...a, exClock: resume(a.exClock), clock: resume(a.clock) })), []);
  const resetExClock = useCallback(() => updateActive((a) => ({ ...a, exClock: { accMs: 0, since: null } })), []);
  const logSet = useCallback((set: ActualSet) => {
    const active = stateRef.current.active;
    if (!active) return ['There is no session running.'];
    const errors = actualErrors(set, active.items[active.index]);
    if (errors.length) return errors;
    updateActive(a => logSetOn(a, set));
    return [];
  }, []);
  const undoSet = useCallback(() => updateActive((a) => ({ ...a, logs: a.logs.map((l, i) => (i === a.index ? { ...l, sets: l.sets.slice(0, -1), done: false } : l)) })), []);
  const markDone = useCallback(() => {
    updateActive((a) => {
      const logs = a.logs.map((l, i) => (i === a.index ? { ...l, done: !l.done, skipped: false } : l));
      const next = logs.findIndex((l, i) => i > a.index && !l.done && !l.skipped);
      return { ...a, logs, index: logs[a.index].done && next >= 0 ? next : a.index, exClock: { accMs: 0, since: null } };
    });
  }, []);
  const skipExercise = useCallback(() => {
    updateActive((a) => {
      const logs = a.logs.map((l, i) => (i === a.index ? { ...l, skipped: true, done: false } : l));
      const next = logs.findIndex((l, i) => i > a.index && !l.done && !l.skipped);
      return { ...a, logs, index: next >= 0 ? next : a.index, exClock: { accMs: 0, since: null } };
    });
  }, []);
  const goTo = useCallback((index: number) => updateActive((a) => ({ ...a, index: Math.max(0, Math.min(a.logs.length - 1, index)), exClock: { accMs: 0, since: null } })), []);

  const finish = useCallback((opts: { rpe: number | null; stoppedForPain?: boolean; excludeRegion?: Region }) => {
    const a = stateRef.current.active;
    if (!a) return null;
    const c = completeActive(a, opts);
    setState((p) => {
      let next: StateV2 = { ...p, active: null, completions: [...p.completions, c] };
      if (opts.excludeRegion && !p.profile.exclusions.includes(opts.excludeRegion)) {
        next = { ...next, profile: { ...p.profile, exclusions: [...p.profile.exclusions, opts.excludeRegion] } };
      }
      return next;
    });
    return c;
  }, []);
  const discardActive = useCallback(() => setState((s) => ({ ...s, active: null })), []);

  // ---- data
  const exportJson = useCallback(() => JSON.stringify(exportPayload(stateRef.current), null, 2), []);
  const checkImport = useCallback((raw: string) => checkImportPure(raw), []);
  const replaceAll = useCallback((data: StateV2) => {
    storageBlocked.current = false;
    setLoadError(null);
    setTodayKey(dateKey());
    setState(withoutAutomaticSuggestions(data));
  }, []);
  const resetAll = useCallback(() => {
    storageBlocked.current = false;
    setLoadError(null);
    setTodayKey(dateKey());
    setState(emptyState());
  }, []);
  const dismissLoadError = useCallback(() => { if (!storageBlocked.current) setLoadError(null); }, []);

  const value: Ctx = {
    ready, loadError, dismissLoadError, state, todayKey, todayOccurrences, saveProfile,
    saveExercise, setActivitySaved, setExerciseArchived, saveRoutine, duplicateRoutine, setRoutineArchived, futureUses, pushRoutineToFuture,
    addSchedule, occurrence, occurrencesIn, moveOcc, deleteOcc, editOcc, previewAdapt,
    startSnapshot, addExerciseToActive, toggleClock, toggleExClock, resetExClock, logSet, undoSet, markDone, skipExercise, goTo, finish, discardActive,
    exportJson, checkImport, replaceAll, resetAll,
  };
  return <TempoCtx.Provider value={value}>{children}</TempoCtx.Provider>;
}

export function useTempo() {
  const c = useContext(TempoCtx);
  if (!c) throw new Error('useTempo outside provider');
  return c;
}
