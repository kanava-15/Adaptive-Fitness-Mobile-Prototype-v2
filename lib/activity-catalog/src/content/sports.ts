import { base, source } from './common';
import type { Activity } from '../schema';

const sportsSources = [
  source('world-athletics-rules', 'https://worldathletics.org/world-ranking-rules/road-running-2025',
    'World Athletics — Road Running rules', 'Official discipline reference checked for road, track and trail running identities. No performance targets or training prescriptions used.', '2026-10-11'),
  source('uci-road-cycling', 'https://www.uci.org/discipline/road/6TBjsDD8902tud440iv1Cu',
    'Union Cycliste Internationale — Road cycling', 'Official road-cycling discipline reference checked for sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
  source('world-aquatics-swimming-rules', 'https://www.worldaquatics.com/swimming/rules',
    'World Aquatics — Swimming rules', 'Official swimming rules page checked for pool and open-water swimming identities. No performance targets or training prescriptions used.', '2026-10-11'),
  source('ifab-laws-of-the-game', 'https://www.theifab.com/laws-of-the-game-documents',
    'IFAB — Laws of the Game', 'Official association-football rules reference checked for sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
  source('fiba-basketball-rules', 'https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-0.pdf',
    'FIBA — Official Basketball Rules 2026', 'Official basketball rules checked for sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
  source('itf-rules-of-tennis', 'https://www.itftennis.com/en/about-us/governance/rules-and-regulations/',
    'International Tennis Federation — Rules and Regulations', 'Official tennis rules index checked for sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
  source('randa-rules-of-golf', 'https://www.randa.org/en/rules/rules-of-golf-home',
    'The R&A — Rules of Golf', 'Official golf rules reference checked for sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
  source('fivb-volleyball-rules', 'https://www.fivb.com/volleyball/the-game/official-volleyball-rules',
    'FIVB — Official Volleyball Rules 2025–2028', 'Official volleyball rules checked for sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
  source('mlb-official-rules', 'https://www.mlb.com/glossary/rules',
    'MLB — Rules glossary and official rules', 'Official baseball rules reference checked for sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
  source('world-rowing-rules', 'https://worldrowing.com/technical/rules',
    'World Rowing — Rules', 'Official rowing rules page checked for the sport identity only. No performance targets or training prescriptions used.', '2026-10-11'),
];

const rows: {
  name: string;
  sourceId: string;
  metrics: ('duration' | 'distance')[];
  units: Activity['distanceUnits'];
  setup: string;
  execution: string;
  modification: string;
  precautions: string[];
}[] = [
  {
    name: 'Road running', sourceId: 'world-athletics-rules', metrics: ['duration', 'distance'], units: ['m', 'km', 'mi'],
    setup: 'Choose a route and surface appropriate to current conditions; leave room to slow down or stop.',
    execution: 'Run using a self-selected, controllable pace and route. This entry does not prescribe distance, duration or pace.',
    modification: 'Choose a shorter route or walk instead.',
    precautions: ['Consider weather, visibility, traffic and route conditions before starting.'],
  },
  {
    name: 'Track running', sourceId: 'world-athletics-rules', metrics: ['duration', 'distance'], units: ['m', 'km'],
    setup: 'Use a track open to you and follow its posted direction and lane rules.',
    execution: 'Run on the track at a self-selected, controllable pace. This entry does not prescribe laps, distance or duration.',
    modification: 'Walk a lap or use a shorter, less busy route.',
    precautions: ['Yield appropriately to other track users and follow facility rules.'],
  },
  {
    name: 'Trail running', sourceId: 'world-athletics-rules', metrics: ['duration', 'distance'], units: ['m', 'km', 'mi'],
    setup: 'Choose a marked route that matches current weather, visibility and trail conditions.',
    execution: 'Move along the selected trail at a self-selected, controllable pace; adjust steps to the ground and slow or walk as needed.',
    modification: 'Use a shorter, flatter route or walk.',
    precautions: ['Check route access and conditions; carry what is appropriate for the location and expected conditions.'],
  },
  {
    name: 'Road cycling', sourceId: 'uci-road-cycling', metrics: ['duration', 'distance'], units: ['m', 'km', 'mi'],
    setup: 'Use a suitable, maintained bicycle and choose a route and traffic conditions you can manage.',
    execution: 'Ride while remaining in control of steering, braking and surroundings. This entry does not prescribe route, pace or duration.',
    modification: 'Choose a shorter, quieter route or a stationary bicycle.',
    precautions: ['Follow local road rules and use appropriate visibility and protective equipment.'],
  },
  {
    name: 'Lap swimming', sourceId: 'world-aquatics-swimming-rules', metrics: ['duration', 'distance'], units: ['m', 'yd'],
    setup: 'Use an appropriate pool where swimming is permitted; know how to exit and get assistance.',
    execution: 'Swim using a stroke and pace you can control, resting at a safe edge when needed.',
    modification: 'Choose a shorter distance, a slower pace or a supervised beginner session.',
    precautions: ['Do not swim alone or in a setting where you cannot safely exit or summon help.'],
  },
  {
    name: 'Open-water swimming', sourceId: 'world-aquatics-swimming-rules', metrics: ['duration', 'distance'], units: ['m', 'km', 'yd', 'mi'],
    setup: 'Use a permitted, supervised location; check conditions and arrange an appropriate support plan before entering.',
    execution: 'Swim within a safe, locally appropriate area and return to a safe exit before fatigue or conditions compromise control.',
    modification: 'Choose a supervised pool instead.',
    precautions: ['Water, weather, currents, visibility, temperature and exit access require separate safety judgment; do not swim alone.'],
  },
  {
    name: 'Association football', sourceId: 'ifab-laws-of-the-game', metrics: ['duration'], units: [],
    setup: 'Choose a suitable playing area and agree on the format, boundaries and safe use of space.',
    execution: 'Take part in a self-selected football format. This entry does not prescribe playing time, pace or match structure.',
    modification: 'Use a smaller playing area or a non-contact passing activity.',
    precautions: ['Allow enough space between players and follow agreed rules for the setting.'],
  },
  {
    name: 'Basketball', sourceId: 'fiba-basketball-rules', metrics: ['duration'], units: [],
    setup: 'Use a suitable court and agree on the format, boundaries and safe spacing.',
    execution: 'Take part in a self-selected basketball format. This entry does not prescribe playing time, pace or match structure.',
    modification: 'Use a stationary shooting or passing format in a clear space.',
    precautions: ['Check the playing surface and allow enough space between participants.'],
  },
  {
    name: 'Tennis', sourceId: 'itf-rules-of-tennis', metrics: ['duration'], units: [],
    setup: 'Use a suitable court and agree on the format and safe spacing.',
    execution: 'Take part in a self-selected tennis format. This entry does not prescribe playing time, pace or match structure.',
    modification: 'Use a shorter-court or cooperative rally format.',
    precautions: ['Check the playing surface and leave enough room around the court.'],
  },
  {
    name: 'Golf', sourceId: 'randa-rules-of-golf', metrics: ['duration'], units: [],
    setup: 'Use a permitted golf facility and learn its local course and equipment rules.',
    execution: 'Take part in a self-selected golf format. This entry does not prescribe holes, playing time or pace.',
    modification: 'Use a permitted practice area or a shorter format.',
    precautions: ['Follow facility rules and keep clear of other players and active shots.'],
  },
  {
    name: 'Volleyball', sourceId: 'fivb-volleyball-rules', metrics: ['duration'], units: [],
    setup: 'Choose an appropriate court and agree on the format and safe spacing.',
    execution: 'Take part in a self-selected volleyball format. This entry does not prescribe playing time, pace or match structure.',
    modification: 'Use a lower net, a smaller court or a cooperative passing format.',
    precautions: ['Check the playing surface and maintain safe spacing around the court.'],
  },
  {
    name: 'Baseball', sourceId: 'mlb-official-rules', metrics: ['duration'], units: [],
    setup: 'Use an appropriate field or practice area and agree on the format and equipment rules.',
    execution: 'Take part in a self-selected baseball format. This entry does not prescribe innings, playing time or pace.',
    modification: 'Use a stationary throwing, catching or batting practice format in a clear area.',
    precautions: ['Keep people clear of active throws and swings and follow facility rules.'],
  },
  {
    name: 'Rowing', sourceId: 'world-rowing-rules', metrics: ['duration', 'distance'], units: ['m', 'km', 'mi'],
    setup: 'Use an appropriate rowing boat or indoor rowing machine and understand its local operating and water-safety rules.',
    execution: 'Row using a self-selected, controllable pace and route or machine setting. This entry does not prescribe distance or duration.',
    modification: 'Choose a shorter route or a familiar indoor setting.',
    precautions: ['On water, follow local conditions, navigation and safety requirements; use qualified instruction when needed.'],
  },
];

export const sportsContent = (): Activity[] => rows.map(row => {
  const a = base(row.name, 'sports', [row.sourceId]);
  a.supportedMetrics = row.metrics;
  a.distanceUnits = row.units;
  a.equipment = null;
  a.laterality = 'not-applicable';
  a.difficulty = 'unknown';
  a.primaryMuscles = null;
  a.secondaryMuscles = null;
  a.joints = null;
  a.actions = null;
  a.movementPatterns = null;
  a.description = `${row.name} is a sport activity entry for a user-selected routine. It does not prescribe duration, distance, pace, intensity or an outcome.`;
  a.setup = [row.setup];
  a.execution = [row.execution];
  a.cues = ['Choose the format and amount that suit your own plan; stop or change activity if you do not feel well.'];
  a.modifications = [row.modification];
  a.precautions.push(...row.precautions);
  a.instructionNeeded = true;
  a.adaptation = {
    eligible: false,
    loadingKnown: false,
    loadedJoints: [],
    rationale: 'Sports are excluded from automatic adaptation; no reviewed sport-specific suitability or loading policy is established.',
  };
  return a;
});

export { sportsSources };
