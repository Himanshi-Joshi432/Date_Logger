import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Home, BookHeart, Plus, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export function BottomNavBar({ currentScreen, onSelectTab }) {
  const { colors } = useTheme();

  const handlePress = (tab) => {
    try {
      Vibration.vibrate(15);
    } catch (e) {}
    onSelectTab(tab);
  };

  const tabs = [
    { key: 'dashboard', label: 'Journal', icon: Home },
    { key: 'history', label: 'Memories', icon: BookHeart },
    { key: 'log', label: 'Log Date', icon: Plus, isAction: true },
    { key: 'ideas', label: 'Bucket List', icon: Sparkles },
  ];

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.key;
          const Icon = tab.icon;

          if (tab.isAction) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.actionBtnWrapper}
                onPress={() => handlePress(tab.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.actionBtn, isActive && styles.actionBtnActive]}>
                  <Icon size={24} color="#ffffff" strokeWidth={2.6} />
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => handlePress(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Icon
                  size={20}
                  color={isActive ? colors.primary : colors.textSubtle}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.bg,
      paddingHorizontal: 14,
      paddingBottom: 8,
      paddingTop: 6,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingVertical: 6,
      paddingHorizontal: 8,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    tabBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      paddingHorizontal: 12,
      minWidth: 64,
    },
    iconWrap: {
      padding: 4,
      borderRadius: 12,
    },
    iconWrapActive: {
      backgroundColor: colors.primaryLight,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 2,
    },
    tabLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    actionBtnWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -18,
    },
    actionBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    actionBtnActive: {
      transform: [{ scale: 1.05 }],
      backgroundColor: colors.primaryHover,
    },
  });

