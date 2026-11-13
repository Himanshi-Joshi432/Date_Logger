import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { haptics } from '../utils/haptics';
import { motion } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Respect the system "Reduce motion" accessibility setting: entrances, loops and
// shakes are skipped and content simply appears. Press feedback stays, since it is
// small and directly caused by the user's touch.
let reduceMotion = false;
try {
  AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      reduceMotion = !!enabled;
    })
    .catch(() => {});
  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    reduceMotion = !!enabled;
  });
} catch (e) {}

export function isReduceMotionEnabled() {
  return reduceMotion;
}

/** Appends animated transforms to any transform already in `style` instead of replacing it. */
function withTransforms(style, extra) {
  const flat = StyleSheet.flatten(style) || {};
  return [flat, { transform: [...(flat.transform || []), ...extra] }];
}

/**
 * Fades and slides its children in when mounted.
 * from: 'bottom' | 'top' | 'left' | 'right' | 'scale' | 'none'
 */
export function FadeInView({
  children,
  delay = 0,
  from = 'bottom',
  distance = 18,
  duration = motion.base,
  style,
  ...rest
}) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return undefined;
    const anim = Animated.spring(progress, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      ...motion.spring,
    });
    const fade = Animated.timing(progress, {
      toValue: 1,
      delay,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    // Spring for movement feels alive; for 'none' a plain fade is enough.
    (from === 'none' ? fade : anim).start();
    return () => progress.stopAnimation();
  }, []);

  const opacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  const transform = [];
  if (from === 'bottom' || from === 'top') {
    transform.push({
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [from === 'bottom' ? distance : -distance, 0],
      }),
    });
  } else if (from === 'left' || from === 'right') {
    transform.push({
      translateX: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [from === 'right' ? distance : -distance, 0],
      }),
    });
  } else if (from === 'scale') {
    transform.push({
      scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    });
  }

  return (
    <Animated.View style={[withTransforms(style, transform), { opacity }]} {...rest}>
      {children}
    </Animated.View>
  );
}

/** Stagger delay for list items, capped so long lists don't wait forever. */
export function staggerDelay(index, base = 0, step = motion.stagger, maxItems = 8) {
  return base + Math.min(index, maxItems) * step;
}

/**
 * Pressable that springs down slightly when touched, with optional haptics.
 * haptic: 'tap' | 'press' | 'select' | null
 */
export function PressableScale({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  haptic = 'tap',
  disabled,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      damping: 15,
      stiffness: 320,
      mass: 0.6,
    }).start();

  return (
    <AnimatedPressable
      onPressIn={() => !disabled && springTo(scaleTo)}
      onPressOut={() => springTo(1)}
      onPress={(e) => {
        if (disabled) return;
        if (haptic && haptics[haptic]) haptics[haptic]();
        if (onPress) onPress(e);
      }}
      disabled={disabled}
      style={withTransforms(style, [{ scale }])}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Gentle looping heartbeat; good for logos and badges. */
export function PulseView({ children, style, active = true, scale = 1.07, period = 1400 }) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || reduceMotion) {
      value.setValue(0);
      return undefined;
    }
    const half = period / 4;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: half, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.35, duration: half, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.85, duration: half * 0.8, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: half * 1.2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(period * 0.35),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, period]);

  const s = value.interpolate({ inputRange: [0, 1], outputRange: [1, scale] });
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>;
}

/** Slow vertical bob, for decorative elements. */
export function FloatView({ children, style, distance = 4, period = 3200 }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [period]);
  const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Shakes horizontally whenever `trigger` changes to a truthy value (e.g. an error message). */
export function ShakeView({ children, trigger, style }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger || reduceMotion) return;
    x.setValue(0);
    Animated.sequence(
      [10, -9, 7, -5, 3, 0].map((toValue) =>
        Animated.timing(x, { toValue, duration: 55, easing: Easing.linear, useNativeDriver: true })
      )
    ).start();
  }, [trigger]);
  return <Animated.View style={[style, { transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}

/**
 * Wraps a screen and animates it in when mounted. Give it a `key` that changes
 * per screen so each navigation remounts it.
 * direction: 1 = forward (slides in from the right), -1 = back, 0 = fade-up.
 */
export function ScreenTransition({ children, direction = 0, style }) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 210,
      mass: 0.9,
    }).start();
  }, []);

  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const transform =
    direction === 0
      ? [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
        ]
      : [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [direction * 36, 0] }) }];

  return <Animated.View style={[{ flex: 1 }, style, { opacity, transform }]}>{children}</Animated.View>;
}

/** Counts up to `value` with an ease-out curve. */
export function AnimatedNumber({ value = 0, duration = 900, style, format = (n) => String(n) }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration: reduceMotion ? 0 : duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{format(display)}</Text>;
}

/** Progress bar whose fill glides to `percent` (0-100). */
export function ProgressBar({ percent = 0, trackStyle, fillStyle, min = 6 }) {
  const value = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: Math.max(min, Math.min(100, percent)),
      duration: reduceMotion ? 0 : 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width can't run on the native driver
    }).start();
  }, [percent]);
  const width = value.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <Animated.View style={trackStyle}>
      <Animated.View style={[fillStyle, { width }]} />
    </Animated.View>
  );
}
