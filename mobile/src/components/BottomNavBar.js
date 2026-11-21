import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home2,
  Book1,
  Add,
  MagicStar,
} from 'iconsax-react-native';
import { useTheme } from '../context/ThemeContext';
import { haptics } from '../utils/haptics';
import { gradients, shadow } from '../theme/tokens';
import { PressableScale } from './motion';

const TABS = [
  { key: 'dashboard', label: 'Journal', icon: Home2 },
  { key: 'history', label: 'Memories', icon: Book1 },
  { key: 'log', label: 'Log Date', icon: Add, isAction: true },
  { key: 'ideas', label: 'Bucket List', icon: MagicStar },
];

function TabItem({ tab, isActive, onPress, colors, styles }) {
  const active = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(active, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      damping: 12,
      stiffness: 260,
      mass: 0.7,
    }).start();
  }, [isActive]);

  const Icon = tab.icon;
  const iconScale = active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const iconLift = active.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const pillScale = active.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Pressable
      style={styles.tabBtn}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
    >
      <View style={styles.iconSlot}>
        <Animated.View
          style={[styles.activePill, { opacity: active, transform: [{ scaleX: pillScale }] }]}
        />
        <Animated.View style={{ transform: [{ translateY: iconLift }, { scale: iconScale }] }}>
          <Icon
            size={20}
            color={isActive ? colors.primary : colors.textSubtle}
            variant={isActive ? 'Bold' : 'Linear'}
          />
        </Animated.View>
      </View>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
      <Animated.View style={[styles.activeDot, { opacity: active, transform: [{ scale: active }] }]} />
    </Pressable>
  );
}

function ActionTab({ tab, isActive, onPress, colors, styles }) {
  const spin = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(spin, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  }, [isActive]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });
  const Icon = tab.icon;

  return (
    <View style={styles.actionBtnWrapper}>
      <PressableScale
        onPress={onPress}
        haptic={null}
        scaleTo={0.88}
        style={styles.actionBtnShadow}
        accessibilityRole="button"
        accessibilityLabel={tab.label}
      >
        <LinearGradient
          colors={gradients(colors).primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionBtn}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon size={26} color="#ffffff" />
          </Animated.View>
        </LinearGradient>
      </PressableScale>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
    </View>
  );
}

export function BottomNavBar({ currentScreen, onSelectTab, visible = true }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const shown = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(shown, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
    }).start();
  }, [visible]);

  const handlePress = (tab) => {
    if (tab === 'log') haptics.press();
    else haptics.select();
    onSelectTab(tab);
  };

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.container,
        {
          opacity: shown,
          transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [110, 0] }) }],
        },
      ]}
    >
      <View style={styles.navBar}>
        {TABS.map((tab) => {
          const isActive = currentScreen === tab.key;
          const Comp = tab.isAction ? ActionTab : TabItem;
          return (
            <Comp
              key={tab.key}
              tab={tab}
              isActive={isActive}
              onPress={() => handlePress(tab.key)}
              colors={colors}
              styles={styles}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 14,
      paddingBottom: 10,
      paddingTop: 6,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingVertical: 8,
      paddingHorizontal: 8,
      ...shadow(3),
    },
    tabBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
      paddingHorizontal: 8,
      minWidth: 64,
    },
    iconSlot: {
      width: 48,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activePill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 15,
      backgroundColor: colors.primaryLight,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 3,
      letterSpacing: 0.2,
    },
    tabLabelActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
      marginTop: 3,
    },
    actionBtnWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -26,
    },
    actionBtnShadow: {
      borderRadius: 30,
      ...shadow(3, colors.primary),
    },
    actionBtn: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
  });
