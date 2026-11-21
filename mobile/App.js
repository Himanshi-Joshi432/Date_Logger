import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { StyleSheet, View, Text, BackHandler, Image, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  StackActions,
  createNavigationContainerRef,
  useFocusEffect,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
// Import individual weights so only these three font files are bundled.
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display/400Regular_Italic';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display/800ExtraBold';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LogDateScreen } from './src/screens/LogDateScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { DateDetailsScreen } from './src/screens/DateDetailsScreen';
import { DateIdeasScreen } from './src/screens/DateIdeasScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PartnerWalkthroughScreen } from './src/screens/PartnerWalkthroughScreen';
import { BottomNavBar } from './src/components/BottomNavBar';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { PulseView, ScreenTransition } from './src/components/motion';
import { onReminderOpened } from './src/services/notifications';
import { fonts } from './src/theme/tokens';

// Keep the native splash up until our animated one is on screen (avoids a blank flash).
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// Bumped when the shared journal changes shape (partner linked or unlinked) so tabs reload.
const JournalContext = createContext({ version: 0, bump: () => {} });

// Order of the bottom tabs, used to pick the slide direction between them.
const TAB_ORDER = { dashboard: 0, history: 1, log: 2, ideas: 3 };

// Deep links: datelogger://memory/<id> and datelogger://settings
const linking = {
  prefixes: ['datelogger://'],
  config: {
    initialRouteName: 'Main',
    screens: {
      Main: '',
      Details: 'memory/:postId',
      Settings: 'settings',
    },
  },
};

/** Branded splash that pulses while loading, then fades and lifts away. */
function AnimatedSplash({ ready, fontsReady, onHidden, colors }) {
  const out = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // This view now covers the screen, so the native splash can go.
    SplashScreen.hide();
    Animated.timing(intro, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(out, {
      toValue: 1,
      duration: 420,
      delay: 150,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onHidden && onHidden());
  }, [ready]);

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFill,
        styles.loadingContainer,
        {
          backgroundColor: colors.bg,
          opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        },
      ]}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: intro,
          transform: [
            { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            { scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        }}
      >
        <PulseView>
          <Image
            source={require('./assets/splash-icon.png')}
            style={{ width: 96, height: 96, marginBottom: 16 }}
            resizeMode="contain"
          />
        </PulseView>
        <Text
          style={[
            styles.splashTitle,
            { color: colors.textDark },
            fontsReady && { fontFamily: fonts.displayHeavy, fontWeight: 'normal' },
          ]}
        >
          Date Logger
        </Text>
        <Text
          style={[
            styles.splashTagline,
            { color: colors.textSubtle },
            fontsReady && { fontFamily: fonts.displayItalic, fontStyle: 'normal' },
          ]}
        >
          every little moment, kept
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

/** Login and register, sliding between each other. */
function AuthFlow() {
  const [authScreen, setAuthScreen] = useState('login');

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (authScreen === 'register') {
          setAuthScreen('login');
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [authScreen])
  );

  return (
    <ScreenTransition key={`auth-${authScreen}`} direction={authScreen === 'register' ? 1 : -1}>
      {authScreen === 'register' ? (
        <RegisterScreen onNavigateLogin={() => setAuthScreen('login')} />
      ) : (
        <LoginScreen onNavigateRegister={() => setAuthScreen('register')} />
      )}
    </ScreenTransition>
  );
}

/** The four bottom tabs. Stays mounted underneath Details/Settings, so it keeps its place. */
function MainTabs({ navigation, route }) {
  const { colors } = useTheme();
  const [nav, setNav] = useState({ tab: 'dashboard', direction: 0 });
  const [initialVenueForLog, setInitialVenueForLog] = useState('');
  const { version: journalVersion } = useContext(JournalContext);

  const goToTab = useCallback((tab) => {
    setNav((prev) => {
      if (prev.tab === tab) return prev;
      const diff = (TAB_ORDER[tab] ?? 0) - (TAB_ORDER[prev.tab] ?? 0);
      return { tab, direction: Math.sign(diff) };
    });
  }, []);

  // A reminder or link can ask for a specific tab.
  const requestedTab = route.params?.tab;
  useEffect(() => {
    if (requestedTab && TAB_ORDER[requestedTab] !== undefined) {
      goToTab(requestedTab);
      navigation.setParams({ tab: undefined });
    }
  }, [requestedTab]);

  // Android back: from any other tab go to the journal first, then let the OS exit.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (nav.tab !== 'dashboard') {
          goToTab('dashboard');
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [nav.tab, goToTab])
  );

  const openDetails = (post) =>
    navigation.navigate('Details', { postId: post._id, initialPost: post });
  const openLog = () => {
    setInitialVenueForLog('');
    goToTab('log');
  };

  const renderTab = () => {
    switch (nav.tab) {
      case 'log':
        return (
          <LogDateScreen
            initialVenue={initialVenueForLog}
            onNavigateBack={() => {
              setInitialVenueForLog('');
              goToTab('dashboard');
            }}
            onLogSaved={() => {
              setInitialVenueForLog('');
              goToTab('history');
            }}
          />
        );
      case 'ideas':
        return (
          <DateIdeasScreen
            onLogIdeaAsDate={(title) => {
              setInitialVenueForLog(title);
              goToTab('log');
            }}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            onNavigateBack={() => goToTab('dashboard')}
            onNavigateLog={openLog}
            onViewDetails={openDetails}
          />
        );
      case 'dashboard':
      default:
        return (
          <DashboardScreen
            onNavigateLog={openLog}
            onNavigateHistory={() => goToTab('history')}
            onNavigateIdeas={() => goToTab('ideas')}
            onNavigateSettings={() => navigation.navigate('Settings')}
            onViewDetails={openDetails}
          />
        );
    }
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.bg }]}>
      <View style={styles.contentArea}>
        {/* journalVersion changes when a partner is linked/unlinked, forcing a fresh load */}
        <ScreenTransition key={`${nav.tab}-${journalVersion}`} direction={nav.direction}>
          {renderTab()}
        </ScreenTransition>
      </View>
      <BottomNavBar
        currentScreen={nav.tab}
        onSelectTab={(tab) => {
          if (tab === 'log') setInitialVenueForLog('');
          goToTab(tab);
        }}
      />
    </View>
  );
}

function DetailsRoute({ navigation, route }) {
  const goBack = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.dispatch(StackActions.replace('Main'));
  return (
    <DateDetailsScreen
      postId={route.params?.postId}
      initialPost={route.params?.initialPost || null}
      onNavigateBack={goBack}
      onDeleteSuccess={goBack}
    />
  );
}

function SettingsRoute({ navigation }) {
  const { bump } = useContext(JournalContext);
  return (
    <SettingsScreen
      onNavigateBack={() =>
        navigation.canGoBack() ? navigation.goBack() : navigation.dispatch(StackActions.replace('Main'))
      }
      onJournalChanged={bump}
    />
  );
}

/** Partner-linking walkthrough shown once after sign-up, before the journal. */
function WelcomeRoute() {
  const { bump } = useContext(JournalContext);
  const { finishPartnerWalkthrough } = useAuth();
  return <PartnerWalkthroughScreen onFinish={finishPartnerWalkthrough} onJournalChanged={bump} />;
}

function MainApp({ fontsReady }) {
  const { isAuthenticated, isInitializing, needsPartnerWalkthrough } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const pendingReminder = useRef(null);
  const [journalVersion, setJournalVersion] = useState(0);
  const journal = useMemo(
    () => ({ version: journalVersion, bump: () => setJournalVersion((v) => v + 1) }),
    [journalVersion]
  );

  const ready = !isInitializing && fontsReady;

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDarkMode,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.bg,
        text: colors.textDark,
        border: colors.borderSubtle,
      },
    }),
    [colors, isDarkMode]
  );

  // Tapping a reminder opens the memory (or the bucket list) it is about.
  const openReminder = useCallback((data) => {
    if (!navigationRef.isReady()) {
      pendingReminder.current = data;
      return;
    }
    if (data?.postId) {
      navigationRef.navigate('Details', { postId: data.postId });
    } else if (data?.screen) {
      navigationRef.dispatch(StackActions.popTo('Main', { tab: data.screen }));
    }
  }, []);

  useEffect(() => onReminderOpened(openReminder), [openReminder]);

  const handleNavReady = () => {
    if (pendingReminder.current && isAuthenticated) {
      const data = pendingReminder.current;
      pendingReminder.current = null;
      openReminder(data);
    }
  };

  return (
    <JournalContext.Provider value={journal}>
    <View style={[styles.mainWrapper, { backgroundColor: colors.bg }]}>
      {ready && (
        <NavigationContainer
          ref={navigationRef}
          theme={navTheme}
          linking={isAuthenticated ? linking : undefined}
          onReady={handleNavReady}
        >
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            {isAuthenticated ? (
              <>
                {/* Listed first so it opens on top; removing it reveals the journal. */}
                {needsPartnerWalkthrough && (
                  <Stack.Screen
                    name="Welcome"
                    component={WelcomeRoute}
                    options={{ gestureEnabled: false, animation: 'fade' }}
                  />
                )}
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="Details" component={DetailsRoute} />
                <Stack.Screen name="Settings" component={SettingsRoute} />
              </>
            ) : (
              <Stack.Screen
                name="Auth"
                component={AuthFlow}
                options={{ animationTypeForReplace: 'pop' }}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}

      {!splashDone && (
        <AnimatedSplash
          ready={ready}
          fontsReady={fontsReady}
          colors={colors}
          onHidden={() => setSplashDone(true)}
        />
      )}
    </View>
    </JournalContext.Provider>
  );
}

function ThemedAppContainer({ fontsReady }) {
  const { colors, isDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AuthProvider>
        <MainApp fontsReady={fontsReady} />
      </AuthProvider>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
  });
  // If fonts fail to load, carry on with the system font rather than blocking the app.
  const fontsReady = fontsLoaded || !!fontError;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedAppContainer fontsReady={fontsReady} />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
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
    zIndex: 100,
  },
  splashTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  splashTagline: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
