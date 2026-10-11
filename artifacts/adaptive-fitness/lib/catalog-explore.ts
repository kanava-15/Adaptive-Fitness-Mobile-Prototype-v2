import type { Activity } from '@workspace/activity-catalog';
import { GEAR_LABEL, searchCatalog, type CatalogSearchFilters } from './domain';

/** Explore presentation policy, separate from shared picker/search semantics. */
export function isSportsOnly(filters: CatalogSearchFilters): boolean {
  return filters.discipline.length === 1 && filters.discipline[0] === 'sports';
}

export function normalizeExploreFilters(filters: CatalogSearchFilters): CatalogSearchFilters {
  return isSportsOnly(filters)
    ? { ...filters, discipline: [...filters.discipline], area: null, muscle: null, joint: null, difficulty: null }
    : { ...filters, discipline: [...filters.discipline] };
}

export function toggleExploreDiscipline(filters: CatalogSearchFilters, discipline: Activity['discipline']): CatalogSearchFilters {
  return normalizeExploreFilters({
    ...filters,
    discipline: filters.discipline.includes(discipline)
      ? filters.discipline.filter(value => value !== discipline)
      : [...filters.discipline, discipline],
  });
}

/** Discipline counts describe the actual toggle, including sports-only cleanup. */
export function exploreDisciplineCount(
  activities: Activity[], filters: CatalogSearchFilters, discipline: Activity['discipline'], query = '',
): number {
  return searchCatalog(activities, toggleExploreDiscipline(filters, discipline), query).length;
}

export function catalogCardIdentity(activity: Activity): 'Sequence' | 'Sport' | 'Single activity' {
  return activity.type === 'sequence' ? 'Sequence' : activity.type === 'sport' ? 'Sport' : 'Single activity';
}

const titleCase = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const METRIC_LABEL: Record<Activity['supportedMetrics'][number], string> = {
  reps: 'Reps', duration: 'Duration', breaths: 'Breaths', distance: 'Distance',
};

/** Explicit knowledge only: a measurement capability is never a prescribed dose. */
export function catalogCardMetadata(activity: Activity): string[] {
  const labels: string[] = [];
  if (activity.equipment?.length) {
    labels.push(activity.equipment.map(value => titleCase(GEAR_LABEL[value])).join(' + '));
  }
  if (activity.type !== 'sport' && activity.difficulty !== 'unknown') labels.push(titleCase(activity.difficulty));
  if (activity.supportedMetrics.length) {
    labels.push(`Tracks ${activity.supportedMetrics.map(value => METRIC_LABEL[value]).join(' / ')}`);
  }
  return labels.slice(0, 3);
}
