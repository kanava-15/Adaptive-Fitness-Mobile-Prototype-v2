import type { Activity } from '../schema';
import { base, source } from './common';

export const yogaSources = [
  source('asher-primary', 'https://ashtangaphilippa.com/wp-content/uploads/2026/02/Asana-Practise-Sheets-Part-1-1-1.pdf',
    'Philippa Asher — Asana Practise Sheets, Part 1', 'Inspected text of pages 3–9: vinyasa elements, standing, Primary, backbends and finishing. Names and context only; no chart, counts, imagery, spiritual or health claims reproduced.'),
  source('asher-later', 'https://ashtangaphilippa.com/wp-content/uploads/2026/03/Asana-Practise-Sheets-Part-2.pdf',
    'Philippa Asher — Asana Practise Sheets, Part 2', 'Inspected text of pages 11–18 including lineage note, Intermediate and Advanced A/B identities. Context as learned by Philippa Asher from Pattabhi Jois and Sharath Jois at KPJAYI, not a universal or automatic progression.'),
];
// Sanskrit romanizations preserved as aliases when this catalog standardizes spelling.
// English labels below describe the shape; they are not asserted literal translations.
// One identity per posture, even where it also appears as a transition or in another series.
const rows = `
Samasthitih|Equal standing|Standing|stand|Stand with a comfortable even stance.|Balance weight through both feet and let arms rest by the sides.
Urdhva Vrksasana|Upward arm reach|Vinyasa|stand|Begin in even standing with space above you.|Raise both arms overhead only without flaring the ribs; lower to exit.
Uttanasana A|Standing forward fold|Vinyasa|fold|Stand with feet grounded and knees free to bend.|Fold from the hips toward the legs, keeping hands on available support rather than pulling down.
Uttanasana B|Half-lift forward fold|Vinyasa|fold|Begin from a comfortable standing fold.|Lengthen the trunk forward with hands on shins or support, leaving knees soft.
Chaturanga Dandasana|Low plank|Vinyasa|arm|Start from a stable high plank or knee-supported plank.|Bend elbows close to the trunk and lower only while the shoulders remain controlled; lower knees to exit.
Urdhva Mukha Svanasana|Upward-facing dog|Vinyasa|backbend|Begin prone with hands beside the lower ribs.|Press hands down to lift the chest and, only if controlled, thighs; lower without collapsing into the lumbar spine.
Adho Mukha Svanasana|Downward-facing dog|Vinyasa|fold|Begin on hands and knees with secure hand contact.|Lift hips back and upward, bending knees as needed to lengthen the trunk without forcing heels down.
Padangusthasana|Big-toe forward fold|Standing|fold|Stand with a small space between the feet and knees soft.|Hinge forward and take big toes only if reachable without strain; otherwise use support.
Padahastasana|Hand-under-foot fold|Standing|fold|Begin in a shallow fold with knees bent.|Place hands under feet only within a comfortable wrist angle; release hand pressure before rising.
Utthita Trikonasana A|Extended triangle|Standing|stand|Take a wide standing stance and turn the leading foot out.|Reach sideways over that leg, placing the lower hand on a support and opening the upper arm without leaning on the knee.
Utthita Trikonasana B|Revolved triangle|Standing|twist|Take a staggered stance with both feet grounded.|Lengthen over the front leg and turn the trunk toward it with the opposite hand supported; unwind before rising.
Utthita Parsvakonasana A|Extended side angle|Standing|stand|Set a wide stance with the front foot turned outward.|Bend the front knee over its foot, support the lower forearm or hand and reach the upper arm along a comfortable diagonal.
Utthita Parsvakonasana B|Revolved side angle|Standing|twist|Use a staggered stance with the front knee bent.|Turn the trunk toward the front thigh using supported hands; keep breathing and release the twist before stepping out.
Parsvottanasana|Pyramid fold|Standing|fold|Set a staggered stance with hips facing forward as comfortably as possible.|Fold over the front leg using blocks or a chair, without forcing hands behind the back.
Utkatasana|Chair pose|Standing|stand|Stand with grounded feet and room to reach upward.|Bend hips and knees while lifting arms within a comfortable range; stand to exit.
Virabhadrasana A|Warrior one|Standing|stand|Use a long staggered stance with the rear heel supported as comfortable.|Bend the front knee and lift the trunk and arms without forcing hips square.
Virabhadrasana B|Warrior two|Standing|stand|Take a wide stance with the leading foot turned out.|Bend the front knee and open arms to the sides while keeping the trunk upright.
Dandasana|Staff sitting|Primary|seat|Sit with legs ahead on a folded blanket if needed.|Lengthen the trunk with hands beside the hips; bend knees if straight legs tip the pelvis backward.
Paschimattanasana A|Seated forward fold with toe hold|Primary|fold|Sit with both legs forward and knees comfortably soft.|Lengthen forward from the hips, holding toes only if readily available; return without pulling the back.
Purvottanasana|Upward plank|Primary|arm|Sit with legs ahead and hands behind in a comfortable wrist angle.|Press through hands and feet to lift the pelvis, using bent knees if necessary; lower smoothly.
Ardha Baddha Padma Paschimattanasana|Half-lotus seated fold|Primary|lotus|Sit with one leg extended and the other prepared only within an established half-lotus range.|Fold over the extended leg without dragging the foot into place; release the fold before carefully releasing the bent leg.
Trianga Mukhaikapada Paschimattanasana|One-leg folded-back forward bend|Primary|knee|Sit with one leg forward and the other shin folded beside the hip on adequate support.|Fold forward over the straight leg with weight balanced; use a blanket under the pelvis rather than forcing the bent knee.
Janu Sirsasana A|Head-to-knee fold with open knee|Primary|fold|Sit with one leg long and the other foot near the inner thigh.|Turn toward the extended leg and hinge forward without pressing the bent knee down.
Janu Sirsasana B|Head-to-knee fold with heel seat|Primary|knee|Prepare the bent leg and heel placement with a teacher before placing body weight on it.|Lengthen over the straight leg without compressing the knee or ankle; remove body weight before releasing the foot.
Janu Sirsasana C|Head-to-knee fold with turned foot|Primary|knee|Have a teacher assess the turned-foot position; keep the knee and ankle unloaded during setup.|Approach the forward fold only in an established comfortable position and release immediately if the knee or ankle feels torque.
Marichyasana A|Bound fold with raised knee|Primary|fold|Sit with one leg straight and the other knee raised, foot grounded.|Lengthen the trunk past the raised knee, using an unbound fold or strap rather than forcing hands together.
Marichyasana B|Half-lotus bound fold|Primary|lotus|Prepare an established half lotus and opposite raised knee with instruction.|Fold only while knee pressure remains absent; leave the arms unbound if needed and release the lotus without pulling.
Marichyasana C|Seated twist with raised knee|Primary|twist|Sit with one leg extended and the other knee up.|Turn toward the bent leg from a long trunk; an unbound arm position is sufficient.
Marichyasana D|Half-lotus bound twist|Primary|lotus|Have an experienced teacher check the half-lotus and raised-knee setup.|Rotate only in a comfortable established base; do not use the bind to lever deeper or pull the knee.
Navasana|Boat balance|Primary|seat|Sit with bent knees, feet grounded and hands available behind you.|Lean the trunk slightly back, lift feet only while maintaining control and choose bent or extended knees.
Bhujapidasana|Arm-pressure balance|Primary|arm|Start in a supported squat and learn hand and thigh placement with a teacher.|Transfer a small amount of weight into hands before any foot lift; place feet back down to exit.
Kurmasana|Tortoise fold|Primary|fold|Sit with legs apart and knees initially bent.|Lengthen forward between the thighs with arms under the knees only as available; never force chest or head to the floor.
Supta Kurmasana|Bound tortoise|Primary|legbehind|Learn the leg-behind-head and binding setup with a qualified experienced teacher.|Use only the setup and exit already taught in person; do not pull feet behind the head from this catalog.
Garbha Pindasana|Lotus embryo balance|Primary|lotus|Prepare a comfortable established lotus without pressing on the knees.|Learn threading arms and balancing in person; omit rocking if balance or knee position is uncertain.
Kukkutasana|Lotus arm balance|Primary|lotus|Use an established lotus and teacher-checked arm placement.|Press into secure hands only after wrist and knee positions are comfortable; lower without dropping.
Baddha Konasana|Bound-angle sitting|Primary|seat|Sit with soles together and support under the pelvis if needed.|Lengthen the trunk and hinge forward only as comfortable; allow knees to rest without external pressure.
Upavistha Konasana A|Wide-angle seated fold|Primary|fold|Sit with legs apart at a comfortable width.|Hinge forward with hands supported and knees softly extended, then return with control.
Upavistha Konasana B|Wide-angle lifted balance|Primary|seat|Begin in wide-angle sitting and learn the balance with nearby support.|Shift to a controlled seated balance and lift legs only without rounding or straining; lower feet to exit.
Supta Konasana|Reclined wide-angle inversion|Primary|inversion|Have an experienced teacher check the shoulder-supported inverted setup.|Use only the taught transition and shoulder support; do not roll weight onto the neck or force feet to the floor.
Supta Padangusthasana|Reclined big-toe reach|Primary|fold|Lie on your back with one knee bent toward you.|Extend that leg only as available using a strap if needed; keep the opposite side grounded and lower the leg smoothly.
Ubhaya Padangusthasana|Both-big-toe balance|Primary|seat|Start seated with both knees bent and a comfortable toe or strap grip.|Balance behind the sitting bones and extend legs only without pulling the spine into discomfort.
Urdhva Mukha Paschimattanasana|Upward-facing seated leg balance|Primary|seat|Sit with knees bent and establish a controlled two-foot hold.|Lift legs toward the trunk only within your learned balance; lower feet deliberately instead of rolling backward.
Setu Bandhasana|Ashtanga neck-supported bridge|Primary|neck|This is the neck-loading Ashtanga form, not the common shoulder-supported bridge.|Do not attempt from written directions; review neck support, readiness and exit in person with an experienced teacher.
Urdhva Dhanurasana|Upward bow|Backbends|backbend|Lie supine with feet planted and hands by ears only if that wrist and shoulder setup is comfortable.|With instruction, press into hands and feet to raise the trunk without resting weight on the crown; lower under control.
Salamba Sarvangasana|Supported shoulderstand|Finishing|inversion|Learn shoulder support and safe entry with an experienced teacher.|Stay on the taught support without turning the head; leave the inversion before control or breathing is compromised.
Halasana|Plow|Finishing|inversion|Begin only from a teacher-checked shoulder-supported inversion.|Lower legs toward available support without loading the neck or demanding floor contact; return through the taught exit.
Karna Pidasana|Ear-pressure inversion|Finishing|inversion|Have a teacher establish a comfortable supported plow first.|Bend knees beside the head only if no neck pressure is added; do not use knees to squeeze the head.
Urdhva Padmasana|Inverted lotus|Finishing|lotus|Requires both an established lotus and a safe teacher-checked shoulderstand.|Only combine those skills under instruction; release lotus without twisting the knees before leaving inversion.
Pindasana|Inverted lotus fold|Finishing|lotus|Begin only in an established instructed inverted lotus.|Use the learned compact position without compressing the neck or forcing knees; unbind before returning.
Matsyasana|Fish backbend|Finishing|backbend|Sit or recline with legs in a comfortable taught position; lotus is not required for a modification.|Support the lift of the chest rather than dumping body weight onto the crown; release slowly.
Uttana Padasana|Raised straight-leg fish variation|Finishing|backbend|Establish a supported chest lift without neck compression.|Extend and lift arms and legs only within an instructed stable base; lower limbs before releasing the chest lift.
Sirsasana|Supported headstand|Finishing|inversion|Learn support placement, wall use and controlled exit in person.|Do not kick up from written instructions; only use an established entry with adequate arm support and no painful head or neck load.
Balasana|Child rest|Finishing|knee|Kneel with padding and space between the knees as comfortable.|Sit hips toward heels only as available and rest the trunk on support; sit up to exit.
Baddha Padmasana|Bound lotus sitting|Finishing|lotus|Use an established comfortable lotus; keep hands free initially.|Take a rear bind only if available without pulling feet or stressing knees; release hands before the legs.
Yoga Mudra|Lotus forward gesture|Finishing|lotus|Begin in established lotus or a chosen unbound seated modification.|Hinge forward without leveraging arms against knees; return upright before releasing the legs.
Padmasana|Lotus sitting|Finishing|lotus|Learn hip positioning with an experienced teacher before arranging the feet.|Place legs without hand-forced knee rotation; rest upright and release one leg at a time if any pressure develops.
Utpluthih|Lotus lift|Finishing|lotus|Use an established comfortable lotus and hands beside hips.|Press hands into support to lighten or lift the pelvis without changing knee position; lower under control.
Pasasana|Noose squat twist|Intermediate|twist|Use a supported squat with heels supported if needed.|Rotate the trunk while keeping knee alignment; choose an unbound twist instead of forcing the arm bind.
Krounchasana|Heron leg lift|Intermediate|knee|Sit with one shin folded beside the hip on support and the other knee bent ahead.|Extend the forward leg only as available using a strap; do not shift weight painfully onto the folded knee.
Salabhasana A|Locust arm-back lift|Intermediate|backbend|Lie prone with arms along the trunk and neck relaxed.|Lift the chest and legs a small controlled amount while reaching arms back; lower without jerking.
Salabhasana B|Locust hand-supported lift|Intermediate|backbend|Lie prone and place hands near the ribs with a comfortable elbow angle.|Use the instructed hand-supported chest and leg lift without pushing into lumbar pinching.
Bhekasana|Prone frog backbend|Intermediate|knee|Lie prone with bent knees only within a comfortable range.|Learn the foot hold in person; never force heels toward the floor or rotate the knees with the hands.
Dhanurasana|Bow|Intermediate|backbend|Lie prone and bend knees, taking ankles only if readily reachable.|Lift chest and thighs gently through the ankle connection without forcing the knees together or holding the breath.
Parsva Dhanurasana|Side bow|Intermediate|backbend|Learn a stable comfortable bow and side transition with a teacher.|Roll onto the instructed side without levering a shoulder or knee; release the bow before returning if control is uncertain.
Ustrasana|Camel|Intermediate|backbend|Kneel on padding with hips over knees and hands supporting pelvis.|Lift the chest and lean back only without lumbar pinching; heels need not be reached.
Laghu Vajrasana|Little thunderbolt backbend|Intermediate|backbend|This deep kneeling backbend requires experienced in-person assessment.|Only use a teacher-established preparation and exit; do not drop onto the head or pull at knees to attain the final shape.
Kapotasana A|Pigeon deep backbend with foot hold|Intermediate|backbend|Establish kneeling and teacher-supported backbend preparations.|Work only within the taught setup; written information does not authorize reaching feet or deepening shoulder extension.
Kapotasana B|Pigeon deep backbend with hand support|Intermediate|backbend|Requires a teacher-established deep kneeling backbend base.|Use the instructed hand-supported variation and controlled exit, not a drop or forced adjustment.
Supta Vajrasana|Reclined bound-lotus backbend|Intermediate|lotus|Have a teacher assess the established bound-lotus base and necessary assistance.|Use only the supervised recline and return; do not let a partner pull on knees, feet or neck.
Bakasana A|Crane balance from lift|Intermediate|arm|Start from a squat with secure hands and a teacher-checked arm support.|Shift weight gradually into hands and lift feet only as controlled; step feet back down.
Bakasana B|Crane balance from jump|Intermediate|arm|Requires an established crane balance and taught dynamic entry.|Do not jump from catalog instructions; learn landing, wrist loading and exit with an experienced teacher.
Bharadvajasana|Seated Bharadvaja twist|Intermediate|twist|Sit on support with the taught folded-leg arrangement comfortable.|Lengthen then rotate the trunk without pulling through the knees or using the rear arm as a lever.
Eka Pada Sirsasana|One-leg-behind-head sitting|Intermediate|legbehind|Requires established hip range and an experienced teacher's assessment.|Use only your taught leg placement and exit; never pull the foot behind the head by hand force.
Yoga Nidrasana|Reclined legs-behind-head pose|Intermediate|legbehind|Learn the reclined leg-behind-head preparation under qualified instruction.|Do not force feet behind the neck or compress breathing; use only the established supervised version.
Tittibhasana A|Firefly arm balance|Intermediate|arm|Prepare a wide squat and teacher-checked hands-under-thighs support.|Shift weight into hands and extend legs only with controlled wrists; bend knees and replace feet to exit.
Tittibhasana B|Firefly standing forward fold|Intermediate|fold|Use the taught wide standing fold with arms behind the legs.|Only take a bind that does not pull on knees or shoulders; release before rising.
Tittibhasana C|Firefly walking element|Intermediate|fold|Requires a comfortable taught bound forward-fold base and clear floor.|Practice the teacher-established stepping action without wrenching shoulders or losing balance; unbind to exit.
Pincha Mayurasana|Forearm balance|Intermediate|inversion|Learn forearm placement and a safe wall-supported exit in person.|Use only an established controlled entry; do not kick hard or collapse into the neck.
Karandavasana|Lotus forearm balance and lowering|Intermediate|lotus|Requires established forearm balance, lotus and supervised lowering skills.|Do not combine these from written directions; use only the teacher-taught entry, lowering and exit.
Mayurasana|Peacock arm balance|Intermediate|arm|Have a teacher check the backward-facing hand position and elbow placement.|Transfer weight only within the established comfortable setup and place feet down to leave the balance.
Nakrasana|Crocodile hopping element|Intermediate|arm|Requires a controlled low plank and taught dynamic hand support.|Use only the supervised travel pattern; stop before wrist or shoulder control deteriorates.
Vatayanasana|Half-lotus kneeling balance|Intermediate|lotus|Requires an established half lotus and teacher-checked knee support.|Use the taught standing-to-kneeling transition without forcing lotus or twisting the supporting knee.
Parighasana|Gate side bend|Intermediate|stand|Kneel on padding and extend one leg to the side with a grounded foot.|Reach over the extended leg with supported lower hand, keeping the knee and trunk comfortable.
Gomukhasana A|Cow-face folded-leg sitting|Intermediate|knee|Sit on support and arrange folded legs only within a comfortable hip range.|Lengthen in the taught seated position without pressing knees together or forcing heel placement.
Gomukhasana B|Cow-face seated arm bind|Intermediate|knee|Start with comfortable folded legs and upright supported pelvis.|Reach one arm overhead and one behind only as available; use a strap instead of pulling hands together.
Supta Urdhva Pada Vajrasana|Reclined upward-foot lotus transition|Intermediate|lotus|Requires an established lotus and teacher-checked reclining transition.|Use only the taught transition and exit; do not pull a foot to force the body upright.
Mukta Hasta Sirsasana A|Tripod headstand with palms|Intermediate|inversion|Have a teacher check the three-point support and safe exit.|Use only an established entry with controlled arm support; do not kick up or turn the head.
Mukta Hasta Sirsasana B|Free-hand headstand variation B|Intermediate|inversion|Requires individually taught hand placement and established inversion control.|Do not infer placement from the name; use only your teacher-checked base and exit.
Mukta Hasta Sirsasana C|Free-hand headstand variation C|Intermediate|inversion|Requires individually taught forearm and hand support in this lineage.|Only use the version checked in person; reduce or omit if neck support is uncertain.
Baddha Hasta Sirsasana A|Bound-hand headstand variation A|Intermediate|inversion|Learn the lineage-specific arm arrangement and exit with a teacher.|Use only an established support without head turning or painful neck compression.
Baddha Hasta Sirsasana B|Bound-hand headstand variation B|Intermediate|inversion|Have an experienced teacher establish this distinct arm-support arrangement.|Do not swap supports while inverted without instruction; descend through the taught exit.
Baddha Hasta Sirsasana C|Bound-hand headstand variation C|Intermediate|inversion|Requires teacher-checked shoulder and forearm support.|Only perform the established configuration and descend before control is lost.
Baddha Hasta Sirsasana D|Bound-hand headstand variation D|Intermediate|inversion|Requires individually learned arm support and neck-load assessment.|Use only the teacher-taught version; this catalog is not a progression to reduced support.
Vasisthasana|Advanced side balance with leg reach|Advanced A|arm|In this source the extended-leg side balance uses this name; the first two names may be swapped elsewhere.|Learn the supporting wrist and lifted-leg position in person; use only a controlled teacher-established entry and exit.
Vishvamitrasana|Advanced arm balance with lateral leg extension|Advanced A|arm|Requires teacher-checked arm support and leg extension; naming differs between some traditions.|Use only the version taught in this source's context, without forcing the supporting shoulder or hamstring.
Kasyapasana|Half-lotus side balance|Advanced A|lotus|Requires established lotus and side-arm support with experienced instruction.|Do not pull a bound foot to create the balance; use only the taught entry and controlled lowering.
Chakorasana|Leg-behind-head seated lift|Advanced A|legbehind|Requires an established leg-behind-head seat and safe hand support.|Practice only the taught lift and release without pressing the leg into the neck.
Bhairavasana|Leg-behind-head side support|Advanced A|legbehind|Requires specialist assessment of leg-behind-head and side-arm support.|Use only a supervised established shape; leave it before head, neck or supporting wrist is compressed.
Skandasana|Leg-behind-head forward fold|Advanced A|legbehind|This refers to the Advanced A leg-behind-head form, not the common side squat.|Use only the teacher-established fold and exit; do not substitute a side lunge under this identity.
Durvasasana|Standing leg-behind-head balance|Advanced A|legbehind|Requires established leg-behind-head range and experienced supervised balance work.|Only use a controlled taught rise and exit with nearby support; do not pull the foot behind the head.
Urdhva Kukkutasana A|Raised lotus balance from inversion|Advanced A|lotus|Requires a taught inverted lotus-to-arm-balance transition.|Do not attempt from text; keep the teacher-established support and exit without forcing knees.
Urdhva Kukkutasana B|Raised lotus balance from forward placement|Advanced A|lotus|Requires an established lotus and this separately taught transition.|Use only the learned hand placement and lift without landing heavily on wrists.
Urdhva Kukkutasana C|Raised lotus balance from seated lift|Advanced A|lotus|Requires a controlled lotus lift and taught forward transfer.|Use only the established entry and exit; release any knee pressure rather than forcing the transfer.
Galavasana|Flying pigeon arm balance|Advanced A|arm|Learn the folded-leg contact and wrist support with an experienced teacher.|Transfer weight only in the established comfortable setup; do not force the bent knee or jump into the balance.
Eka Pada Bakasana A|One-leg crane variation A|Advanced A|arm|Requires established crane and teacher-checked one-leg transition.|Use only the learned support, leg arrangement and exit without collapsing the supporting shoulder.
Eka Pada Bakasana B|One-leg crane variation B|Advanced A|arm|Learn this lineage's separate leg arrangement and transition in person.|Do not infer the B variation from the name; practice only the configuration checked by your teacher.
Koundinyasana A|Twisted sage arm balance|Advanced A|arm|Requires established trunk rotation and supported arm balance under instruction.|Use only the taught leg and arm contacts; do not use elbow pressure to force a twist.
Koundinyasana B|Split-leg sage arm balance|Advanced A|arm|Requires a teacher-established split-leg and arm-support configuration.|Practice only a controlled taught entry and replace the feet before support fails.
Astavakrasana A|Eight-angle arm balance from placement|Advanced A|arm|Learn the thigh-on-arm support and leg arrangement with a teacher.|Extend legs only while wrists and trunk remain stable; lower through the taught exit.
Astavakrasana B|Eight-angle dynamic-entry element|Advanced A|arm|Requires an established eight-angle balance and separately taught dynamic entry.|Do not jump into this from written information; entry and exit need supervised wrist-load control.
Purna Matsyendrasana|Full seated spinal twist|Advanced A|lotus|Requires teacher-assessed deep folded-leg sitting and hip range.|Rotate only within the established base without using a bind to pull through the knees.
Viparita Dandasana|Inverted staff backbend|Advanced A|backbend|Requires specialist assessment of shoulder, spine and head-support transitions.|Use only the taught preparation and exit; do not place unsupported weight on the neck.
Eka Pada Viparita Dandasana|One-leg inverted staff backbend|Advanced A|backbend|Requires an established instructed inverted staff with stable support.|Do not add a leg lift automatically; use only the separately taught balance and lowering.
Vrschikasana|Forearm scorpion|Advanced B|inversion|Requires established forearm balance and advanced backbend under experienced instruction.|Do not bend into scorpion from this catalog; use only a supervised established transition and exit.
Sayanasana|Elbow-supported resting inversion|Advanced B|inversion|Requires individually assessed elbow support and advanced inversion control.|Do not reduce forearm support from written guidance; use only the teacher-taught setup and descent.
Omkarasana|Om-shaped advanced arm balance|Advanced B|legbehind|Requires teacher-established leg-behind-head and asymmetrical arm-support skills.|Do not construct the shape from the name; use only a supervised learned version without neck or knee forcing.
`.trim().split('\n').map(r => r.split('|'));

export function yogaContent(): Activity[] {
  return rows.map(([sanskrit, english, context, category, setup, move]) => {
    const sid = /Intermediate|Advanced/.test(context) ? 'asher-later' : 'asher-primary';
    const a = base(sanskrit, 'yoga', [sid]);
    a.englishName = english; a.sanskritName = sanskrit;
    a.aliases = sanskrit === 'Paschimattanasana A' ? ['Pascimattanasana A', 'Paschimottanasana A']
      : sanskrit === 'Trianga Mukhaikapada Paschimattanasana' ? ['Triyanga Mukhaikapada Pascimattanasana']
      : sanskrit.startsWith('Marichyasana') ? [sanskrit.replace('Marichyasana', 'Maricasana')]
      : sanskrit === 'Purvottanasana' ? ['Purvattanasana']
      : sanskrit === 'Eka Pada Sirsasana' ? ['Eka Pada Sirasana'] : [];
    a.family = 'ashtanga-vinyasa';
    a.seriesContext = [{ label: context, lineage: 'Philippa Asher, as learned from Pattabhi Jois and Sharath Jois at KPJAYI; names, transitions and sequence conventions can differ between teachers.', sourceId: sid }];
    a.description = `${english}: ${sanskrit}, referenced in the ${context} context of Philippa Asher's practice sheets. English label is descriptive, not a literal translation. This is an identity/reference entry, not permission to attempt or progress to the posture.`;
    a.setup = [setup, 'Use a clear, non-slip practice surface and a version already appropriate to your experience.'];
    a.execution = [move, 'Keep breathing comfortable; leave through a controlled learned exit before strain or fatigue changes the position.'];
    a.cues = ['Range and control matter more than achieving the illustrated final shape.', 'No fixed breath count or sequence progression is prescribed here.'];
    a.commonMistakes = ['Forcing the shape to match a reference chart.', 'Treating series membership as a recommendation to attempt it.'];
    a.precautions.push('Tradition and sequence context do not establish individual suitability or any medical benefit.');
    a.modifications = ['Use teacher-selected supports or a simpler separately chosen posture; a modification is not an automatic series advancement.'];
    if (['lotus', 'knee', 'legbehind'].includes(category)) {
      a.precautions.push('Do not use the hands or a partner to force knee rotation or lotus/leg-behind-head range. Stop for knee or ankle pressure.');
      a.modifications.push('Keep the legs unbound in a comfortable seated position; omit lotus or leg-behind-head placement when not established.');
    }
    if (['inversion', 'neck'].includes(category)) {
      a.precautions.push('Head/neck loading and inverted transitions need experienced instruction. Never turn the head under load; clinical restrictions override practice references.');
      a.modifications.push('Omit the inversion and choose a comfortable non-inverted rest with your teacher.');
    }
    if (category === 'backbend') {
      a.precautions.push('Do not chase backbend depth by pinching the low back or forcing shoulder range.');
      a.modifications.push('Use a shallower supported chest lift without head or neck loading.');
    }
    if (category === 'arm') a.precautions.push('Hand-supported balances load wrists and shoulders. Learn a controlled exit and do not jump into an unfamiliar support.');
    a.equipment = ['mat']; a.supportedMetrics = ['breaths', 'duration'];
    a.laterality = 'unknown';
    a.difficulty = /Advanced/.test(context) || ['legbehind', 'neck', 'inversion', 'lotus'].includes(category) ? 'advanced'
      : context === 'Intermediate' ? 'intermediate' : 'unknown';
    a.instructionNeeded = /Intermediate|Advanced/.test(context) || ['arm', 'lotus', 'knee', 'inversion', 'legbehind', 'neck', 'backbend'].includes(category);
    a.movementPatterns = [category === 'twist' ? 'rotation' : 'hold'];
    a.benefits = [{ text: 'Provides a defined posture or transition for deliberate movement and attention practice.', sourceIds: [sid],
      qualification: 'Describes the practice context only. Traditional purification or therapeutic claims are not adopted; no promised psychological, clinical or injury-prevention outcome.' }];
    return a;
  });
}
