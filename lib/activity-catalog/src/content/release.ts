import { orderRelease } from '../release-order';
import { requireCoverage, validateRelease } from '../validation';
import type { CatalogRelease } from '../schema';
import { base, source } from './common';
import { strengthContent } from './strength';
import { yogaContent, yogaSequenceContent, yogaSources } from './yoga';
import { mobilityContent, mobilitySources } from './mobility';
import { conditioningContent, conditioningSources } from './conditioning';

export function authoredRelease(): CatalogRelease {
  const strength = strengthContent();
  const activities = [...strength.activities, ...yogaContent(), ...yogaSequenceContent(), ...mobilityContent(), ...conditioningContent()];
  const sources = [...strength.sources, ...yogaSources, ...mobilitySources, ...conditioningSources];
  const sequenceSource = source('maintainer-mobility-order', 'https://gmb.io/joint-mobility/',
    'Maintainer-selected gentle mobility order', 'Original short ordering of separately referenced drills, not a copied GMB or Kinstretch program or a therapeutic prescription.');
  sources.push(sequenceSource);
  const sequence = base('Gentle joint exploration sequence', 'mobility', [sequenceSource.id]);
  sequence.type = 'sequence'; sequence.description = 'A maintainer-selected browsing example linking three individually described drills in a fixed order. No dose, rehabilitation intent or automatic progression.';
  sequence.setup = ['Choose comfortable support and omit any member that is unsuitable.'];
  sequence.execution = ['Review each member before attempting it; ordering is informational, not a prescribed workout.'];
  sequence.precautions.push('Sequence membership does not establish personal suitability.');
  sequence.instructionNeeded = true;
  activities.push(sequence);
  const id = (name: string) => {
    const activity = activities.find(a => a.name === name);
    if (!activity) throw new Error(`Missing authored identity: ${name}`);
    return activity.id;
  };
  const release = orderRelease(validateRelease({
    schemaVersion: 1, contentVersion: 'tempo-catalog-2026-10-11-1', status: 'released',
    publishedAt: '2026-10-11T00:00:00.000Z', reviewStatus: 'source-checked', sources, activities,
    relationships: [
      { from: id('Incline push-up'), to: id('Push-up'), type: 'regression-of' },
      { from: id('Kneeling push-up'), to: id('Push-up'), type: 'regression-of' },
      { from: id('Dumbbell bench press'), to: id('Barbell bench press'), type: 'variation-of' },
      { from: id('Quadruped hip CARs'), to: id('Supported standing hip CARs'), type: 'variation-of' },
      { from: id('Cat-cow spinal motion'), to: id('Spinal CARs'), type: 'related-to' },
      { from: id('Bakasana B'), to: id('Bakasana A'), type: 'variation-of' },
      { from: id('Astavakrasana B'), to: id('Astavakrasana A'), type: 'variation-of' },
    ],
    sequences: [
      ...['Neck CARs', 'Quadruped hip CARs', 'Ankle CARs'].map((name, order) => ({
        sequenceId: sequence.id, activityId: id(name), order, side: 'both' as const,
      })),
      ...[
        ['Samasthitih', 'unspecified'], ['Urdhva Hastasana', 'unspecified'],
        ['Uttanasana A', 'unspecified'], ['Uttanasana B', 'unspecified'],
        ['Chaturanga Dandasana', 'unspecified'], ['Urdhva Mukha Svanasana', 'unspecified'],
        ['Adho Mukha Svanasana', 'unspecified'], ['Uttanasana B', 'unspecified'],
        ['Uttanasana A', 'unspecified'], ['Urdhva Hastasana', 'unspecified'],
        ['Samasthitih', 'unspecified'],
      ].map(([name, side], order) => ({ sequenceId: id('Surya Namaskara A'), activityId: id(name), order, side: side as 'unspecified' })),
      ...[
        ['Samasthitih', 'unspecified'], ['Utkatasana', 'unspecified'],
        ['Uttanasana A', 'unspecified'], ['Uttanasana B', 'unspecified'],
        ['Chaturanga Dandasana', 'unspecified'], ['Urdhva Mukha Svanasana', 'unspecified'],
        ['Adho Mukha Svanasana', 'unspecified'], ['Virabhadrasana A', 'right'],
        ['Chaturanga Dandasana', 'unspecified'], ['Urdhva Mukha Svanasana', 'unspecified'],
        ['Adho Mukha Svanasana', 'unspecified'], ['Virabhadrasana A', 'left'],
        ['Chaturanga Dandasana', 'unspecified'], ['Urdhva Mukha Svanasana', 'unspecified'],
        ['Adho Mukha Svanasana', 'unspecified'], ['Uttanasana B', 'unspecified'],
        ['Uttanasana A', 'unspecified'], ['Utkatasana', 'unspecified'],
        ['Samasthitih', 'unspecified'],
      ].map(([name, side], order) => ({ sequenceId: id('Surya Namaskara B'), activityId: id(name), order, side: side as 'left' | 'right' | 'unspecified' })),
    ],
  }));
  requireCoverage(release);
  return release;
}
