import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LogDateScreen } from './src/screens/LogDateScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { DateDetailsScreen } from './src/screens/DateDetailsScreen';
import { DateIdeasScreen } from './src/screens/DateIdeasScreen';
import { BottomNavBar } from './src/components/BottomNavBar';

function MainApp() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { colors, isDarkMode } = useTheme();

  // Navigation states
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // 'dashboard' | 'log' | 'history' | 'ideas' | 'details'
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [initialVenueForLog, setInitialVenueForLog] = useState('');

  // Hardware Back Button Handler for Android
  useEffect(() => {
    const onBackPress = () => {
      if (!isAuthenticated) return false;

      if (currentScreen === 'details') {
        setCurrentScreen('history');
        return true;
      }
      if (currentScreen === 'log' || currentScreen === 'history' || currentScreen === 'ideas') {
        setCurrentScreen('dashboard');
        return true;
      }
      return false; // Let OS handle (exit app)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [currentScreen, isAuthenticated]);

  // Initializing splash
  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.splashBadge,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary,
            },
          ]}
        >
          <Heart size={36} color={colors.primary} fill={colors.primary} />
        </View>
        <Text style={[styles.splashTitle, { color: colors.textDark }]}>Date Logger</Text>
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

  // Handle converting a bucket list idea into a date log
  const handleLogIdeaAsDate = (ideaTitle) => {
    setInitialVenueForLog(ideaTitle);
    setCurrentScreen('log');
  };

  // Render current active screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'details':
        return (
          <DateDetailsScreen
            postId={selectedPostId}
            initialPost={selectedPost}
            onNavigateBack={() => setCurrentScreen('history')}
            onDeleteSuccess={() => setCurrentScreen('history')}
          />
        );
      case 'log':
        return (
          <LogDateScreen
            initialVenue={initialVenueForLog}
            onNavigateBack={() => {
              setInitialVenueForLog('');
              setCurrentScreen('dashboard');
            }}
            onLogSaved={() => {
              setInitialVenueForLog('');
              setCurrentScreen('history');
            }}
          />
        );
      case 'ideas':
        return (
          <DateIdeasScreen
            onLogIdeaAsDate={handleLogIdeaAsDate}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            onNavigateBack={() => setCurrentScreen('dashboard')}
            onNavigateLog={() => {
              setInitialVenueForLog('');
              setCurrentScreen('log');
            }}
            onViewDetails={(post) => {
              setSelectedPostId(post._id);
              setSelectedPost(post);
              setCurrentScreen('details');
            }}
          />
        );
      case 'dashboard':
      default:
        return (
          <DashboardScreen
            onNavigateLog={() => {
              setInitialVenueForLog('');
              setCurrentScreen('log');
            }}
            onNavigateHistory={() => setCurrentScreen('history')}
            onNavigateIdeas={() => setCurrentScreen('ideas')}
            onViewDetails={(post) => {
              setSelectedPostId(post._id);
              setSelectedPost(post);
              setCurrentScreen('details');
            }}
          />
        );
    }
  };

  const showBottomNav = currentScreen !== 'details';

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.bg }]}>
      <View style={styles.contentArea}>{renderScreen()}</View>

      {/* Persistent Bottom Navigation Bar */}
      {showBottomNav && (
        <BottomNavBar
          currentScreen={currentScreen}
          onSelectTab={(tab) => {
            if (tab === 'log') {
              setInitialVenueForLog('');
            }
            setCurrentScreen(tab);
          }}
        />
      )}
    </View>
  );
}

function ThemedAppContainer() {
  const { colors, isDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        backgroundColor={colors.bg}
      />
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedAppContainer />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainWrapper: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
});
