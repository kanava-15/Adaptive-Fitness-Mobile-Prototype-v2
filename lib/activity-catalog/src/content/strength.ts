import type { Activity, Source } from '../schema';
import { base, slug, source } from './common';

// Deliberately curated individual identities, NOT an equipment × movement expansion.
// Each row names a mechanically meaningful exercise and the exact observed directory link.
// Same exercise under multiple muscles, trivial grip synonyms and machine brands are omitted.
const rows = `
Barbell military press|DeltoidAnterior/BBMilitaryPress|ShouldWt|press
Seated barbell military press|DeltoidAnterior/BBSeatedMilitaryPress|ShouldWt|press
Dumbbell Arnold press|DeltoidAnterior/DBArnoldPress|ShouldWt|press
Dumbbell shoulder press|DeltoidAnterior/DBShoulderPress|ShouldWt|press
One-arm dumbbell shoulder press|DeltoidAnterior/DBOneArmShoulderPress|ShouldWt|press
Standing cable shoulder press|DeltoidAnterior/CBStandingShoulderPress|ShouldWt|press
Seated cable shoulder press|DeltoidAnterior/CBShoulderPress|ShouldWt|press
Machine shoulder press|DeltoidAnterior/LVShoulderPress|ShouldWt|press
Reclined machine shoulder press|DeltoidAnterior/LVReclinedShoulderPress|ShouldWt|press
Smith shoulder press|DeltoidAnterior/SMShoulderPress|ShouldWt|press
Barbell front raise|DeltoidAnterior/BBFrontRaise|ShouldWt|raise
Dumbbell front raise|DeltoidAnterior/DBFrontRaise|ShouldWt|raise
One-arm cable front raise|DeltoidAnterior/CBFrontRaise|ShouldWt|raise
Suspension front raise|DeltoidAnterior/STFrontRaise|ShouldWt|raise
Barbell upright row|DeltoidLateral/BBUprightRow|ShouldWt|upright
Cable upright row|DeltoidLateral/CBUprightRow|ShouldWt|upright
Dumbbell upright row|DeltoidLateral/DBUprightRow|ShouldWt|upright
Smith upright row|DeltoidLateral/SMUprightRow|ShouldWt|upright
Dumbbell lateral raise|DeltoidLateral/DBLateralRaise|ShouldWt|lateral
Incline dumbbell lateral raise|DeltoidLateral/DBInclineLateralRaise|ShouldWt|lateral
Lying dumbbell lateral raise|DeltoidLateral/DBLyingLateralRaise|ShouldWt|lateral
One-arm cable lateral raise|DeltoidLateral/CBOneArmLateralRaise|ShouldWt|lateral
Machine lateral raise|DeltoidLateral/LVLateralRaise|ShouldWt|lateral
Cable Y raise|DeltoidLateral/CBYRaise|ShouldWt|raise
Suspension Y raise|DeltoidLateral/STYShoulderRaise|ShouldWt|raise
Barbell rear-delt row|DeltoidPosterior/BBRearDeltRow|ShouldWt|rear-row
Cable rear-delt row|DeltoidPosterior/CBRearDeltRow|ShouldWt|rear-row
Dumbbell rear-delt row|DeltoidPosterior/DBRearDeltRow|ShouldWt|rear-row
Dumbbell rear lateral raise|DeltoidPosterior/DBRearLateralRaise|ShouldWt|rear-fly
Seated dumbbell rear lateral raise|DeltoidPosterior/DBSeatedRearLateralRaise|ShouldWt|rear-fly
Cable reverse fly|DeltoidPosterior/CBStandingReverseFly|ShouldWt|rear-fly
Machine reverse fly|DeltoidPosterior/LVRearLateralRaise|ShouldWt|rear-fly
Suspension reverse fly|DeltoidPosterior/STReverseFly|ShouldWt|rear-fly
Barbell close-grip bench press|Triceps/BBCloseGripBenchPress|ArmWt|bench
Smith close-grip bench press|Triceps/SMCloseGripBenchPress|ArmWt|bench
Barbell lying triceps extension|Triceps/BBLyingTriExt|ArmWt|triceps
Barbell overhead triceps extension|Triceps/BBTriExt|ArmWt|triceps
Cable bent-over triceps extension|Triceps/CBBentoverTriExt|ArmWt|triceps
Cable lying triceps extension|Triceps/CBLyingTriExt|ArmWt|triceps
Cable triceps pushdown|Triceps/CBPushdown|ArmWt|pushdown
One-arm cable triceps pushdown|Triceps/CBOneArmPushdown|ArmWt|pushdown
Cable overhead triceps extension|Triceps/CBTriExt|ArmWt|triceps
Dumbbell triceps kickback|Triceps/DBKickback|ArmWt|kickback
Dumbbell lying triceps extension|Triceps/DBLyingTriExt|ArmWt|triceps
Dumbbell overhead triceps extension|Triceps/DBTriExt|ArmWt|triceps
Machine triceps extension|Triceps/LVTriExt|ArmWt|triceps
Suspension triceps extension|Triceps/STTricepsExtension|ArmWt|triceps
Bodyweight bench dip|Triceps/BWBenchDip|ArmWt|dip
Bodyweight triceps dip|Triceps/BWTriDip|ArmWt|dip
Machine-assisted triceps dip|Triceps/ASTriDip|ArmWt|dip
Band-assisted triceps dip|Triceps/ASTricepsDipBand|ArmWt|dip
Weighted triceps dip|Triceps/WtTriDip|ArmWt|dip
Close-grip push-up|Triceps/BWCloseGripPushup|ArmWt|pushup
Kneeling close-grip push-up|Triceps/BWCloseGripPushupKnees|ArmWt|pushup
Incline close-grip push-up|Triceps/BWCloseGripInclinePushupBar|ArmWt|pushup
Barbell biceps curl|Biceps/BBCurl|ArmWt|curl
Cable biceps curl|Biceps/CBCurl|ArmWt|curl
One-arm cable biceps curl|Biceps/CBOneArmCurl|ArmWt|curl
Dumbbell biceps curl|Biceps/DBCurl|ArmWt|curl
Incline dumbbell curl|Biceps/DBInclineCurl|ArmWt|curl
Machine biceps curl|Biceps/LVCurl|ArmWt|curl
Barbell preacher curl|Brachialis/BBPreacherCurl|ArmWt|curl
Prone incline barbell curl|Brachialis/BBProneInclineCurl|ArmWt|curl
Cable concentration curl|Brachialis/CBConcentrationCurl|ArmWt|curl
Cable preacher curl|Brachialis/CBPreacherCurl|ArmWt|curl
Dumbbell concentration curl|Brachialis/DBConcentrationCurl|ArmWt|curl
Dumbbell preacher curl|Brachialis/DBPreacherCurl|ArmWt|curl
Machine preacher curl|Brachialis/LVPreacherCurl|ArmWt|curl
Suspension arm curl|Brachialis/STArmCurl|ArmWt|curl
Barbell bent-over row|BackGeneral/BBBentOverRow|BackWt|row
Underhand barbell bent-over row|BackGeneral/BBUnderhandBentOverRow|BackWt|row
One-arm cable bent-over row|BackGeneral/CBOneArmBentoverRow|BackWt|row
Cable seated row|BackGeneral/CBSeatedRow|BackWt|row
Wide-grip cable seated row|BackGeneral/CBWideGripSeatedRow|BackWt|row
Dumbbell bent-over row|BackGeneral/DBBentOverRow|BackWt|row
Chest-supported dumbbell row|BackGeneral/DBLyingRow|BackWt|row
Machine seated row|BackGeneral/LVSeatedRow|BackWt|row
Machine seated high row|BackGeneral/LVSeatedHighRow|BackWt|row
T-bar row|BackGeneral/LVTBarRow|BackWt|row
Smith bent-over row|BackGeneral/SMBentOverRow|BackWt|row
Inverted row|BackGeneral/BWSupineRow|BackWt|inverted
Feet-elevated inverted row|BackGeneral/BWSupineRowFeetElevated|BackWt|inverted
Underhand inverted row|BackGeneral/BWUnderhandSupineRow|BackWt|inverted
Suspension row|BackGeneral/STRow|BackWt|inverted
One-arm suspension row|BackGeneral/STOneArmRow|BackWt|inverted
Pull-up|LatissimusDorsi/BWPullup|BackWt|pullup
Chin-up|LatissimusDorsi/BWUnderhandChinup|BackWt|pullup
Neutral close-grip pull-up|LatissimusDorsi/BWCloseGripChinup|BackWt|pullup
Archer pull-up|LatissimusDorsi/BWArcherPullup|BackWt|pullup
One-arm pull-up|LatissimusDorsi/BWOneArmPullup|BackWt|pullup
Machine-assisted chin-up|LatissimusDorsi/AsUnderhandChinup|BackWt|pullup
Band-assisted pull-up|LatissimusDorsi/ASPullupBand|BackWt|pullup
Band-assisted chin-up|LatissimusDorsi/ASChinupBand|BackWt|pullup
Weighted pull-up|LatissimusDorsi/WtPullup|BackWt|pullup
Weighted chin-up|LatissimusDorsi/WtUnderhandChinup|BackWt|pullup
Cable lat pulldown|LatissimusDorsi/CBFrontPulldown|BackWt|pulldown
Close-grip cable pulldown|LatissimusDorsi/CBCloseGripPulldown|BackWt|pulldown
Underhand cable pulldown|LatissimusDorsi/CBUnderhandPulldown|BackWt|pulldown
Machine lat pulldown|LatissimusDorsi/LVPulldown|BackWt|pulldown
Barbell pullover|LatissimusDorsi/BBPullover|BackWt|pullover
Cable bent-over pullover|LatissimusDorsi/CBBentoverPullover|BackWt|pullover
Machine pullover|LatissimusDorsi/LVPullover|BackWt|pullover
Barbell shrug|TrapeziusUpper/BBShrug|BackWt|shrug
Dumbbell shrug|TrapeziusUpper/DBShrug|BackWt|shrug
Cable shrug|TrapeziusUpper/CBShrug|BackWt|shrug
Machine shrug|TrapeziusUpper/LVShrug|BackWt|shrug
Smith shrug|TrapeziusUpper/SMShrug|BackWt|shrug
Cable shoulder external rotation|Infraspinatus/CBStandingExternalRotation|BackWt|external
Side-lying dumbbell external rotation|Infraspinatus/DBLyingExternalRotation|BackWt|external
Supported upright dumbbell external rotation|Infraspinatus/DBUprightExternalRotationSupport|BackWt|external
Machine shoulder external rotation|Infraspinatus/LVExternalRotation|BackWt|external
Cable shoulder internal rotation|Subscapularis/CBStandingInternalRotation|BackWt|internal
Floor dumbbell internal rotation|Subscapularis/DBInternalRotationFloor|BackWt|internal
Machine shoulder internal rotation|Subscapularis/LVInternalRotation|BackWt|internal
Barbell bench press|PectoralSternal/BBBenchPress|ChestWt|bench
Decline barbell bench press|PectoralSternal/BBDeclineBenchPress|ChestWt|bench
Incline barbell bench press|PectoralClavicular/BBInclineBenchPress|ChestWt|bench
Dumbbell bench press|PectoralSternal/DBBenchPress|ChestWt|bench
Decline dumbbell bench press|PectoralSternal/DBDeclineBenchPress|ChestWt|bench
Incline dumbbell bench press|PectoralClavicular/DBInclineBenchPress|ChestWt|bench
Cable bench press|PectoralSternal/CBBenchPress|ChestWt|bench
Standing cable chest press|PectoralSternal/CBStandingChestPress|ChestWt|bench
Machine chest press|PectoralSternal/LVChestPress|ChestWt|bench
Incline machine chest press|PectoralClavicular/LVInclineChestPress|ChestWt|bench
Decline machine chest press|PectoralSternal/LVDeclineChestPress|ChestWt|bench
Smith bench press|PectoralSternal/SMBenchPress|ChestWt|bench
Incline Smith bench press|PectoralClavicular/SMInclineBenchPress|ChestWt|bench
Decline Smith bench press|PectoralSternal/SMDeclineBenchPress|ChestWt|bench
Dumbbell chest fly|PectoralSternal/DBFly|ChestWt|fly
Incline dumbbell fly|PectoralClavicular/DBInclineFly|ChestWt|fly
Standing cable fly|PectoralSternal/CBStandingFly|ChestWt|fly
Lying cable fly|PectoralSternal/CBLyingFly|ChestWt|fly
Seated cable fly|PectoralSternal/CBSeatedFly|ChestWt|fly
Incline cable fly|PectoralClavicular/CBInclineFly|ChestWt|fly
Machine pec-deck fly|PectoralSternal/LVPecDeckFly|ChestWt|fly
Suspension chest fly|PectoralSternal/STFly|ChestWt|fly
Dumbbell chest pullover|PectoralSternal/DBPullover|ChestWt|pullover
Push-up|PectoralSternal/BWPushup|ChestWt|pushup
Incline push-up|PectoralSternal/BWInclinePushup|ChestWt|pushup
Kneeling push-up|PectoralSternal/BWPushupKnee|ChestWt|pushup
Decline push-up|PectoralClavicular/BWDeclinePushup|ChestWt|pushup
Archer push-up|PectoralSternal/BWArcherPushup|ChestWt|pushup
Weighted push-up|PectoralSternal/WtPushup|ChestWt|pushup
Suspension chest press|PectoralSternal/STChestPress|ChestWt|pushup
Push-up plus|SerratusAnterior/BWPushUpPlus|ChestWt|scapular
Cable kneeling crunch|RectusAbdominis/CBKneelingCrunch|WaistWt|crunch
Cable seated crunch|RectusAbdominis/CBSeatedCrunch|WaistWt|crunch
Cable standing crunch|RectusAbdominis/CBStandingCrunch|WaistWt|crunch
Machine seated crunch|RectusAbdominis/LVSeatedCrunch|WaistWt|crunch
Bodyweight crunch|RectusAbdominis/BWCrunch|WaistWt|crunch
Stability-ball crunch|RectusAbdominis/BWBallCrunch|WaistWt|crunch
Incline crunch|RectusAbdominis/BWInclineCrunch|WaistWt|crunch
Bodyweight sit-up|RectusAbdominis/BWSitUp|WaistWt|situp
Incline sit-up|RectusAbdominis/BWInclineSitUp|WaistWt|situp
Front plank|RectusAbdominis/BWFrontPlank|WaistWt|plank
Side plank|Obliques/BWSidePlank|WaistWt|side-plank
Bent-knee side plank|Obliques/BWBentKneeSidePlank|WaistWt|side-plank
Bodyweight twisting crunch|Obliques/BWTwistingCrunch|WaistWt|twist
Bodyweight side crunch|Obliques/BWSideCrunch|WaistWt|twist
Cable side bend|Obliques/CBSideBend|WaistWt|sidebend
Dumbbell side bend|Obliques/DBSideBend|WaistWt|sidebend
Cable seated twist|Obliques/CBSeatedTwist|WaistWt|twist
Machine seated twist|Obliques/LVTwist|WaistWt|twist
Suspension jackknife|RectusAbdominis/STJackknife|WaistWt|legraise
Barbell deadlift|ErectorSpinae/BBDeadlift|WaistWt|deadlift
Barbell stiff-leg deadlift|ErectorSpinae/BBStiffLegDeadlift|WaistWt|hinge
Cable stiff-leg deadlift|ErectorSpinae/CBStiffLegDeadlift|WaistWt|hinge
One-arm dumbbell straight-leg deadlift|ErectorSpinae/DBOneArmStraightLegDeadlift|WaistWt|hinge
Machine deadlift|ErectorSpinae/LVDeadlift|WaistWt|deadlift
Smith deadlift|ErectorSpinae/SMDeadlift|WaistWt|deadlift
Barbell bent-knee good morning|ErectorSpinae/BBBentKneeGoodMorning|WaistWt|hinge
Smith bent-knee good morning|ErectorSpinae/SMBentKneeGoodMorning|WaistWt|hinge
Machine back extension|ErectorSpinae/LVBackExtensionN|WaistWt|back
Stability-ball back extension|ErectorSpinae/BWHyperextensionBall|WaistWt|back
Bodyweight 45-degree back extension|ErectorSpinae/BW45HyperextensionHips|WaistWt|back
Bird dog|ErectorSpinae/BWBirdDog|WaistWt|bird
Superman|ErectorSpinae/Superman|WaistWt|back
Rear bridge plank|ErectorSpinae/BackPlank|WaistWt|rear-plank
Barbell hip thrust|GluteusMaximus/BBHipThrust|HipsWt|hipthrust
Barbell forward lunge|GluteusMaximus/BBLunge|HipsWt|lunge
Barbell reverse lunge|GluteusMaximus/BBRearLunge|HipsWt|lunge
Barbell split squat|GluteusMaximus/BBSplitSquat|HipsWt|lunge
Rear-foot-elevated barbell split squat|GluteusMaximus/BBSingleLegSplitSquat|HipsWt|lunge
Barbell back squat|GluteusMaximus/BBSquat|HipsWt|squat
Barbell front squat|GluteusMaximus/BBFrontSquat|HipsWt|squat
Barbell step-up|GluteusMaximus/BBStepUp|HipsWt|step
Cable glute kickback|GluteusMaximus/CBGluteKickback|HipsWt|hipext
Cable standing hip extension|GluteusMaximus/CBStandingHipExtension|HipsWt|hipext
Cable squat|GluteusMaximus/CBSquat|HipsWt|squat
Dumbbell forward lunge|GluteusMaximus/DBLunge|HipsWt|lunge
Dumbbell reverse lunge|GluteusMaximus/DBRearLunge|HipsWt|lunge
Dumbbell split squat|GluteusMaximus/DBSplitSquat|HipsWt|lunge
Dumbbell squat|GluteusMaximus/DBSquat|HipsWt|squat
Dumbbell front squat|GluteusMaximus/DBFrontSquat|HipsWt|squat
Dumbbell step-up|GluteusMaximus/DBStepUp|HipsWt|step
Dumbbell step-down|GluteusMaximus/DBStepDown|HipsWt|step
Machine seated leg press|GluteusMaximus/LVSeatedLegPress|HipsWt|legpress
Machine lying hip extension|GluteusMaximus/LVLyingHipExtension|HipsWt|hipext
Machine reverse hyperextension|GluteusMaximus/LVReverseHyperextension|HipsWt|hipext
Smith back squat|GluteusMaximus/SMSquat|HipsWt|squat
Bodyweight forward lunge|GluteusMaximus/BWLunge|HipsWt|lunge
Bodyweight reverse lunge|GluteusMaximus/BWRearLunge|HipsWt|lunge
Bodyweight split squat|GluteusMaximus/BWSplitSquat|HipsWt|lunge
Rear-foot-elevated bodyweight split squat|GluteusMaximus/BWSingleLegSplitSquat|HipsWt|lunge
Bodyweight squat|GluteusMaximus/BWSquat|HipsWt|squat
Bodyweight pistol squat|GluteusMaximus/BWSingleLegSquat|HipsWt|squat
Single-leg box squat|GluteusMaximus/BWSingleLegBoxSquat|HipsWt|squat
Bodyweight single-leg stiff-leg deadlift|GluteusMaximus/BWSingleLegStiffLegDeadlift|HipsWt|hinge
Bodyweight step-up|GluteusMaximus/BWStepUp|HipsWt|step
Bodyweight step-down|GluteusMaximus/BWStepDown|HipsWt|step
Suspension hip bridge|GluteusMaximus/STHipBridge|HipsWt|hipthrust
Cable hip abduction|HipAbductor/CBHipAbduction|HipsWt|abduct
Machine seated hip abduction|HipAbductor/LVSeatedHipAbduction|HipsWt|abduct
Side-bridge hip abduction|HipAbductor/BWSideBridgeHipAbduction|HipsWt|abduct
Hanging bent-knee leg raise|HipFlexors/BWHangingLegRaise|HipsWt|legraise
Hanging straight-leg raise|HipFlexors/BWHangingStraightLegRaise|HipsWt|legraise
Lying bent-knee leg raise|HipFlexors/BWLyingLegRaiseFloor|HipsWt|legraise
Lying straight-leg raise|HipFlexors/BWStraightLegRaise|HipsWt|legraise
Suspension pike|HipFlexors/STPike|HipsWt|legraise
Machine leg extension|Quadriceps/LVLegExtension|ThighWt|legext
Machine seated leg curl|Hamstrings/LVSeatedLegCurl|ThighWt|legcurl
Machine lying leg curl|Hamstrings/LVLyingLegCurl|ThighWt|legcurl
Machine standing leg curl|Hamstrings/LVStandingLegCurl|ThighWt|legcurl
Machine hip adduction|HipAdductors/LVSeatedHipAdduction|ThighWt|adduct
Cable hip adduction|HipAdductors/CBHipAdduction|ThighWt|adduct
Dumbbell standing calf raise|Gastrocnemius/DBStandingCalfRaise|CalfWt|calf
Bodyweight standing calf raise|Gastrocnemius/BWStandingCalfRaise|CalfWt|calf
Bodyweight single-leg calf raise|Gastrocnemius/BWSingleLegCalfRaise|CalfWt|calf
Machine seated calf raise|Soleus/LVSeatedCalfRaise|CalfWt|calf
Bodyweight reverse calf raise|TibialisAnterior/BWReverseCalfRaise|CalfWt|tibialis
Barbell reverse curl|Brachioradialis/BBReverseCurl|ForeArmWt|curl
Dumbbell hammer curl|Brachioradialis/DBHammerCurl|ForeArmWt|curl
Cable hammer curl|Brachioradialis/CBHammerCurl|ForeArmWt|curl
Barbell wrist curl|WristFlexors/BBWristCurl|ForeArmWt|wrist
Dumbbell wrist curl|WristFlexors/DBWristCurl|ForeArmWt|wrist
Cable wrist curl|WristFlexors/CBWristCurl|ForeArmWt|wrist
Barbell reverse wrist curl|WristExtensors/BBReverseWristCurl|ForeArmWt|wrist
Dumbbell reverse wrist curl|WristExtensors/DBReverseWristCurl|ForeArmWt|wrist
Dumbbell forearm pronation|Pronators/DBSeatedPronation|ForeArmWt|forearm
Dumbbell forearm supination|Supinators/DBSeatedSupination|ForeArmWt|forearm
`.trim().split('\n').map(row => row.split('|'));

type Guide = [setup: string, move: string, cue: string, mistake: string, modification: string, pattern: NonNullable<Activity['movementPatterns']>[number]];
// Original movement-family guidance, further qualified by each row's implement, position and action.
const guides: Record<string, Guide> = {
  press: ['Set your feet or seated support firmly; begin with handles near shoulder level.', 'Press upward without leaning back, then lower toward the starting shoulder position.', 'Keep ribs over pelvis and choose a comfortable elbow path.', 'Arching the low back to finish the press.', 'Use a lighter load and stop below any uncomfortable overhead angle.', 'push'],
  raise: ['Start with arms low and a soft bend in the elbows.', 'Raise the arms forward; for the Y raise, move forward and outward in a Y, then lower slowly.', 'Stop before the torso needs to lean to create height.', 'Swinging through the low position.', 'Practice without resistance and reduce the height.', 'push'],
  lateral: ['Keep your trunk supported in the named standing, inclined or lying position.', 'Lift the arm away from your side in a comfortable arc, then return without dropping the resistance.', 'Use a soft elbow and a range that does not pinch.', 'Shrugging and heaving the trunk to lift higher.', 'Reduce resistance and the arc of elevation.', 'push'],
  upright: ['Stand tall with the implement in front of your thighs.', 'Draw the implement upward close to the body, letting elbows lead only as high as comfortable; lower under control.', 'There is no need to pull to chin height.', 'Forcing the elbows high through a pinching shoulder.', 'Use a lower pull height or a separately chosen lateral raise.', 'pull'],
  'rear-row': ['Hinge or use the named seated support, with arms reaching ahead.', 'Draw elbows out and back toward the upper torso; return while keeping trunk position.', 'Let shoulder blades move rather than locking them together.', 'Turning this into a low-elbow lat row or jerking the spine.', 'Use chest support and less resistance.', 'pull'],
  'rear-fly': ['Use a hip hinge or the named seated support, starting with arms forward.', 'Open the arms out to the sides with softly bent elbows and return smoothly.', 'Keep the neck long and the opening arc comfortable.', 'Raising the chest with each repetition.', 'Shorten the opening arc and use lighter resistance.', 'pull'],
  bench: ['Use the named bench angle or chest-press support. Keep feet and trunk secure with handles beside the chest.', 'Press away from the chest; lower toward the same start without bouncing or forcing shoulder depth.', 'Keep forearms aligned with the direction of resistance.', 'Flaring wrists back or bouncing off the chest.', 'Lower resistance and shorten the bottom range; use safeties or a spotter for a bar.', 'push'],
  triceps: ['Fix upper arms in the named lying, overhead or machine-supported position.', 'Bend at the elbows without changing upper-arm position, then extend elbows smoothly.', 'Keep the movement at the elbows rather than throwing the load.', 'Allowing elbows to travel as a way to lift more.', 'Use less load and a smaller elbow-bending range.', 'push'],
  pushdown: ['Face a high cable with elbows beside your ribs.', 'Straighten the elbows to move the attachment down, then let it rise as elbows bend.', 'Keep upper arms quiet; do not lean on the cable.', 'Using body weight rather than elbow extension.', 'Use a lighter stack and a comfortable attachment.', 'push'],
  kickback: ['Hinge with support available and upper arm beside the trunk.', 'Keep the upper arm fixed while straightening and re-bending the elbow.', 'Start light enough to avoid swinging.', 'Moving the whole arm instead of extending the elbow.', 'Support the free hand and shorten the extension range.', 'push'],
  dip: ['Use secure bars or a stable bench behind you, according to the named variation.', 'Bend elbows and lower only within a comfortable shoulder range, then push to return.', 'Assistance should remain stable throughout the lowering.', 'Dropping into deep shoulder extension or bouncing.', 'Support feet or use assistance; avoid the exercise if that position is uncomfortable.', 'push'],
  pushup: ['Place hands on the named floor, incline or suspension support; use knees when named.', 'Bend elbows to lower the trunk as one unit, then press away. Archer versions shift toward one arm while the other assists.', 'Keep abdomen engaged and support height stable.', 'Sagging the low back or craning the neck.', 'Raise the hand support or use a separately chosen knee-supported version.', 'push'],
  curl: ['Keep upper arms stable; use the named incline, preacher or concentration support when present.', 'Bend elbows to bring the implement toward the shoulders and lower without losing upper-arm position.', 'Use palms up except neutral hammer or palms-down reverse versions.', 'Throwing elbows forward or rocking the torso.', 'Reduce load and use supported upper arms.', 'pull'],
  row: ['Use the named chest support, seat or hip hinge; begin with arms reaching.', 'Draw the handles toward your trunk and let arms extend again without jerking the back.', 'High and rear-delt rows use a higher elbow path; otherwise elbows track comfortably near the ribs.', 'Using spinal movement as the main source of the pull.', 'Use chest support or a lighter resistance.', 'pull'],
  inverted: ['Grip a secure bar or suspension handles with the body below the anchor.', 'Pull your chest toward the support, keeping trunk aligned, then lower to extended arms.', 'Move feet closer to the anchor to reduce the challenge.', 'Sagging hips or relying on a loose anchor.', 'Bend knees and use a more upright angle.', 'pull'],
  pullup: ['Grip a secure bar; position any assistance or added load before hanging.', 'Pull upward through a comfortable shoulder path, then lower under control without swinging.', 'Chin-up uses palms toward you; archer shifts toward one arm; one-arm requires specialist instruction.', 'Kipping or dropping abruptly from the top.', 'Use stable assistance or feet support, not an uncontrolled jump to the bar.', 'pull'],
  pulldown: ['Sit with thighs secured below the pads and take the named grip.', 'Pull the attachment toward the upper chest and return overhead without losing your seated position.', 'Do not pull behind the neck.', 'Leaning far backward to turn the movement into a row.', 'Use a lighter stack and reduce overhead reach if needed.', 'pull'],
  pullover: ['Use the named bench, cable or machine support with a small elbow bend.', 'Move the arms through a comfortable overhead-to-forward arc while maintaining that elbow angle.', 'Keep ribs quiet and avoid forcing the overhead range.', 'Arching the spine to get more shoulder range.', 'Use a smaller arc and less resistance.', 'pull'],
  shrug: ['Hold the implement beside or in front of you with arms long.', 'Lift shoulder blades upward, then lower them slowly without rolling shoulders in circles.', 'Keep the neck relaxed and look ahead.', 'Bending elbows or jutting the head forward.', 'Start with a light load and smaller elevation.', 'pull'],
  external: ['Support the elbow in the named upright, side-lying or machine position.', 'Rotate the upper arm to move the hand outward against resistance, then return.', 'Keep the elbow angle and trunk position unchanged.', 'Twisting the torso to simulate shoulder rotation.', 'Use very light resistance and a short comfortable arc.', 'joint-isolation'],
  internal: ['Use the named floor or cable support and keep the bent elbow stable.', 'Rotate the upper arm inward to move the hand toward the body, then return smoothly.', 'The shoulder, not the whole trunk, supplies the rotation.', 'Shifting the elbow or twisting the body.', 'Reduce load and restrict the rotation to a comfortable range.', 'joint-isolation'],
  fly: ['Use the named bench, seat, cable stance or suspension support with elbows softly bent.', 'Open the arms only within a comfortable chest range, then bring the arms together along the same arc.', 'Maintain the elbow bend and control the wide position.', 'Dropping too deep or turning the fly into a heavy press.', 'Shorten the opening arc and decrease resistance.', 'push'],
  scapular: ['Start in a stable push-up support with elbows straight but not forced back.', 'Allow shoulder blades to approach, then press the support away so they spread; keep elbows straight.', 'The chest moves slightly without an elbow push-up.', 'Bending elbows or rounding the whole spine instead of moving shoulder blades.', 'Use a wall or elevated hand support.', 'push'],
  crunch: ['Support the pelvis and begin with the ribs comfortably away from it.', 'Bring the ribs toward the pelvis with a small trunk curl, then return slowly.', 'Avoid pulling on your neck.', 'Trying to make the movement a full sit-up or using momentum.', 'Reduce resistance and the amount of trunk curl.', 'hold'],
  situp: ['Lie with knees bent and feet secure only as intended for the named support.', 'Raise the torso with control, then lower gradually without dropping to the floor.', 'Use a range in which the back feels comfortable.', 'Jerking the head or throwing the arms.', 'Use a smaller lift or a separately chosen crunch.', 'hold'],
  plank: ['Set forearms under shoulders and support the body from toes.', 'Maintain an aligned trunk while breathing; end by lowering knees before control is lost.', 'Keep ribs and pelvis aligned rather than lifting hips very high.', 'Holding the breath or letting the low back sag.', 'Use knees or an elevated forearm support.', 'hold'],
  'side-plank': ['Lie on your side with elbow below shoulder and feet or named bent knees supported.', 'Lift the pelvis to align the side of your body; lower smoothly to exit.', 'Keep the supporting shoulder away from the ear.', 'Rotating forward or sagging at the waist.', 'Use bent knees and a shorter hold.', 'hold'],
  twist: ['Settle into the named seated or lying support and keep the pelvis controlled.', 'Rotate the trunk within a comfortable range; crunch versions add a small rib-to-pelvis curl.', 'Move slowly without levering the neck.', 'Forcing rotation with arms or swinging through the waist.', 'Reduce rotation and resistance.', 'rotation'],
  sidebend: ['Stabilize the pelvis in the named standing, side-supported or suspension position.', 'Bend the trunk sideways without rotating, then return to an upright or aligned trunk.', 'Keep the movement small enough to stay balanced.', 'Twisting or swinging to lift more resistance.', 'Use less resistance and less side bending.', 'rotation'],
  legraise: ['Use the named lying, hanging or suspension support and secure all contact points.', 'Draw knees or straight legs toward the torso; return without arching the back. Suspension pike raises hips over supported feet.', 'Bend knees when straight legs would pull the back out of control.', 'Swinging from the bar or forcing a long lever.', 'Use bent knees and a shorter lift; avoid hanging without a secure grip.', 'hold'],
  deadlift: ['Place the implement close to the feet; hinge and bend knees enough to take a secure grip.', 'Press into the floor and extend hips and knees together; guide the implement back close to the legs.', 'Keep the load close and finish upright, not leaning back.', 'Jerking from the floor or allowing the load to drift ahead.', 'Use a lighter load and an elevated start with instruction.', 'hinge'],
  hinge: ['Set a soft knee bend and maintain a comfortable long spine.', 'Send hips backward while the trunk inclines, then use hip extension to return. Single-leg versions hinge over the supporting leg.', 'Good mornings place the bar across the upper back, not on the neck; do not lock knees.', 'Chasing depth by rounding the back.', 'Reduce the hinge depth and external load; use balance support when needed.', 'hinge'],
  back: ['Use the named prone, ball or machine support with pelvis stable.', 'Raise the trunk or limbs only to a comfortable aligned position and return slowly.', 'For Superman, lift arms and legs only slightly; do not chase height.', 'Hyperextending the lumbar spine or bouncing.', 'Use a smaller lift and adequate pelvic support.', 'hinge'],
  bird: ['Start on hands and knees with a quiet trunk.', 'Reach one arm and the opposite leg away; return and choose the other side deliberately.', 'Reach long rather than lifting high.', 'Rolling the hips or arching the low back.', 'Move only one limb at a time.', 'balance'],
  'rear-plank': ['Sit with hands behind and legs long, using a comfortable hand angle.', 'Lift the pelvis to align trunk and legs, then lower smoothly.', 'Press through hands without forcing shoulder extension.', 'Dropping the head back or pushing through wrist pain.', 'Bend knees and use a smaller hip lift.', 'hold'],
  hipthrust: ['Support shoulders or feet as named and begin with bent knees and feet planted.', 'Extend the hips until trunk and thighs align, then lower the pelvis without losing support.', 'For barbell hip thrust, pad the bar and stabilize the bench.', 'Finishing by arching the low back.', 'Use no added load and a smaller lift.', 'hinge'],
  lunge: ['Set feet hip-width apart; choose forward, reverse, fixed split or elevated-rear-foot stance as named.', 'Lower by bending the supporting knee and hip, then rise; stepping versions return the moving foot each repetition.', 'Keep enough stance width for balance and let the front knee track over the foot.', 'Taking a tightrope stance or pushing through knee discomfort.', 'Use support, less depth and no added load.', 'lunge'],
  squat: ['Set feet at a comfortable width; secure the named front, back or hand-held load.', 'Bend hips and knees together, lower only as far as controlled, then stand.', 'Pistol and box versions use one supporting leg; box height is chosen before starting.', 'Losing heel contact or bouncing out of the bottom.', 'Reduce depth and load; use a stable box or balance support.', 'squat'],
  step: ['Choose a secure step height and place the working foot fully on it.', 'Step up by extending the working leg; for step-down, bend that leg to lower the other heel toward the floor and return.', 'Control the descent without dropping the pelvis.', 'Pushing off strongly with the trailing foot or using an unstable step.', 'Use a lower step and hand support.', 'lunge'],
  hipext: ['Use the named cable, prone or machine support and keep the pelvis still.', 'Move the working thigh backward through hip extension; return without swinging the trunk.', 'For reverse hyperextension, lift legs only to comfortable trunk alignment.', 'Arching the low back instead of moving at the hip.', 'Reduce resistance and the hip extension arc.', 'joint-isolation'],
  legpress: ['Adjust the seat so your pelvis stays supported throughout the leg bend.', 'Press through both feet to extend knees and hips, then bend again without allowing the pelvis to curl off the pad.', 'Leave knees softly extended, not slammed into lockout.', 'Choosing depth that lifts the low back off the pad.', 'Reduce load and depth; ask for machine setup help.', 'squat'],
  abduct: ['Use the named standing, seated or side-bridge support.', 'Move the thigh outward from the midline, then return slowly without rolling the pelvis.', 'In side-bridge, maintain trunk support while lifting the top thigh.', 'Tilting the trunk to create apparent hip range.', 'Decrease resistance; use a stable supported position.', 'joint-isolation'],
  adduct: ['Use the named cable stance or seated machine with pelvis supported.', 'Bring the working thigh toward the midline and return with control.', 'Keep knee and toes in a comfortable aligned direction.', 'Snapping legs together or rotating the pelvis.', 'Reduce resistance and starting width.', 'joint-isolation'],
  legext: ['Set the machine pivot at knee height and pad above the ankle.', 'Extend the knees through a comfortable arc and lower without dropping the stack.', 'Keep hips on the seat.', 'Jerking the load or forcing painful knee angles.', 'Use lighter resistance and a shorter arc.', 'joint-isolation'],
  legcurl: ['Align the machine pivot with your knee and secure the seated, lying or standing support.', 'Bend the working knee against the pad, then return without slamming the stack.', 'Keep the pelvis still as the heel travels back.', 'Lifting the hips to move a heavier load.', 'Reduce resistance and knee-bending range.', 'joint-isolation'],
  calf: ['Set a stable foot support; use seated bent knees or standing straighter knees as named.', 'Raise the heels by pressing through the forefoot, then lower slowly.', 'Use hand support for single-leg versions.', 'Bouncing or rolling to the outside of the foot.', 'Use both legs or less resistance and avoid a deep heel drop.', 'joint-isolation'],
  tibialis: ['Stand with balance support and heels firmly planted.', 'Lift the forefoot toward the shin, then lower the toes without rocking backward.', 'Keep heel contact throughout.', 'Leaning the whole body to simulate ankle movement.', 'Use a smaller toe lift and stable hand support.', 'joint-isolation'],
  wrist: ['Support the forearm; use palms up for wrist curl and down for reverse wrist curl.', 'Bend at the wrist to lift the implement, then return slowly.', 'Keep fingers secure and the forearm quiet.', 'Lifting the forearm or letting the load roll uncontrolled.', 'Use very light resistance and a comfortable wrist arc.', 'joint-isolation'],
  forearm: ['Sit with elbow bent and forearm supported, holding a light implement securely.', 'Turn the palm downward for pronation or upward for supination and return slowly.', 'Rotate at the forearm rather than swinging the whole upper arm.', 'Letting a long heavy lever force the rotation.', 'Use a shorter lever and less resistance.', 'joint-isolation'],
};

function equipment(name: string, path: string, group: string): NonNullable<Activity['equipment']> {
  // Source apparatus codes and case-insensitive names independently identify implements.
  // Supports are curated below; a machine's built-in seat is not a separate bench.
  const reference = path.split('/').at(-1)!.toLowerCase();
  const machine = /smith|machine/i.test(name) || /^(lv|sm)/.test(reference) || (/^as/.test(reference) && !/band/i.test(name));
  const e: NonNullable<Activity['equipment']> = [];
  if (/barbell|smith/i.test(name) || /^(bb|sm)/.test(reference)) e.push('barbell');
  if (machine) e.push('machine');
  if (/dumbbell/i.test(name) || /^db/.test(reference)) e.push('dumbbells');
  if (/cable/i.test(name) || /^cb/.test(reference)) e.push('cable');
  if (/suspension/i.test(name) || /^st/.test(reference)) e.push('suspension-trainer');
  if (/band-assisted/i.test(name)) e.push('band');
  if (!machine && /bench|incline|decline|chest-supported|preacher|concentration|barbell hip thrust|45-degree|feet-elevated|rear-foot-elevated/i.test(name)) e.push('bench');
  const benchSupported = new Set([
    'Barbell lying triceps extension', 'Cable lying triceps extension', 'Dumbbell lying triceps extension',
    'Lying dumbbell lateral raise', 'Seated dumbbell rear lateral raise', 'Seated barbell military press',
    'Side-lying dumbbell external rotation', 'Supported upright dumbbell external rotation',
    'Barbell pullover', 'Dumbbell chest fly', 'Lying cable fly', 'Seated cable fly', 'Dumbbell chest pullover',
    'Cable seated row', 'Wide-grip cable seated row', 'Cable seated crunch', 'Cable seated twist',
    'Barbell wrist curl', 'Dumbbell wrist curl', 'Cable wrist curl', 'Barbell reverse wrist curl',
    'Dumbbell reverse wrist curl', 'Dumbbell forearm pronation', 'Dumbbell forearm supination',
  ]);
  if (benchSupported.has(name)) e.push('bench');
  if (!machine && e.includes('barbell') && /military press|good morning|bench press|squat|lunge|step-up/i.test(name)) e.push('rack');
  if (!machine && /pull-up|chin-up|inverted row|hanging/i.test(name)) e.push('pull-up-bar');
  if (!machine && /triceps dip/i.test(name)) e.push('parallel-bars');
  if (/stability-ball/i.test(name)) e.push('stability-ball');
  if (/step-up|step-down/i.test(name)) e.push('step');
  if (/box squat/i.test(name)) e.push('box');
  if (/weighted/i.test(name) || /^wt/.test(reference)) e.push('plates');
  if (group === 'dip' && /bench/i.test(name)) e.push('bench');
  return e.length ? [...new Set(e)] : ['none'];
}
const muscleMap: Record<string, NonNullable<Activity['primaryMuscles']>[number]> = {
  DeltoidAnterior: 'deltoids', DeltoidLateral: 'deltoids', DeltoidPosterior: 'deltoids',
  Triceps: 'triceps', Biceps: 'biceps', Brachialis: 'biceps', BackGeneral: 'rhomboids',
  LatissimusDorsi: 'lats', TrapeziusUpper: 'trapezius', Infraspinatus: 'rotator-cuff',
  Subscapularis: 'rotator-cuff', PectoralSternal: 'pectorals', PectoralClavicular: 'pectorals',
  RectusAbdominis: 'abdominals', Obliques: 'obliques', ErectorSpinae: 'spinal-erectors',
  GluteusMaximus: 'glutes', HipAbductor: 'abductors', Quadriceps: 'quadriceps',
  Hamstrings: 'hamstrings', HipAdductors: 'adductors', Gastrocnemius: 'calves',
  Soleus: 'calves', TibialisAnterior: 'tibialis', Brachioradialis: 'forearms',
  WristFlexors: 'forearms', WristExtensors: 'forearms', Pronators: 'forearms', Supinators: 'forearms',
};
export function strengthContent(): { activities: Activity[]; sources: Source[] } {
  const sources: Source[] = [];
  const activities = rows.map(([name, path, directory, group]) => {
    const sid = `ref-${slug(name)}`;
    sources.push(source(sid, `https://exrx.net/WeightExercises/${path}`, `ExRx reference: ${name}`,
      `Identity, implement and target region cross-checked against the public ExRx ${directory} directory at https://exrx.net/Lists/ExList/${directory}; exact observed link ${path}. Original guidance is educational, not a reproduced exercise page or clinical review.`));
    const a = base(name, 'strength', [sid]);
    a.version = 2;
    const [setup, move, cue, mistake, modification, pattern] = guides[group];
    a.equipment = equipment(name, path, group);
    a.description = `${name} uses ${a.equipment.join(', ')} in a ${pattern} pattern. The named implement/support changes loading or balance demands; it is not a duplicate name for another catalog entry. Choose targets in your routine, not from this definition.`;
    a.setup = [setup, `Use the ${name.toLowerCase()} configuration specifically. Check anchors, locks and support stability before taking resistance.`];
    a.execution = [move, 'Reverse the movement smoothly and end the set before technique becomes uncontrolled. Breathe rather than deliberately holding your breath.'];
    a.cues = [cue]; a.commonMistakes = [mistake]; a.modifications = [modification];
    a.movementPatterns = [pattern];
    const muscle = muscleMap[path.split('/')[0]];
    a.primaryMuscles = muscle ? [muscle] : null;
    a.benefits = [{ text: `Offers practice of ${pattern} control${muscle ? ` with emphasis on ${muscle}` : ''}.`, sourceIds: [sid],
      qualification: 'Movement purpose and target region, not a promise of hypertrophy, pain relief or injury prevention; outcomes depend on programming and personal suitability.' }];
    a.laterality = /one-arm|single-leg|side[- ]|lunge|split squat|step-up|step-down|bird dog|concentration/i.test(name) ||
      group === 'forearm' || (['external', 'internal', 'abduct', 'adduct'].includes(group) && !a.equipment.includes('machine'))
      ? 'unilateral' : ['external', 'internal'].includes(group) ? 'unknown' : 'bilateral';
    a.supportedMetrics = /plank/i.test(name) ? ['duration'] : ['reps'];
    a.loadUnits = a.equipment.some(e => ['barbell', 'dumbbells', 'cable', 'machine', 'plates'].includes(e)) ? ['kg', 'lb'] : [];
    a.instructionNeeded = a.equipment.some(e => ['barbell', 'machine', 'suspension-trainer'].includes(e)) ||
      /weighted|archer|one-arm pull-up|pistol/i.test(name);
    a.difficulty = /one-arm pull-up|archer|pistol/i.test(name) ? 'advanced' : 'unknown';
    if (a.equipment.includes('barbell')) {
      a.precautions.push(['deadlift', 'hinge'].includes(group) && !/good morning/i.test(name)
        ? 'Barbell safety: secure the plates with suitable collars, keep the lift and lowering area clear of feet and nearby people, and learn the bracing and hinge technique before loading.'
        : 'Barbell safety: secure plates and control both ends of the bar. Use correctly positioned safeties or a capable spotter wherever a failed repetition could trap you; learn unracking and reracking before using a rack.');
    }
    if (/smith/i.test(name)) a.precautions.push('Set the machine safety stops and learn the hook/unhook mechanism unloaded; do not substitute the free-bar path for this guided path.');
    if (/pull-up|chin-up|dip|suspension/i.test(name)) a.precautions.push('Check the load rating and security of the support. Do not add external load before you can control the unweighted movement.');
    return a;
  });
  return { activities, sources };
}
