import * as Haptics from 'expo-haptics';

// Fire-and-forget haptic feedback. Failures (unsupported device, web) are ignored.
function safe(promiseFn) {
  try {
    const p = promiseFn();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {}
}

export const haptics = {
  /** Light tap for ordinary buttons. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Firmer tap for primary actions. */
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Tick for toggles, tabs and pickers. */
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
