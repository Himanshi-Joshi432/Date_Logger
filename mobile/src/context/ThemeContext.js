import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme/colors';

const ThemeContext = createContext({
  isDarkMode: false,
  colors: lightColors,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'date_logger_dark_mode';
const THEME_MANUAL_OVERRIDE_KEY = 'date_logger_theme_manual_override';

/**
 * Checks if current time is night time (after 8:00 PM / 20:00 to 5:59 AM)
 */
export function isNightTime() {
  const currentHour = new Date().getHours();
  return currentHour >= 20 || currentHour < 6;
}

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(isNightTime());
  const [hasManualOverride, setHasManualOverride] = useState(false);

  const checkAndApplyTimeTheme = (override = hasManualOverride) => {
    if (!override) {
      setIsDarkMode(isNightTime());
    }
  };

  useEffect(() => {
    async function loadThemeSettings() {
      try {
        const manual = await AsyncStorage.getItem(THEME_MANUAL_OVERRIDE_KEY);
        if (manual === 'true') {
          const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
          if (stored !== null) {
            setIsDarkMode(stored === 'true');
            setHasManualOverride(true);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      // Default: strictly adhere to time of day (dark theme after 8pm)
      setIsDarkMode(isNightTime());
      setHasManualOverride(false);
    }

    loadThemeSettings();

    // Check every 30 seconds so transition happens promptly at 8:00 PM
    const interval = setInterval(() => {
      checkAndApplyTimeTheme();
    }, 30000);

    // Re-check whenever app transitions to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkAndApplyTimeTheme();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [hasManualOverride]);

  const toggleTheme = async () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    setHasManualOverride(true);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, String(nextMode));
      await AsyncStorage.setItem(THEME_MANUAL_OVERRIDE_KEY, 'true');
    } catch (e) {
      // ignore
    }
  };

  const currentColors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors: currentColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
