// Tempo engine — pure, deterministic, local. No clinical claims.
// Same inputs always produce the same plan.

export type Region = 'knees' | 'wrists' | 'shoulders' | 'lowerBack' | 'ankles';
export type Equipment = 'none' | 'band' | 'dumbbells';
export type Goal = 'consistency' | 'strength' | 'mobility' | 'energy';
export type Category = 'warm' | 'lower' | 'upper' | 'core' | 'mobility';
export type Minutes = 10 | 20 | 30;

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  kind: 'reps' | 'time';
  reps?: number;
  seconds?: number;
  perSide?: boolean;
  intensity: 1 | 2;
  equipment: Equipment;
  stresses: Region[];
  cues: string[];
}

export const REGION_LABEL: Record<Region, string> = {
  knees: 'Knees',
  wrists: 'Wrists',
  shoulders: 'Shoulders',
  lowerBack: 'Lower back',
  ankles: 'Ankles & jumping',
};
export const GOAL_LABEL: Record<Goal, string> = {
  consistency: 'Keep showing up',
  strength: 'Get a bit stronger',
  mobility: 'Move with less stiffness',
  energy: 'Feel more awake',
};
export const EQUIP_LABEL: Record<Equipment, string> = {
  none: 'Bodyweight',
  band: 'Resistance band',
  dumbbells: 'Dumbbells',
};
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const LIBRARY: Exercise[] = [
  { id: 'march', name: 'March in place', category: 'warm', kind: 'time', seconds: 45, intensity: 1, equipment: 'none', stresses: [], cues: ['Stand tall, lift knees to a comfortable height.', 'Swing arms loosely.', 'Breathe through your nose if you can.'] },
  { id: 'arm-circles', name: 'Arm circles & reach', category: 'warm', kind: 'time', seconds: 40, intensity: 1, equipment: 'none', stresses: [], cues: ['Small circles forward, then back.', 'Finish with a slow overhead reach.', 'Keep shoulders relaxed, away from ears.'] },
  { id: 'step-jacks', name: 'Step jacks', category: 'warm', kind: 'time', seconds: 40, intensity: 2, equipment: 'none', stresses: ['knees', 'ankles'], cues: ['Step one foot out as arms rise.', 'Return and switch sides.', 'No jumping needed.'] },
  { id: 'sit-to-stand', name: 'Sit-to-stand', category: 'lower', kind: 'reps', reps: 10, intensity: 1, equipment: 'none', stresses: ['knees'], cues: ['Sit on a sturdy chair, feet hip-width.', 'Lean forward slightly and stand up fully.', 'Lower back down with control.'] },
  { id: 'split-squat', name: 'Supported split squat', category: 'lower', kind: 'reps', reps: 6, perSide: true, intensity: 2, equipment: 'none', stresses: ['knees'], cues: ['Hold a wall or desk for balance.', 'Lower straight down, only as far as feels good.', 'Push through the front heel to rise.'] },
  { id: 'glute-bridge', name: 'Glute bridge', category: 'lower', kind: 'reps', reps: 12, intensity: 1, equipment: 'none', stresses: ['lowerBack'], cues: ['Lie on your back, knees bent.', 'Press heels down and lift hips.', 'Pause, then lower slowly.'] },
  { id: 'calf-raise', name: 'Calf raise', category: 'lower', kind: 'reps', reps: 15, intensity: 1, equipment: 'none', stresses: ['ankles'], cues: ['Hold a wall lightly.', 'Rise onto the balls of your feet.', 'Lower all the way down.'] },
  { id: 'side-leg', name: 'Side-lying leg raise', category: 'lower', kind: 'reps', reps: 10, perSide: true, intensity: 1, equipment: 'none', stresses: [], cues: ['Lie on your side, head supported.', 'Lift the top leg slowly.', 'Keep hips stacked.'] },
  { id: 'db-rdl', name: 'Dumbbell hip hinge', category: 'lower', kind: 'reps', reps: 10, intensity: 2, equipment: 'dumbbells', stresses: ['lowerBack'], cues: ['Soft knees, weights in front of thighs.', 'Push hips back, keep the back long.', 'Stand by squeezing glutes.'] },
  { id: 'wall-push', name: 'Wall push-up', category: 'upper', kind: 'reps', reps: 10, intensity: 1, equipment: 'none', stresses: ['wrists', 'shoulders'], cues: ['Hands on the wall at shoulder height.', 'Bend elbows, bring chest toward the wall.', 'Press back to start.'] },
  { id: 'incline-push', name: 'Desk push-up', category: 'upper', kind: 'reps', reps: 8, intensity: 2, equipment: 'none', stresses: ['wrists', 'shoulders'], cues: ['Hands on a stable desk or counter.', 'Body in one line from head to heels.', 'Lower with control, press away.'] },
  { id: 'band-row', name: 'Band row', category: 'upper', kind: 'reps', reps: 12, intensity: 1, equipment: 'band', stresses: [], cues: ['Anchor the band at chest height.', 'Pull elbows back, squeeze shoulder blades.', 'Return slowly.'] },
  { id: 'db-row', name: 'Supported dumbbell row', category: 'upper', kind: 'reps', reps: 10, perSide: true, intensity: 2, equipment: 'dumbbells', stresses: [], cues: ['One hand on a chair, back flat.', 'Pull the weight toward your hip.', 'Lower fully.'] },
  { id: 'prone-y', name: 'Floor Y raise', category: 'upper', kind: 'reps', reps: 8, intensity: 1, equipment: 'none', stresses: [], cues: ['Lie face down, arms overhead in a Y.', 'Lift arms a few centimetres.', 'Lower slowly. Small is fine.'] },
  { id: 'dead-bug', name: 'Dead bug', category: 'core', kind: 'reps', reps: 8, perSide: true, intensity: 1, equipment: 'none', stresses: [], cues: ['On your back, arms up, knees over hips.', 'Extend opposite arm and leg slowly.', 'Keep your low back gently pressed down.'] },
  { id: 'bird-dog', name: 'Bird dog', category: 'core', kind: 'reps', reps: 8, perSide: true, intensity: 1, equipment: 'none', stresses: ['wrists', 'knees'], cues: ['On hands and knees.', 'Reach opposite arm and leg long.', 'Pause, return, switch.'] },
  { id: 'incline-plank', name: 'Desk plank', category: 'core', kind: 'time', seconds: 25, intensity: 2, equipment: 'none', stresses: ['wrists', 'shoulders'], cues: ['Forearms or hands on a desk.', 'Long line from head to heels.', 'Breathe steadily the whole time.'] },
  { id: 'standing-crunch', name: 'Standing knee lift', category: 'core', kind: 'reps', reps: 10, perSide: true, intensity: 1, equipment: 'none', stresses: [], cues: ['Hands behind head or on hips.', 'Lift one knee, brace lightly.', 'Alternate sides.'] },
  { id: 'open-book', name: 'Open book rotation', category: 'mobility', kind: 'reps', reps: 6, perSide: true, intensity: 1, equipment: 'none', stresses: [], cues: ['Lie on your side, knees bent.', 'Open your top arm across, following it with your eyes.', 'Return slowly.'] },
  { id: 'cat-cow', name: 'Seated cat-cow', category: 'mobility', kind: 'reps', reps: 8, intensity: 1, equipment: 'none', stresses: [], cues: ['Sit tall, hands on knees.', 'Round your back, then lift your chest.', 'Move with your breath.'] },
  { id: 'hip-flexor', name: 'Standing hip flexor stretch', category: 'mobility', kind: 'time', seconds: 30, perSide: true, intensity: 1, equipment: 'none', stresses: [], cues: ['Step one foot back, hold a wall.', 'Tuck pelvis gently until you feel the front hip.', 'No bouncing.'] },
];

export const exerciseById = (id: string): Exercise | undefined => LIBRARY.find((e) => e.id === id);

export interface Profile {
  setupDone: boolean;
  goal: Goal;
  equipment: Equipment[];
  exclusions: Region[];
  availability: number[]; // 0 = Sunday
  defaultMinutes: Minutes;
}

export const DEFAULT_PROFILE: Profile = {
  setupDone: false,
  goal: 'consistency',
  equipment: ['none'],
  exclusions: [],
  availability: [1, 3, 5],
  defaultMinutes: 20,
};

export interface PlannedExercise {
  exerciseId: string;
  name: string;
  kind: 'reps' | 'time';
  sets: number;
  reps?: number;
  seconds?: number;
  perSide?: boolean;
  restSec: number;
}

export interface SessionPlan {
  id: string;
  title: string;
  minutes: Minutes;
  lowEnergy: boolean;
  noEquipment: boolean;
  exercises: PlannedExercise[];
  note: string;
}

export interface PlanDay {
  date: string;
  type: 'session' | 'rest';
  session?: SessionPlan;
  reason: string;
}

export interface Plan {
  version: number;
  generatedOn: string;
  days: PlanDay[];
}

export type EventKind = 'starter' | 'setup' | 'rollover' | 'adjusted' | 'profile';

export interface PlanEvent {
  id: string;
  at: string;
  kind: EventKind;
  date: string;
  planVersion: number;
  reason: string;
  before: PlanDay | null;
  after: PlanDay | null;
}

export interface ExerciseLog {
  exerciseId: string;
  name: string;
  kind: 'reps' | 'time';
  plannedSets: number;
  reps: number[]; // per logged set (reps) or seconds (time)
  done: boolean;
  skipped: boolean;
}

export interface Completion {
  id: string;
  date: string;
  sessionId: string;
  title: string;
  plannedMinutes: number;
  startedAt: string;
  finishedAt: string;
  activeSeconds: number;
  exercises: ExerciseLog[];
  finishedEarly: boolean;
  stoppedForPain: boolean;
  difficulty: number | null; // 1-5
}

export type HistoryLike = Pick<Completion, 'date' | 'finishedAt' | 'stoppedForPain' | 'difficulty' | 'finishedEarly'>;

// ---------- date helpers ----------
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}
export const weekday = (k: string) => parseKey(k).getDay();
function seedOf(k: string): number {
  return Math.floor(parseKey(k).getTime() / 86400000);
}

export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- generation ----------
const SLOTS: Record<Minutes, Category[]> = {
  10: ['warm', 'lower', 'upper'],
  20: ['warm', 'lower', 'upper', 'core', 'mobility'],
  30: ['warm', 'lower', 'upper', 'core', 'lower', 'upper', 'mobility'],
};

export interface SessionOptions {
  minutes: Minutes;
  lowEnergy: boolean;
  noEquipment: boolean;
}

export interface Readiness {
  factor: number; // never above 1 — no automatic overload
  note: string | null;
}

/** Look at real history before `date` and decide whether to ease off. Never increases load. */
export function readiness(history: HistoryLike[], date: string): Readiness {
  const past = history.filter((c) => c.date < date).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1));
  if (past.length === 0) return { factor: 1, note: null };
  const last = past[0];
  if (last.stoppedForPain && daysBetween(last.date, date) <= 3)
    return { factor: 0.7, note: 'You stopped for discomfort recently, so this is lighter. Skip anything that doesn’t feel right.' };
  if (daysBetween(last.date, date) > 14)
    return { factor: 0.8, note: 'It’s been a while. This eases back in — nothing to catch up on.' };
  if ((last.difficulty ?? 3) >= 4 && daysBetween(last.date, date) <= 4)
    return { factor: 0.8, note: 'Your last session felt hard, so today is trimmed back.' };
  if (last.finishedEarly && daysBetween(last.date, date) <= 4)
    return { factor: 0.9, note: 'Last time ended early. Slightly less today keeps it doable.' };
  return { factor: 1, note: null };
}

export function eligible(profile: Profile, opts: SessionOptions): Exercise[] {
  return LIBRARY.filter((e) => {
    if (e.stresses.some((r) => profile.exclusions.includes(r))) return false;
    if (opts.noEquipment && e.equipment !== 'none') return false;
    if (!opts.noEquipment && e.equipment !== 'none' && !profile.equipment.includes(e.equipment)) return false;
    if (opts.lowEnergy && e.intensity > 1) return false;
    return true;
  });
}

export function buildSession(profile: Profile, date: string, opts: SessionOptions, r: Readiness): SessionPlan | null {
  const pool = eligible(profile, opts);
  if (pool.length === 0) return null;
  const seed = seedOf(date);
  let slots = [...SLOTS[opts.minutes]];
  if (profile.goal === 'mobility') slots = slots.map((s, i) => (s === 'upper' && i % 2 === 0 ? 'mobility' : s));
  const used = new Set<string>();
  const picks: Exercise[] = [];
  slots.forEach((cat, i) => {
    let candidates = pool.filter((e) => e.category === cat && !used.has(e.id));
    if (profile.goal === 'strength' && !opts.lowEnergy) {
      const harder = candidates.filter((e) => e.intensity === 2);
      if (harder.length) candidates = harder;
    }
    if (candidates.length === 0) candidates = pool.filter((e) => !used.has(e.id));
    if (candidates.length === 0) return;
    const pick = candidates[(seed + i * 3) % candidates.length];
    used.add(pick.id);
    picks.push(pick);
  });
  if (picks.length === 0) return null;

  const factor = Math.min(1, r.factor) * (opts.lowEnergy ? 0.75 : 1);
  const baseSets = opts.minutes === 10 ? 2 : opts.minutes === 20 ? 2 : 3;
  const exercises: PlannedExercise[] = picks.map((e) => {
    const sets = e.category === 'warm' || e.category === 'mobility' ? 1 : Math.max(1, Math.round(baseSets * (factor < 0.8 ? 0.7 : 1)));
    return {
      exerciseId: e.id,
      name: e.name,
      kind: e.kind,
      sets,
      reps: e.reps ? Math.max(4, Math.round(e.reps * factor)) : undefined,
      seconds: e.seconds ? Math.max(15, Math.round((e.seconds * factor) / 5) * 5) : undefined,
      perSide: e.perSide,
      restSec: opts.lowEnergy ? 45 : 30,
    };
  });

  const title = opts.lowEnergy
    ? 'Gentle reset'
    : opts.minutes === 10
      ? 'Quick lift'
      : profile.goal === 'mobility'
        ? 'Loosen up'
        : opts.minutes === 30
          ? 'Full circuit'
          : 'Steady circuit';
  const notes: string[] = [];
  if (r.note) notes.push(r.note);
  if (opts.lowEnergy) notes.push('Low-energy version: easier movements, fewer reps, longer rests.');
  if (opts.noEquipment) notes.push('Bodyweight only.');
  if (profile.exclusions.length) notes.push(`Avoiding movements that load: ${profile.exclusions.map((x) => REGION_LABEL[x].toLowerCase()).join(', ')}.`);
  return {
    id: `s_${date}_${opts.minutes}${opts.lowEnergy ? 'L' : ''}${opts.noEquipment ? 'N' : ''}`,
    title,
    minutes: opts.minutes,
    lowEnergy: opts.lowEnergy,
    noEquipment: opts.noEquipment,
    exercises,
    note: notes.join(' '),
  };
}

const NO_SAFE = 'No movements match your exclusions and equipment, so today is rest. Adjust your exclusions in Settings if that seems wrong.';

export function buildDay(profile: Profile, date: string, history: HistoryLike[], forceSession = false, opts?: Partial<SessionOptions>): PlanDay {
  const available = profile.availability.includes(weekday(date));
  if (!available && !forceSession) return { date, type: 'rest', reason: 'Not one of your training days. Rest counts.' };
  const r = readiness(history, date);
  const session = buildSession(
    profile,
    date,
    { minutes: opts?.minutes ?? profile.defaultMinutes, lowEnergy: opts?.lowEnergy ?? false, noEquipment: opts?.noEquipment ?? !profile.equipment.some((e) => e !== 'none') },
    r,
  );
  if (!session) return { date, type: 'rest', reason: NO_SAFE };
  return { date, type: 'session', session, reason: available ? 'Scheduled training day.' : 'Added by you.' };
}

export function buildPlan(profile: Profile, today: string, history: HistoryLike[], version: number): Plan {
  const days: PlanDay[] = [];
  // Make sure a brand-new user always has something actionable today.
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    days.push(buildDay(profile, d, history, i === 0 && !profile.setupDone));
  }
  return { version, generatedOn: today, days };
}

export type AdjustKind = '10' | '20' | '30' | 'low' | 'noequip';

export const ADJUST_LABEL: Record<AdjustKind, string> = {
  '10': '10 min',
  '20': '20 min',
  '30': '30 min',
  low: 'Low energy',
  noequip: 'No equipment',
};

export function adjustDay(profile: Profile, current: PlanDay, kind: AdjustKind, history: HistoryLike[]): { after: PlanDay; explanation: string } {
  const s = current.session;
  const opts: SessionOptions = {
    minutes: s?.minutes ?? profile.defaultMinutes,
    lowEnergy: s?.lowEnergy ?? false,
    noEquipment: s?.noEquipment ?? false,
  };
  let explanation = '';
  if (kind === '10' || kind === '20' || kind === '30') {
    opts.minutes = Number(kind) as Minutes;
    explanation = current.type === 'rest'
      ? `Adds a ${kind}-minute session to a rest day. Optional — skipping it costs nothing.`
      : `Resizes today to ${kind} minutes. Fewer minutes is still a full session, not a partial one.`;
  } else if (kind === 'low') {
    opts.lowEnergy = !opts.lowEnergy;
    explanation = opts.lowEnergy
      ? 'Swaps to easier movements with fewer reps and longer rests. Good for poor sleep or a draining day.'
      : 'Returns to your regular intensity.';
  } else {
    opts.noEquipment = !opts.noEquipment;
    explanation = opts.noEquipment ? 'Replaces anything that needs a band or weights with bodyweight moves.' : 'Allows your listed equipment again.';
  }
  const session = buildSession(profile, current.date, opts, readiness(history, current.date));
  if (!session) return { after: { date: current.date, type: 'rest', reason: NO_SAFE }, explanation: NO_SAFE };
  return { after: { date: current.date, type: 'session', session, reason: `Adjusted: ${ADJUST_LABEL[kind]}.` }, explanation };
}

export function estimatedSetCount(s: SessionPlan): number {
  return s.exercises.reduce((n, e) => n + e.sets, 0);
}

export function targetLabel(e: { kind: 'reps' | 'time'; reps?: number; seconds?: number; perSide?: boolean }): string {
  const side = e.perSide ? ' / side' : '';
  return e.kind === 'reps' ? `${e.reps ?? 0} reps${side}` : `${e.seconds ?? 0}s${side}`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function prettyDate(k: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' }): string {
  return parseKey(k).toLocaleDateString(undefined, opts);
}
