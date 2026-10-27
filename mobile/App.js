import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LogDateScreen } from './src/screens/LogDateScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { colors } from './src/theme/colors';

function MainApp() {
  const { isAuthenticated, isInitializing } = useAuth();

  // Navigation states
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // 'dashboard' | 'log' | 'history'

  // Initializing splash
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.splashBadge}>
          <Heart size={36} color={colors.primary} fill={colors.primary} />
        </View>
        <Text style={styles.splashTitle}>Date Logger</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  // Unauthenticated stack
  if (!isAuthenticated) {
    if (authScreen === 'register') {
      return <RegisterScreen onNavigateLogin={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onNavigateRegister={() => setAuthScreen('register')} />;
  }

  // Authenticated stack
  switch (currentScreen) {
    case 'log':
      return (
        <LogDateScreen
          onNavigateBack={() => setCurrentScreen('dashboard')}
          onLogSaved={() => setCurrentScreen('history')}
        />
      );
    case 'history':
      return (
        <HistoryScreen
          onNavigateBack={() => setCurrentScreen('dashboard')}
          onNavigateLog={() => setCurrentScreen('log')}
        />
      );
    case 'dashboard':
    default:
      return (
        <DashboardScreen
          onNavigateLog={() => setCurrentScreen('log')}
          onNavigateHistory={() => setCurrentScreen('history')}
        />
      );
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" backgroundColor={colors.bg} />
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: 'rgba(141, 61, 47, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textDark,
    letterSpacing: 0.5,
  },
});
