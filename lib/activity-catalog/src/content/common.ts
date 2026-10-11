import type { Activity, Source } from '../schema';

export const reviewedOn = '2026-10-10';
export const permission = 'Public reference/link only. No permission to reproduce source prose, charts, photos, videos or proprietary curricula is claimed. Instructions in this release are original maintainer wording.';
export const slug = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function source(id: string, url: string, title: string, provenance: string, reviewedDate = reviewedOn): Source {
  return { id, url, title, provenance, retrievedOn: reviewedDate, reviewedOn: reviewedDate,
    permittedUse: permission, reviewStatus: 'source-checked' };
}
export function base(name: string, discipline: Activity['discipline'], sourceIds: string[]): Activity {
  return {
    id: `${discipline}-${slug(name)}`, version: 1, name, englishName: name,
    sanskritName: null, aliases: [], discipline,
    type: discipline === 'strength' ? 'exercise' : discipline === 'yoga' ? 'asana'
      : discipline === 'mobility' ? 'mobility-drill' : 'conditioning-activity',
    family: 'general', supportedMetrics: ['reps'], distanceUnits: [], loadUnits: [],
    laterality: 'unknown', equipment: ['none'], difficulty: 'unknown',
    primaryMuscles: null, secondaryMuscles: null, joints: null, actions: null,
    movementPatterns: null, description: '', setup: [], execution: [], cues: [],
    commonMistakes: null, benefits: [], precautions: [
      'Stop for pain, pinching, numbness, dizziness or loss of control. This is general activity information, not an injury assessment or treatment.',
      'If injured, recently operated on, or working under clinical restrictions, follow your qualified clinician rather than this catalog.',
    ], modifications: [], instructionNeeded: false, seriesContext: [], mobility: null,
    adaptation: { eligible: false, loadingKnown: false, loadedJoints: [],
      rationale: 'Source-checked identity and original educational guidance do not establish personal suitability. No automatic progression or substitution is authorized.' },
    sourceIds, authorship: 'maintainer', reviewStatus: 'source-checked', archived: false,
  };
}
