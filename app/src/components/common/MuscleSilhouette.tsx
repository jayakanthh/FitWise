import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useTheme } from '../../theme/colors';

// Base anatomical artwork assets (professional anatomical muscle illustrations)
const FRONT_ANATOMY = require('../../../assets/anatomy/front_neutral.jpg');
const BACK_ANATOMY = require('../../../assets/anatomy/back_neutral.jpg');

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
  for (const p of primary) {
    secondary.delete(p);
  }
  return { primary, secondary };
}

// ──────────────────────────────────────────────────────────────
// SVG Overlay Region Definitions
// Positioned within a 200×300 viewBox calibrated to overlay
// the generated anatomical artwork images.
// The artwork provides the visual quality; these overlays
// provide data-driven highlighting via theme colors.
// ──────────────────────────────────────────────────────────────

interface RegionDef {
  paths: string[];
}

// Front-view overlay regions
const FRONT_REGIONS: Record<string, RegionDef> = {
  traps: {
    paths: [
      'M 88 34 C 82 36, 72 40, 64 46 L 68 52 C 76 48, 84 42, 88 38 Z',
      'M 112 34 C 118 36, 128 40, 136 46 L 132 52 C 124 48, 116 42, 112 38 Z',
    ],
  },
  front_delts: {
    paths: [
      'M 64 46 C 56 48, 48 54, 44 66 C 44 76, 52 72, 58 62 L 62 52 Z',
      'M 136 46 C 144 48, 152 54, 156 66 C 156 76, 148 72, 142 62 L 138 52 Z',
    ],
  },
  chest: {
    paths: [
      'M 62 56 C 70 54, 86 56, 96 64 C 96 82, 84 86, 62 82 Z',
      'M 138 56 C 130 54, 114 56, 104 64 C 104 82, 116 86, 138 82 Z',
    ],
  },
  biceps: {
    paths: [
      'M 44 66 C 38 76, 36 90, 40 102 C 44 104, 50 94, 52 80 Z',
      'M 156 66 C 162 76, 164 90, 160 102 C 156 104, 150 94, 148 80 Z',
    ],
  },
  forearms: {
    paths: [
      'M 40 102 C 34 114, 28 130, 34 148 C 40 150, 44 134, 46 116 Z',
      'M 160 102 C 166 114, 172 130, 166 148 C 160 150, 156 134, 154 116 Z',
    ],
  },
  abs: {
    paths: [
      'M 82 82 H 118 V 140 L 100 154 L 82 140 Z',
    ],
  },
  obliques: {
    paths: [
      'M 62 82 C 60 96, 58 116, 72 134 C 74 124, 74 100, 68 86 Z',
      'M 138 82 C 140 96, 142 116, 128 134 C 126 124, 126 100, 132 86 Z',
    ],
  },
  quads: {
    paths: [
      'M 70 146 C 58 168, 56 206, 68 228 C 74 222, 78 194, 86 150 Z',
      'M 130 146 C 142 168, 144 206, 132 228 C 126 222, 122 194, 114 150 Z',
    ],
  },
  calves: {
    paths: [
      'M 68 232 C 62 244, 60 264, 66 282 C 70 282, 74 262, 74 238 Z',
      'M 132 232 C 138 244, 140 264, 134 282 C 130 282, 126 262, 126 238 Z',
    ],
  },
};

// Back-view overlay regions
const BACK_REGIONS: Record<string, RegionDef> = {
  traps: {
    paths: [
      'M 100 30 L 70 50 C 80 62, 90 70, 100 74 Z',
      'M 100 30 L 130 50 C 120 62, 110 70, 100 74 Z',
    ],
  },
  front_delts: {
    paths: [
      'M 64 46 C 56 48, 48 54, 44 66 C 48 72, 56 68, 62 56 Z',
      'M 136 46 C 144 48, 152 54, 156 66 C 152 72, 144 68, 138 56 Z',
    ],
  },
  lats: {
    paths: [
      'M 64 56 C 58 74, 60 106, 80 118 C 78 96, 72 74, 64 56 Z',
      'M 136 56 C 142 74, 140 106, 120 118 C 122 96, 128 74, 136 56 Z',
    ],
  },
  triceps: {
    paths: [
      'M 44 66 C 38 76, 36 90, 40 102 C 44 104, 50 94, 52 80 Z',
      'M 156 66 C 162 76, 164 90, 160 102 C 156 104, 150 94, 148 80 Z',
    ],
  },
  forearms: {
    paths: [
      'M 40 102 C 34 114, 28 130, 34 148 C 40 150, 44 134, 46 116 Z',
      'M 160 102 C 166 114, 172 130, 166 148 C 160 150, 156 134, 154 116 Z',
    ],
  },
  lower_back: {
    paths: [
      'M 82 112 H 118 V 146 H 82 Z',
    ],
  },
  glutes: {
    paths: [
      'M 64 138 C 54 144, 56 170, 70 176 C 80 174, 86 158, 86 138 Z',
      'M 136 138 C 146 144, 144 170, 130 176 C 120 174, 114 158, 114 138 Z',
    ],
  },
  hamstrings: {
    paths: [
      'M 68 176 C 56 190, 56 218, 68 232 C 72 226, 76 200, 84 176 Z',
      'M 132 176 C 144 190, 144 218, 132 232 C 128 226, 124 200, 116 176 Z',
    ],
  },
  calves: {
    paths: [
      'M 66 236 C 58 248, 58 268, 66 284 C 72 278, 74 258, 72 238 Z',
      'M 134 236 C 142 248, 142 268, 134 284 C 128 278, 126 258, 128 238 Z',
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────

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
  const { theme } = useTheme();
  const imageWidth = size;
  const imageHeight = size * 1.5; // 2:3 aspect ratio

  // Normalize muscle names from exercise data
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

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  const imageSource = view === 'front' ? FRONT_ANATOMY : BACK_ANATOMY;

  return (
    <View style={[styles.wrapper, { width: imageWidth, height: imageHeight, borderRadius: theme.shape.radiusMd }]}>
      {/* Layer A: High-quality anatomical base artwork */}
      <Image
        source={imageSource}
        style={[styles.anatomyImage, { width: imageWidth, height: imageHeight }]}
        resizeMode="contain"
      />

      {/* Layer B: SVG overlay for data-driven muscle highlighting */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={imageWidth}
        height={imageHeight}
        viewBox="0 0 200 300"
      >
        {Object.entries(regions).map(([region, def]) => {
          const isPrimary = pm.has(region);
          const isSecondary = sm.has(region);
          if (!isPrimary && !isSecondary) return null;
          if (def.paths.length === 0) return null;

          const fillColor = isPrimary ? theme.colors.primary : theme.colors.accent;
          const fillOpacity = isPrimary ? 0.5 : 0.35;

          return (
            <G key={region}>
              {def.paths.map((d, i) => (
                <Path
                  key={`${region}-${i}`}
                  d={d}
                  fill={fillColor}
                  opacity={fillOpacity}
                  stroke={fillColor}
                  strokeWidth={0.5}
                  strokeOpacity={0.6}
                />
              ))}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0a0a0a',
  },
  anatomyImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
