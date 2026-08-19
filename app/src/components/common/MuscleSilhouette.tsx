import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Ellipse, Rect, G } from 'react-native-svg';
import { colors } from '../../theme/colors';

const C_BG = '#14181c';
const C_BODY = '#232930';
const C_PRIMARY = colors.primary;    // Emerald - strong highlight
const C_SECONDARY = '#166e57';      // Subtle Teal - secondary highlight
const C_STROKE = '#323a45';          // Definition borders

// Mapped Muscle Identifiers
export type MuscleRegion =
  | 'chest'
  | 'front_delts'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'triceps'
  | 'lower_back'
  | 'glutes'
  | 'hamstrings';

export function normalizeMuscle(name: string): MuscleRegion | string {
  const n = name.toLowerCase().trim();
  if (n.includes('pec') || n.includes('chest')) return 'chest';
  if (n.includes('delt') || n.includes('shoulder')) return 'front_delts';
  if (n.includes('bicep')) return 'biceps';
  if (n.includes('tricep')) return 'triceps';
  if (n.includes('forearm')) return 'forearms';
  if (n.includes('oblique')) return 'obliques';
  if (n.includes('abs') || n.includes('abdom') || n.includes('core')) return 'abs';
  if (n.includes('quad')) return 'quads';
  if (n.includes('hamstring')) return 'hamstrings';
  if (n.includes('calf') || n.includes('calve') || n.includes('gastro')) return 'calves';
  if (n.includes('glute') || n.includes('buttock')) return 'glutes';
  if (n.includes('lat') || n.includes('lats') || n.includes('upper back')) return 'lats';
  if (n.includes('trap') || n.includes('trapezius')) return 'traps';
  if (n.includes('lower back') || n.includes('spine')) return 'lower_back';
  if (n.includes('neck')) return 'traps';
  return n;
}

export function aggregateMusclesFromExercises(
  exercises: { muscleGroup: string; secondaryMuscles?: string[] }[]
): { primary: Set<string>; secondary: Set<string> } {
  const primary = new Set<string>();
  const secondary = new Set<string>();
  for (const ex of exercises) {
    if (ex.muscleGroup) {
      primary.add(normalizeMuscle(ex.muscleGroup));
    }
    for (const sm of ex.secondaryMuscles ?? []) {
      secondary.add(normalizeMuscle(sm));
    }
  }
  // Secondary muscles should not overlap primary activation
  for (const p of primary) {
    secondary.delete(p);
  }
  return { primary, secondary };
}

const W = 100;
const H = 220;

// High-fidelity Realistic Anatomical Front SVG Paths
function FrontSilhouette({ pm, sm }: { pm: Set<string>; sm: Set<string> }) {
  const fill = (m: MuscleRegion) => pm.has(m) ? C_PRIMARY : sm.has(m) ? C_SECONDARY : C_BODY;
  const op = (m: MuscleRegion) => (pm.has(m) || sm.has(m)) ? 1 : 0.7;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Background Frame / Outline for contrast */}
      <Path d="M 50 10 L 15 45 L 12 110 L 22 170 L 32 215 L 50 218 L 68 215 L 78 170 L 88 110 L 85 45 Z" fill="#181e24" opacity={0.3} />

      {/* Head & Neck */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Ellipse cx={50} cy={22} rx={11} ry={14} fill={C_BODY} />
        <Path d="M44 34 C44 38 46 44 46 44 L54 44 C54 44 56 38 56 34 Z" fill={fill('traps')} opacity={op('traps')} />
      </G>

      {/* Front Delts (Shoulders) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M33 46 C27 48 23 54 24 63 C26 66 31 64 34 54 Z" fill={fill('front_delts')} opacity={op('front_delts')} />
        <Path d="M67 46 C73 48 77 54 76 63 C74 66 69 64 66 54 Z" fill={fill('front_delts')} opacity={op('front_delts')} />
      </G>

      {/* Chest (Pectorals) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M34 52 C40 50 48 51 50 58 C49 66 43 71 34 70 Z" fill={fill('chest')} opacity={op('chest')} />
        <Path d="M66 52 C60 50 52 51 50 58 C51 66 57 71 66 70 Z" fill={fill('chest')} opacity={op('chest')} />
      </G>

      {/* Biceps */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M24 63 C20 68 18 76 21 84 C23 85 26 80 27 72 Z" fill={fill('biceps')} opacity={op('biceps')} />
        <Path d="M76 63 C80 68 82 76 79 84 C77 85 74 80 73 72 Z" fill={fill('biceps')} opacity={op('biceps')} />
      </G>

      {/* Forearms */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M21 84 C17 92 14 104 18 112 C21 114 25 106 26 94 Z" fill={fill('forearms')} opacity={op('forearms')} />
        <Path d="M79 84 C83 92 86 104 82 112 C79 114 75 106 74 94 Z" fill={fill('forearms')} opacity={op('forearms')} />
      </G>

      {/* Abs (Rectus Abdominis) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M42 66 H58 V78 H42 Z" fill={fill('abs')} opacity={op('abs')} />
        <Path d="M41 80 H59 V92 H41 Z" fill={fill('abs')} opacity={op('abs')} />
        <Path d="M42 94 H58 V106 H42 Z" fill={fill('abs')} opacity={op('abs')} />
      </G>

      {/* Obliques */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M41 68 C34 76 33 94 41 106 Z" fill={fill('obliques')} opacity={op('obliques')} />
        <Path d="M59 68 C66 76 67 94 59 106 Z" fill={fill('obliques')} opacity={op('obliques')} />
      </G>

      {/* Hips & Glute Front Definition */}
      <Path d="M33 106 C33 118 36 122 36 122 H64 C64 122 67 118 67 106 Z" fill={C_BODY} stroke={C_STROKE} strokeWidth={1.2} />

      {/* Quadriceps (Thighs) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M35 122 C28 135 27 165 37 178 C39 174 41 155 45 122 Z" fill={fill('quads')} opacity={op('quads')} />
        <Path d="M65 122 C72 135 73 165 63 178 C61 174 59 155 55 122 Z" fill={fill('quads')} opacity={op('quads')} />
      </G>

      {/* Calves (Tibialis & Gastrocnemius Front) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M36 180 C32 190 32 205 35 214 H38 C39 205 40 190 39 180 Z" fill={fill('calves')} opacity={op('calves')} />
        <Path d="M64 180 C68 190 68 205 65 214 H62 C61 205 60 190 61 180 Z" fill={fill('calves')} opacity={op('calves')} />
      </G>
    </Svg>
  );
}

// High-fidelity Realistic Anatomical Back SVG Paths
function BackSilhouette({ pm, sm }: { pm: Set<string>; sm: Set<string> }) {
  const fill = (m: MuscleRegion) => pm.has(m) ? C_PRIMARY : sm.has(m) ? C_SECONDARY : C_BODY;
  const op = (m: MuscleRegion) => (pm.has(m) || sm.has(m)) ? 1 : 0.7;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Background Frame / Outline for contrast */}
      <Path d="M 50 10 L 15 45 L 12 110 L 22 170 L 32 215 L 50 218 L 68 215 L 78 170 L 88 110 L 85 45 Z" fill="#181e24" opacity={0.3} />

      {/* Head */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Ellipse cx={50} cy={22} rx={11} ry={14} fill={C_BODY} />
        <Path d="M44 34 C44 38 46 44 46 44 L54 44 C54 44 56 38 56 34 Z" fill={C_BODY} />
      </G>

      {/* Traps (Trapezius) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M50 36 L42 48 C46 54 48 64 50 68 Z" fill={fill('traps')} opacity={op('traps')} />
        <Path d="M50 36 L58 48 C54 54 52 64 50 68 Z" fill={fill('traps')} opacity={op('traps')} />
      </G>

      {/* Rear Delts (Shoulders Back) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M33 46 C27 48 23 54 24 63 C26 66 31 64 34 54 Z" fill={fill('front_delts')} opacity={op('front_delts')} />
        <Path d="M67 46 C73 48 77 54 76 63 C74 66 69 64 66 54 Z" fill={fill('front_delts')} opacity={op('front_delts')} />
      </G>

      {/* Lats (Upper Back / Latissimus) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M34 54 C31 66 32 88 44 94 C43 80 40 68 34 54 Z" fill={fill('lats')} opacity={op('lats')} />
        <Path d="M66 54 C69 66 68 88 56 94 C57 80 60 68 66 54 Z" fill={fill('lats')} opacity={op('lats')} />
      </G>

      {/* Triceps */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M24 63 C20 68 18 76 21 84 C23 85 26 80 27 72 Z" fill={fill('triceps')} opacity={op('triceps')} />
        <Path d="M76 63 C80 68 82 76 79 84 C77 85 74 80 73 72 Z" fill={fill('triceps')} opacity={op('triceps')} />
      </G>

      {/* Forearms (Back View) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M21 84 C17 92 14 104 18 112 C21 114 25 106 26 94 Z" fill={fill('forearms')} opacity={op('forearms')} />
        <Path d="M79 84 C83 92 86 104 82 112 C79 114 75 106 74 94 Z" fill={fill('forearms')} opacity={op('forearms')} />
      </G>

      {/* Lower Back */}
      <Path d="M44 94 H56 V106 H44 Z" fill={fill('lower_back')} opacity={op('lower_back')} stroke={C_STROKE} strokeWidth={1.2} />

      {/* Glutes */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M33 106 C25 110 27 132 37 136 C44 135 48 122 48 106 Z" fill={fill('glutes')} opacity={op('glutes')} />
        <Path d="M67 106 C75 110 73 132 63 136 C56 135 52 122 52 106 Z" fill={fill('glutes')} opacity={op('glutes')} />
      </G>

      {/* Hamstrings */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M35 136 C28 145 28 168 37 178 C39 174 41 155 45 136 Z" fill={fill('hamstrings')} opacity={op('hamstrings')} />
        <Path d="M65 136 C72 145 73 168 63 178 C61 174 59 155 55 136 Z" fill={fill('hamstrings')} opacity={op('hamstrings')} />
      </G>

      {/* Calves (Gastrocnemius Back View) */}
      <G stroke={C_STROKE} strokeWidth={1.2}>
        <Path d="M36 180 C31 190 31 205 35 214 H38 C40 205 40 190 39 180 Z" fill={fill('calves')} opacity={op('calves')} />
        <Path d="M64 180 C69 190 69 205 65 214 H62 C60 205 60 190 61 180 Z" fill={fill('calves')} opacity={op('calves')} />
      </G>
    </Svg>
  );
}

interface Props {
  primaryMuscles?: Set<string>;
  secondaryMuscles?: Set<string>;
  view?: 'front' | 'back';
  size?: number;
}

export default function MuscleSilhouette({
  primaryMuscles = new Set(),
  secondaryMuscles = new Set(),
  view = 'front',
  size = 100,
}: Props) {
  const scale = size / W;
  const scaledH = scale * H;

  const pm = useMemo(() => {
    const s = new Set<string>();
    primaryMuscles.forEach(m => s.add(normalizeMuscle(m)));
    return s;
  }, [primaryMuscles]);

  const sm = useMemo(() => {
    const s = new Set<string>();
    secondaryMuscles.forEach(m => s.add(normalizeMuscle(m)));
    pm.forEach(m => s.delete(m));
    return s;
  }, [secondaryMuscles, pm]);

  return (
    <View style={{ width: size, height: scaledH, backgroundColor: C_BG, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderColor: C_STROKE, borderWidth: 1 }}>
      <View style={{ transform: [{ scaleX: scale }, { scaleY: scale }], width: W, height: H }}>
        {view === 'front' ? (
          <FrontSilhouette pm={pm} sm={sm} />
        ) : (
          <BackSilhouette pm={pm} sm={sm} />
        )}
      </View>
    </View>
  );
}
