import type { Activity } from '../schema';
import { base, source } from './common';

export const mobilitySources = [
  source('neckcare-cars', 'https://help.neckcare.com/controlled-articular-rotations', 'NeckCare — Neck CARs',
    'Inspected pain-free neck circle, quiet body and smaller-arc regression. Clinical/therapeutic claims and universal patient suitability not adopted.'),
  source('tcm-cars', 'https://tcmvmt.com/the-morning-cars-routine-a-joint-by-joint-guide-to-start-your-day-right', 'Twin Cities Movement — morning CARs',
    'Inspected spine, shoulder, wrist, supported hip, knee/tibial and ankle instructions. Scapula, elbow, fingers and toes sections repeat unrelated text and were explicitly excluded. No clinical claims adopted.'),
  source('mh-hip-cars', 'https://marathonhandbook.com/controlled-articular-rotations/', 'Marathon Handbook — quadruped hip CARs',
    'Inspected quadruped hip flexion, abduction and rotation with neutral trunk. Rep counts, rehab and medical claims excluded.'),
  source('gmb-joints', 'https://gmb.io/joint-mobility/', 'GMB — joint mobility exercises',
    'Inspected named extended routine and daily check-in. Original descriptions below; no video, routine dosage, program or clinical claims reproduced.'),
  source('gmb-hips', 'https://gmb.io/hip-mobility/', 'GMB — hip mobility',
    'Inspected eight named hip exercises and detailed instructions. No claims about pain treatment, disease, anatomical correction or therapeutic outcomes adopted.'),
  source('gmb-shoulders', 'https://gmb.io/shoulder-mobility/', 'GMB — shoulder mobility',
    'Inspected named movements, setup and stabilization examples. No clinical assessment, diagnosis or program copied.'),
];
// name | source | joint | actions | position/stabilization | original execution | specific compensation
const rows = `
Neck CARs|neckcare-cars|cervical-spine|flexion,extension,lateral-flexion,rotation|Sit upright with feet supported and shoulders quiet.|Draw a slow small circle with the head through comfortable neck flexion, side bend and rotation; reverse without pushing into extension.|Do not let shoulders lift or trunk turn to increase the circle.
Spinal CARs|tcm-cars|thoracic-spine|flexion,extension,lateral-flexion,rotation|Stand with arms crossed and pelvis facing forward.|Round the upper trunk, rotate and side bend through a small controlled circle, then reverse without thrusting the hips.|Do not use a large lumbar arch or hip sway as extra upper-back range.
Shoulder CARs|tcm-cars|shoulder|flexion,extension,abduction,internal-rotation,external-rotation|Stand with one hand available for support and ribs quiet.|Move one arm forward and upward, rotate the upper arm as needed to continue behind, then return and reverse through your available controlled arc.|Keep ribs and pelvis still; do not twist the torso to hide a blocked shoulder range.
Wrist CARs|tcm-cars|wrist|flexion,extension,circumduction|Support the forearm and steady it with the opposite hand.|Draw a slow wrist circle through available flexion, side deviation and extension; reverse while the forearm stays still.|Do not rotate the entire forearm or force the fingers back.
Supported standing hip CARs|tcm-cars|hip|flexion,extension,abduction,internal-rotation,external-rotation|Stand holding a stable support with pelvis level.|Lift one bent knee forward, open the thigh outward and rotate it toward a small behind-body arc; return and reverse.|Keep pelvis facing forward rather than swinging the trunk to make a bigger circle.
Knee and tibial CARs|tcm-cars|knee|flexion,extension,internal-rotation,external-rotation|Sit with the working thigh supported and knee initially bent.|Gently turn the shin within its small available rotation, partially extend the knee, turn the shin the other way and bend again; reverse without torque.|Do not twist a planted foot or force rotation at a straight locked knee.
Ankle CARs|tcm-cars|ankle|dorsiflexion,plantarflexion,inversion,eversion|Sit and support the lower leg so the foot can move freely.|Point the foot, turn through a gentle inward arc, draw it toward the shin and travel through an outward arc; reverse slowly.|Keep the knee quiet and avoid gripping the toes to enlarge the circle.
Quadruped hip CARs|mh-hip-cars|hip|flexion,extension,abduction,internal-rotation,external-rotation|Set hands below shoulders and knees below hips on a mat.|Keeping one knee bent, draw it forward, open it sideways and rotate the thigh toward a small backward arc; return and reverse.|Keep the pelvis level and abdomen engaged rather than lifting the hip or arching the back.
Backward-facing wrist flexor stretch|gmb-joints|wrist|extension|Kneel with palms grounded and fingers facing toward the knees, using little body weight at first.|Rock slightly back to explore wrist extension, then return before pressure becomes uncomfortable.|Do not dump full weight onto turned hands or let palms peel away.
Forward-facing wrist flexor stretch|gmb-joints|wrist|extension|Kneel with fingers forward and palms on a secure elevated or floor support.|Shift shoulders gently forward and back through a comfortable wrist angle.|Do not use a deep lean to force wrist extension.
Backward-facing wrist extensor stretch|gmb-joints|wrist|flexion|Kneel and rest the backs of hands lightly on support with fingers directed toward you.|Use a very small backward shift while keeping pressure light, then unload the hands.|Do not bear heavy weight on the backs of the hands.
Closed-chain elbow rotations|gmb-joints|elbow,forearm|pronation,supination|Kneel with hands grounded, elbows softly extended and little hand load.|Turn the elbow pits gradually inward and outward without forcing the joints backward.|Do not lock or twist the elbows against fixed painful wrists.
Quadruped upper-spine extension and flexion|gmb-joints|thoracic-spine|flexion,extension|Begin on hands and knees with pelvis quiet.|Alternate a small upper-back rounding with a supported chest opening, keeping the lower back from taking over.|Do not create the motion only by dropping the lumbar spine.
Quadruped scapular protraction and retraction|gmb-joints|scapula|protraction,retraction|Set hands below shoulders with elbows straight but not locked.|Let the chest settle slightly between the shoulders, then press away to spread shoulder blades.|Avoid bending elbows or rounding the whole spine instead of moving the shoulder blades.
Quadruped shoulder-blade circles|gmb-joints|scapula|elevation,depression,protraction,retraction|Use hands-and-knees support and keep arms long.|Move the shoulder blades around the rib cage through elevation, spreading, lowering and drawing together; reverse.|Do not roll the whole trunk or bend elbows to simulate the circle.
Quadruped spinal circles|gmb-joints|thoracic-spine,lumbar-spine|flexion,extension,lateral-flexion|Begin on hands and knees with stable hand contact.|Combine a small trunk rounding, side shift and comfortable extension into a slow circle, then reverse.|Avoid collapsing into the low back or letting wrists absorb a sudden shift.
Cat-cow spinal motion|gmb-joints|thoracic-spine,lumbar-spine|flexion,extension|Set hands and knees on a comfortable mat.|Alternate gentle spinal rounding with a comfortable chest opening, following normal breathing.|Do not throw the head back or force an end-range lumbar arch.
Frog hip stretch|gmb-hips|hip|abduction|Kneel with padded knees apart only as comfortably available.|Rock hips a little backward and forward while maintaining a comfortable knee position.|Do not spread the knees farther by pressing or twisting the feet.
Quadruped side-bending reach|gmb-joints|thoracic-spine,shoulder|lateral-flexion,flexion|Begin on hands and knees and reach one hand across on stable support.|Sit hips back slightly to explore a side-body reach, then return and choose the other side.|Keep the reach small rather than twisting the pelvis or stretching through shoulder pinching.
Cobra spinal lift|gmb-joints|thoracic-spine,lumbar-spine|extension|Lie prone with hands near ribs and legs relaxed.|Lift the chest slightly using gentle hand support; lower before the low back pinches.|Do not straighten elbows forcibly to maximize height.
Kneeling lunge rotations|gmb-joints|hip,thoracic-spine|extension,rotation|Use a padded half-kneeling lunge with front foot stable.|Rotate the trunk comfortably toward the front leg and unwind while keeping the pelvis supported.|Do not force the front knee sideways or turn by swinging the arms.
Kneeling hamstring hinge|gmb-joints|hip,knee|flexion,extension|Use half kneeling with the forward heel planted and hands on support.|Shift hips back and gently lengthen the forward knee while hinging over that leg.|Do not force a locked knee or round the back to reach toes.
Squat trunk rotations|gmb-joints|hip,thoracic-spine|flexion,rotation|Choose a supported squat depth with heels comfortable.|Keep one hand on support and rotate the trunk a little to open the opposite side; unwind before switching.|Do not torque knees or use a painful deep squat.
Three-point bridge reach|gmb-joints|shoulder,hip,thoracic-spine|extension,rotation|Sit with bent knees and one hand behind you at a comfortable wrist angle.|Press through the supporting hand and feet to lift hips slightly and reach the free arm across; lower with control.|Avoid loading a pinching shoulder or forcing a high lumbar arch.
Lying hip rotations|gmb-hips|hip|internal-rotation,external-rotation|Lie on your back with knees bent and feet spaced comfortably.|Let the knees move gently side to side within comfortable hip rotation, then return to center.|Do not use the floor as a forced knee target.
Supine piriformis figure-four stretch|gmb-hips|hip|flexion,external-rotation|Lie supine and rest one ankle across the opposite thigh without pressure on the knee.|Bring the supporting thigh toward you only as comfortable, then release before changing sides.|Do not press down on the crossed knee or pull the foot.
Butterfly hip fold|gmb-hips|hip|abduction,external-rotation|Sit on support with soles together and feet at a comfortable distance.|Lean forward slightly with a long trunk and return without pressing the knees down.|Avoid bouncing knees or demanding floor contact.
Traveling butterfly|gmb-hips|hip|abduction,external-rotation,flexion|Sit with soles together and hands behind you on comfortable support.|Move hips gently toward and away from the feet using the hands to support the shift.|Do not drag feet to force deeper knee opening.
Squatting hip internal rotations|gmb-hips|hip|internal-rotation|Use a shallow supported squat and keep heel contact comfortable.|Move one knee inward slightly through available hip rotation, then return before changing sides.|Do not force knee collapse or keep going through joint pressure.
Supported pigeon hip stretch|gmb-hips|hip|external-rotation,extension|From hands and knees, bring one bent leg forward and support the pelvis.|Explore a small forward inclination while the rear leg extends only comfortably; return to hands and knees to exit.|Do not demand a square shin or twist the front knee.
Half-kneeling hip-flexor shift|gmb-hips|hip|extension|Use a padded half-kneeling stance with front foot stable.|Keep the pelvis gently tucked and shift forward a small amount, then return.|Do not create more reach by arching the lumbar spine.
Prone-position shoulder opener|gmb-shoulders|shoulder|flexion,rotation|From kneeling, support one elbow across in front at a comfortable height.|Move the trunk gently down and away from that stable elbow to explore the back of the shoulder.|Avoid using body weight to force an uncomfortable shoulder angle.
Quadruped thoracic twist|gmb-shoulders|thoracic-spine|rotation|Start on hands and knees with one hand at the hip.|Lead with that elbow to turn the upper trunk upward, then unwind without turning the pelvis.|Do not substitute neck rotation for trunk motion.
Supported upper-thoracic extension|gmb-shoulders|thoracic-spine,shoulder|extension,flexion|Kneel before a stable chair or box with elbows supported.|Move hips back and allow chest to settle gently between supported arms while keeping the low back quiet.|Do not force the chest down or flare ribs to fake upper-back range.
Seated combined rotation and side bend|gmb-shoulders|thoracic-spine|rotation,lateral-flexion|Sit upright on a stable chair with both feet grounded.|Turn the trunk slightly one way and explore a gentle side bend in the other direction, then return to neutral.|Do not yank with the arms or lift a hip off the seat.
Tall-kneeling side arm reach|gmb-shoulders|shoulder,thoracic-spine|flexion,lateral-flexion|Kneel on padding with hips over knees and one hand at the hip.|Lift the other arm and reach gently upward and sideways without shifting the pelvis.|Do not hinge backward or lean so far that balance is lost.
`.trim().split('\n').map(r => r.split('|'));

export function mobilityContent(): Activity[] {
  return rows.map(([name, sid, joints, actions, setup, move, compensation]) => {
    const a = base(name, 'mobility', [sid]);
    a.version = 2;
    a.family = name.includes('CARs') ? 'cars' : 'general';
    a.joints = joints.split(',') as Activity['joints'];
    a.actions = actions.split(',') as Activity['actions'];
    a.equipment = /chair|sit|seat|stand.*support|stand.*holding/i.test(setup) ? ['chair'] :
      /box/i.test(setup) ? ['box'] : /stand|support the forearm/i.test(setup) ? ['none'] : ['mat'];
    a.description = `${name} explores comfortable available ${joints.replaceAll(',', ' and ')} movement with deliberate control. It is not a rehabilitation prescription or evidence of affiliation with FRC or Kinstretch.`;
    a.setup = [setup, 'Begin unloaded or with minimal body-weight pressure; stabilize the supports before moving.'];
    a.execution = [move, 'Stop before compensation or discomfort, return to the starting position and choose the other side when relevant.'];
    a.cues = [compensation, 'Smaller controlled range is preferable to forcing an end position.'];
    a.commonMistakes = ['Using momentum or outside force to gain range.', compensation];
    a.precautions.push('Do not push through pain or pinching, use maximal tension, or let another person force the joint. If symptoms persist, stop and seek qualified assessment.');
    a.modifications = ['Use a smaller pain-free arc and additional stable support.', 'Omit loaded end positions and separate the directions of motion if a circle is not comfortable.'];
    a.mobility = { position: setup, stabilization: compensation, compensationCues: [compensation],
      comfortableRange: 'Only the range you can actively control without pain, pinching or substitute movement; no prescribed end-range angle.',
      intensityCaution: 'Low effort, no maximal tension or external forcing. This is movement exploration, not a clinical protocol.',
      regressions: a.modifications };
    a.supportedMetrics = ['reps', 'duration']; a.movementPatterns = ['joint-isolation'];
    a.instructionNeeded = true; a.difficulty = 'unknown'; a.laterality = 'unknown';
    a.benefits = [{ text: 'Offers deliberate practice of the specified joint motion and awareness of compensations.', sourceIds: [sid],
      qualification: 'Describes practice intent, not proven pain treatment, cartilage change, joint-health improvement or injury prevention.' }];
    return a;
  });
}
