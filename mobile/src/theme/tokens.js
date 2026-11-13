import { Platform } from 'react-native';

/**
 * Display typeface for headings (loaded in App.js via @expo-google-fonts/playfair-display).
 * On Android, a custom fontFamily must not be combined with fontWeight, so styles
 * that use these set fontWeight to 'normal'.
 */
export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  displayHeavy: 'PlayfairDisplay_800ExtraBold',
  displayItalic: 'PlayfairDisplay_400Regular_Italic',
};

/** Two-stop gradients derived from the active palette. */
export function gradients(colors) {
  return {
    primary: [colors.primaryHover, colors.primaryActive],
    warm: [colors.surface, colors.surfaceSubtle],
  };
}

/** Soft, layered shadows (iOS shadow + Android elevation). */
export function shadow(level = 1, color = '#000') {
  const map = {
    1: { h: 2, r: 6, o: 0.08, e: 2 },
    2: { h: 6, r: 14, o: 0.12, e: 5 },
    3: { h: 12, r: 24, o: 0.18, e: 10 },
  };
  const s = map[level] || map[1];
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: s.h },
      shadowOpacity: s.o,
      shadowRadius: s.r,
    },
    default: { elevation: s.e, shadowColor: color },
  });
}

export const motion = {
  fast: 180,
  base: 280,
  slow: 420,
  stagger: 60,
  spring: { damping: 16, stiffness: 180, mass: 0.9 },
  bouncy: { damping: 10, stiffness: 220, mass: 0.8 },
};
