import { expandSequence } from '@workspace/activity-catalog';
import type { Activity, CatalogRelease } from '@workspace/activity-catalog';
import type { ActualSet, CompletionV2 } from '@/lib/domain';

export type SequenceStep = { position: number; activityId: string; name: string; side: string; available: boolean; navigable: boolean };
export type SequenceDisplay = { steps: SequenceStep[]; error: string | null };

/** Ordered, expanded (repeats and sides preserved) sequence members. Never throws. */
export function sequenceDisplay(release: CatalogRelease, activity: Activity): SequenceDisplay {
  if (activity.type !== 'sequence') return { steps: [], error: null };
  try {
    const steps = expandSequence(release, activity.id).map((m, i) => {
      const a = release.activities.find(x => x.id === m.activityId);
      return { position: i + 1, activityId: m.activityId, name: a?.name ?? m.activityId, side: m.side, available: !!a, navigable: !!a && !a.archived };
    });
    return { steps, error: null };
  } catch (err) {
    return { steps: [], error: `Unavailable: ${err instanceof Error ? err.message : 'invalid membership'}. Saved workout snapshots are unchanged.` };
  }
}

export type HistoryEntry = { completion: CompletionV2; log: CompletionV2['exercises'][number]; key: string };

/** Every log for the identity (duplicates preserved), newest completion first; stable within a completion. */
export function selectActivityHistory(completions: CompletionV2[], activityId: string): HistoryEntry[] {
  return completions
    .flatMap(completion => completion.exercises.flatMap((log, i) => log.exerciseId === activityId ? [{ completion, log, key: `${completion.id}:${log.itemKey}:${i}` }] : []))
    .sort((a, b) => b.completion.finishedAt.localeCompare(a.completion.finishedAt));
}

export function formatHistorySet(set: ActualSet & { perSide?: boolean }): string {
  const parts = [
    set.reps != null ? `${set.reps} reps` : null,
    set.seconds != null ? `${set.seconds}s` : null,
    set.breaths != null ? `${set.breaths} breaths` : null,
    set.distance != null ? `${set.distance}${set.distanceUnit ? ` ${set.distanceUnit}` : ''}` : null,
    set.load != null ? `${set.load} ${set.unit ?? ''}`.trim() : null,
  ].filter(Boolean).join(' · ') || 'No measured set';
  const side = set.side && (set.side as string) !== 'unspecified' ? ` · ${set.side} side` : '';
  return `${parts}${set.perSide ? ' · per side' : ''}${side}`;
}

export function historyStatus(log: { skipped: boolean; done: boolean }): string {
  return log.skipped ? 'Skipped' : log.done ? 'Completed' : 'Recorded';
}
