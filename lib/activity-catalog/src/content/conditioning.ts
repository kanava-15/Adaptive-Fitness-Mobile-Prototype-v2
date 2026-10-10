import { base, source } from './common';
import type { Activity } from '../schema';

export const conditioningSources = [source('exrx-cardio', 'https://exrx.net/Lists/CardioExercises',
  'ExRx — Cardio and Conditioning directory', 'Inspected named activities and individual reference links. Distinct locomotion, apparatus and floor patterns; no rep prescriptions, intensity targets or media copied.')];
const rows = `
Outdoor walking|none|distance|Choose a clear route with suitable footwear.|Walk at a comfortable pace, placing feet naturally and allowing arms to swing.|Shorten the route or walk on a flat surface.
Outdoor running|none|distance|Choose a clear route and a pace you can control.|Run with relaxed shoulders and comfortable strides, easing down to walking to finish.|Choose walking or a shorter run based on current capacity.
Outdoor cycling|bike|distance|Check bike fit, brakes, tires and local traffic safety.|Pedal smoothly, steer predictably and brake early rather than abruptly.|Choose a quiet flat route or a stationary bike.
Stationary upright cycling|bike|distance|Adjust saddle and handlebars so knees and shoulders feel comfortable.|Pedal seated at manageable resistance, keeping knees tracking naturally.|Lower resistance and use a shorter bout.
Recumbent cycling|bike|distance|Adjust the seat so the knee remains slightly bent at the far pedal position.|Pedal smoothly with the trunk supported and hands relaxed.|Lower resistance and adjust the seat before resuming.
Rowing ergometer|rower|distance|Secure feet and learn the handle and seat sequence before adding resistance.|Push with legs, lean back slightly and draw the handle toward lower ribs; return arms, trunk and then legs.|Use easy resistance and rehearse the sequence slowly.
Elliptical trainer|elliptical|duration|Step onto stopped pedals with stable handle support.|Drive the pedals in their guided path, keeping feet in contact and trunk upright.|Reduce resistance or stop before balance becomes uncertain.
Treadmill walking|treadmill|distance|Learn the stop control and attach the safety clip before starting slowly.|Walk in the center of the belt without hanging on the rails; slow the belt before stepping off.|Reduce speed and incline.
Treadmill running|treadmill|distance|Learn the stop control and safety clip at walking speed first.|Increase speed only while keeping a controlled stride near the belt center; slow to walk before stopping.|Use a lower speed or a walking bout.
Stair climbing|step|distance|Choose clear stable stairs with a handrail and sufficient lighting.|Step deliberately onto each tread and control the descent without rushing.|Use fewer stairs and a rail.
Freestyle swimming|pool|distance|Use a supervised safe pool; be able to float, breathe and exit safely.|Alternate arm strokes with comfortable kick and breathing, stopping at a safe edge before fatigue affects breathing.|Use a shorter length and qualified swim instruction.
Basic jump-rope hop|jump-rope|reps|Use a rope of suitable length with clear space and non-slip footing.|Turn the rope from the wrists and use small two-foot hops with soft landings.|Practice without a rope or use a slower turn.
Burpee|none|reps|Start standing on a clear non-slip floor.|Lower into a squat, place hands down, step or move feet into a plank, bring feet back and stand; choose a jump only if controlled.|Step feet individually and omit the jump.
Jumping jack|none|reps|Stand with room to move arms and feet outward.|Move feet apart while raising arms comfortably, then return with soft landings.|Step one foot at a time and use a smaller arm reach.
Mountain climber|none|reps|Use stable hands in a high plank or elevated plank.|Bring one knee toward the trunk and return, then alternate while keeping the pelvis controlled.|Use elevated hands and slow alternating steps.
Side shuffle|none|distance|Choose a clear level lane and begin in an athletic stance.|Step sideways, bring the trailing foot toward the lead foot without crossing, then reverse direction with control.|Use smaller slower steps.
`.trim().split('\n').map(r => r.split('|'));

export function conditioningContent(): Activity[] {
  return rows.map(([name, equipment, metric, setup, move, modification]) => {
    const a = base(name, 'conditioning', ['exrx-cardio']);
    a.version = 2;
    a.equipment = [equipment as NonNullable<Activity['equipment']>[number]];
    a.supportedMetrics = metric === 'distance' ? ['duration', 'distance'] : metric === 'reps' ? ['reps', 'duration'] : ['duration'];
    a.distanceUnits = metric === 'distance' ? ['m', 'km', 'mi', 'yd'] : [];
    a.description = `${name} is a conditioning activity with a distinct movement or apparatus. Pace, distance and duration are choices for a separate personal plan, not a target implied by the catalog.`;
    a.setup = [setup]; a.execution = [move, 'Reduce pace or stop while movement and breathing remain controlled.'];
    a.cues = ['Use a pace appropriate to your current experience and conditions.'];
    a.commonMistakes = ['Starting at a pace that prevents a controlled finish.', 'Treating a library entry as a fitness or medical clearance.'];
    a.modifications = [modification];
    a.precautions.push('Stop for chest pain, faintness or unusual breathlessness; seek appropriate medical help. Heat, traffic, water and moving machinery need separate safety judgment.');
    a.instructionNeeded = /swimming|cycling|ergometer|treadmill|elliptical/i.test(name);
    a.movementPatterns = name === 'Rowing ergometer' ? ['pull'] : name === 'Burpee' ? ['squat', 'hold'] :
      name === 'Mountain climber' ? ['hold', 'locomotion'] : ['locomotion'];
    a.laterality = 'unknown'; a.difficulty = 'unknown';
    a.benefits = [{ text: 'Provides repeated movement that can be used for conditioning practice.', sourceIds: ['exrx-cardio'],
      qualification: 'Conditioning opportunity, not a guaranteed cardiovascular, weight-loss or therapeutic outcome. Effect depends on intensity, dose and personal suitability.' }];
    return a;
  });
}
