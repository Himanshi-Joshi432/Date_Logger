import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PlusCircle,
  History,
  ArrowRight,
  Settings,
  Moon,
  Sun,
  Sparkles,
  Clock,
  Compass,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postAPI } from '../services/api';
import { syncReminders } from '../services/notifications';
import {
  FadeInView,
  PressableScale,
  PulseView,
  FloatView,
  AnimatedNumber,
} from '../components/motion';
import { fonts, gradients, shadow } from '../theme/tokens';

const CACHE_KEY_POSTS = 'date_logger_cached_posts';

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late, lovebirds';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Sweet dreams';
}

export function DashboardScreen({
  onNavigateLog,
  onNavigateHistory,
  onNavigateIdeas,
  onNavigateSettings,
  onViewDetails,
}) {
  const { user, token } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [totalMemories, setTotalMemories] = useState(0);
  const [onThisDayMemory, setOnThisDayMemory] = useState(null);
  const [latestMemory, setLatestMemory] = useState(null);

  useFocusEffect(
    useCallback(() => {
    let isActive = true;
    async function loadStats() {
      try {
        // Try local cache first for instant load
        const cached = await AsyncStorage.getItem(CACHE_KEY_POSTS);
        if (cached && isActive) {
          analyzePosts(JSON.parse(cached));
        }

        // Fetch fresh from API
        if (token) {
          const res = await postAPI.getPosts(token);
          if (res?.posts) {
            await AsyncStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(res.posts));
            if (isActive) analyzePosts(res.posts);
            // Keep "On this day" reminders in step with the latest memories.
            syncReminders(res.posts);
          }
        }
      } catch (err) {
        // quiet error on dashboard stats
      }
    }

    loadStats();
    return () => {
      isActive = false;
    };
    }, [token])
  );

  const analyzePosts = (posts) => {
    if (!posts || posts.length === 0) {
      setTotalMemories(0);
      setLatestMemory(null);
      setOnThisDayMemory(null);
      return;
    }

    setTotalMemories(posts.length);
    setLatestMemory(posts[0]);

    // Check "On This Day"
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();

    const match = posts.find((p) => {
      if (!p.date) return false;
      const d = new Date(p.date);
      return (
        d.getMonth() === todayMonth &&
        d.getDate() === todayDay &&
        d.getFullYear() < todayYear
      );
    });

    if (match) {
      const matchYear = new Date(match.date).getFullYear();
      setOnThisDayMemory({ ...match, yearsAgo: todayYear - matchYear });
    } else {
      setOnThisDayMemory(null);
    }
  };

  const styles = getStyles(colors);
  const grad = gradients(colors);
  const firstName = (user?.email || '').split('@')[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar with Brand, Theme Toggle & Logout */}
      <FadeInView from="top" distance={10} style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>Date Logger</Text>
        </View>

        <View style={styles.topActionsRow}>
          <PressableScale
            style={styles.iconCircleBtn}
            onPress={toggleTheme}
            haptic="select"
            scaleTo={0.85}
            accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <FadeInView key={isDarkMode ? 'sun' : 'moon'} from="scale">
              {isDarkMode ? (
                <Sun size={16} color={colors.textDark} />
              ) : (
                <Moon size={16} color={colors.textDark} />
              )}
            </FadeInView>
          </PressableScale>

          <PressableScale
            style={styles.iconCircleBtn}
            onPress={onNavigateSettings}
            scaleTo={0.85}
            accessibilityLabel="Settings"
          >
            <Settings size={17} color={colors.textDark} />
          </PressableScale>
        </View>
      </FadeInView>

      {/* Main Journal Card */}
      <FadeInView delay={60} distance={26} style={styles.mainCard}>
        <FloatView style={styles.paperclipWrapper} distance={3}>
          <View style={styles.paperclipInner} />
        </FloatView>
        <View style={styles.washiTape} />

        {/* Greeting Header */}
        <View style={styles.header}>
          <FadeInView from="scale" delay={140}>
            <PulseView style={styles.waxBadge}>
              <Image
                source={require('../../assets/splash-icon.png')}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </PulseView>
          </FadeInView>
          <FadeInView delay={180}>
            <Text style={styles.greeting} numberOfLines={1}>
              {greetingForNow()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
          </FadeInView>
          {user?.partner?.email ? (
            <FadeInView delay={200} from="scale" style={styles.partnerPill}>
              <Text style={styles.partnerPillText} numberOfLines={1}>
                ♡ shared with {user.partner.email.split('@')[0]}
              </Text>
            </FadeInView>
          ) : null}
          <FadeInView delay={220}>
            <Text style={styles.title}>Our Date Journal</Text>
          </FadeInView>

          {/* Quick Stats */}
          <FadeInView delay={280} from="scale" style={styles.statsRow}>
            <View style={styles.statBlock}>
              <AnimatedNumber value={totalMemories} style={styles.statNumber} />
              <Text style={styles.statLabel}>
                {totalMemories === 1 ? 'date captured' : 'dates captured'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={styles.statLabel}>
                {latestMemory?.date
                  ? `latest · ${new Date(latestMemory.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}`
                  : 'your story starts here'}
              </Text>
            </View>
          </FadeInView>
        </View>

        {/* "On This Day" Milestone Banner */}
        {onThisDayMemory ? (
          <FadeInView delay={320} from="scale">
            <PressableScale
              style={styles.onThisDayCard}
              onPress={() => onViewDetails && onViewDetails(onThisDayMemory)}
              haptic="press"
            >
              <View style={styles.onThisDayHeader}>
                <View style={styles.anniversaryBadge}>
                  <Clock size={12} color="#ffffff" />
                  <Text style={styles.anniversaryBadgeText}>
                    On This Day • {onThisDayMemory.yearsAgo}{' '}
                    {onThisDayMemory.yearsAgo === 1 ? 'Year' : 'Years'} Ago
                  </Text>
                </View>
              </View>
              <Text style={styles.onThisDayTitle}>{onThisDayMemory.venue}</Text>
              {onThisDayMemory.description ? (
                <Text style={styles.onThisDayDesc} numberOfLines={2}>
                  "{onThisDayMemory.description}"
                </Text>
              ) : null}
              <View style={styles.onThisDayFooter}>
                <Text style={styles.reliveText}>Relive this memory ♡</Text>
                <ArrowRight size={14} color={colors.primary} />
              </View>
            </PressableScale>
          </FadeInView>
        ) : null}

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          <FadeInView delay={360}>
            <PressableScale onPress={onNavigateLog} haptic="press" style={styles.primaryShadow}>
              <LinearGradient
                colors={grad.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryActionCard}
              >
                <View style={styles.actionLeft}>
                  <View style={styles.primaryIconCircle}>
                    <PlusCircle size={30} color="#ffffff" strokeWidth={2.4} />
                  </View>
                  <View style={styles.actionTextWrap}>
                    <Text style={styles.primaryActionTitle}>Log a Date</Text>
                    <Text style={styles.primaryActionDesc}>
                      Photos, music, mood & the little details
                    </Text>
                  </View>
                </View>
                <View style={styles.arrowCircle}>
                  <ArrowRight size={20} color="#ffffff" strokeWidth={2.4} />
                </View>
              </LinearGradient>
            </PressableScale>
          </FadeInView>

          <FadeInView delay={420}>
            <PressableScale style={styles.secondaryActionCard} onPress={onNavigateHistory}>
              <View style={styles.actionLeft}>
                <View style={styles.secondaryIconCircle}>
                  <History size={26} color={colors.primary} strokeWidth={2.4} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.secondaryActionTitle}>Date Memories</Text>
                  <Text style={styles.secondaryActionDesc}>
                    Browse, search, edit & share your past dates
                  </Text>
                </View>
              </View>
              <View style={styles.secondaryArrowCircle}>
                <ArrowRight size={20} color={colors.primary} strokeWidth={2.4} />
              </View>
            </PressableScale>
          </FadeInView>

          <FadeInView delay={480}>
            <PressableScale style={styles.ideasActionCard} onPress={onNavigateIdeas}>
              <View style={styles.actionLeft}>
                <View style={styles.ideasIconCircle}>
                  <Compass size={24} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.ideasActionTitle}>Couple Bucket List</Text>
                  <Text style={styles.ideasActionDesc}>
                    Future date ideas & dream places to visit
                  </Text>
                </View>
              </View>
              <View style={styles.ideasArrowCircle}>
                <ArrowRight size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
            </PressableScale>
          </FadeInView>
        </View>

        {/* Vintage Quote Scrap */}
        <FadeInView delay={560} from="none" style={styles.quoteScrap}>
          <Text style={styles.quoteText}>
            there is beauty in small things. <Text style={styles.quoteHeart}>♡</Text>
          </Text>
        </FadeInView>
      </FadeInView>
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      width: '100%',
    },
    scrollContent: {
      flexGrow: 1,
      width: '100%',
      paddingHorizontal: '4%',
      paddingTop: 6,
      paddingBottom: 110,
    },
    topBar: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
      paddingHorizontal: 2,
      paddingTop: 4,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandName: {
      fontSize: 20,
      fontFamily: fonts.display,
      fontWeight: 'normal',
      color: colors.textDark,
    },
    topActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconCircleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow(1),
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      ...shadow(1),
    },
    logoutText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    mainCard: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingHorizontal: '4.5%',
      paddingTop: 26,
      paddingBottom: 18,
      position: 'relative',
      ...shadow(2),
    },
    paperclipWrapper: {
      position: 'absolute',
      top: -12,
      right: 32,
      zIndex: 10,
    },
    paperclipInner: {
      width: 14,
      height: 34,
      borderRadius: 7,
      borderWidth: 2.5,
      borderColor: colors.antiqueBrass,
      backgroundColor: 'transparent',
    },
    washiTape: {
      position: 'absolute',
      top: -8,
      left: '32%',
      width: 90,
      height: 18,
      backgroundColor: colors.washiTape,
      borderRadius: 2,
      transform: [{ rotate: '-2deg' }],
      borderWidth: 0.5,
      borderColor: 'rgba(0,0,0,0.06)',
      zIndex: 5,
    },
    header: {
      alignItems: 'center',
      marginBottom: 18,
    },
    waxBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryLight,
      borderWidth: 2,
      borderColor: 'rgba(141, 61, 47, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    greeting: {
      fontSize: 14,
      fontFamily: fonts.displayItalic,
      color: colors.textSubtle,
      textAlign: 'center',
      marginBottom: 2,
    },
    partnerPill: {
      backgroundColor: colors.primaryLight,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginTop: 4,
      marginBottom: 2,
      maxWidth: '90%',
    },
    partnerPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    title: {
      fontSize: 30,
      fontFamily: fonts.displayHeavy,
      fontWeight: 'normal',
      color: colors.textDark,
      textAlign: 'center',
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    statBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    statDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.borderSubtle,
      marginVertical: 4,
    },
    statNumber: {
      fontSize: 26,
      fontFamily: fonts.display,
      fontWeight: 'normal',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSubtle,
      marginTop: 3,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    onThisDayCard: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.primary,
      padding: 16,
      marginBottom: 16,
      ...shadow(1, colors.primary),
    },
    onThisDayHeader: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    anniversaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 10,
    },
    anniversaryBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    onThisDayTitle: {
      fontSize: 19,
      fontFamily: fonts.display,
      fontWeight: 'normal',
      color: colors.textDark,
      marginBottom: 4,
    },
    onThisDayDesc: {
      fontSize: 13,
      color: colors.textSubtle,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    onThisDayFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reliveText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    actionsContainer: {
      gap: 12,
      marginBottom: 18,
    },
    primaryShadow: {
      borderRadius: 22,
      ...shadow(2, colors.primary),
    },
    primaryActionCard: {
      borderRadius: 22,
      paddingVertical: 18,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    secondaryActionCard: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderActive,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...shadow(1),
    },
    ideasActionCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.borderActive,
      borderStyle: 'dashed',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    primaryIconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryIconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(141, 61, 47, 0.2)',
    },
    ideasIconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    actionTextWrap: {
      flex: 1,
    },
    primaryActionTitle: {
      fontSize: 19,
      fontFamily: fonts.display,
      fontWeight: 'normal',
      color: '#ffffff',
      marginBottom: 2,
    },
    primaryActionDesc: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.88)',
    },
    secondaryActionTitle: {
      fontSize: 17,
      fontFamily: fonts.display,
      fontWeight: 'normal',
      color: colors.textDark,
      marginBottom: 2,
    },
    secondaryActionDesc: {
      fontSize: 12,
      color: colors.textSubtle,
    },
    ideasActionTitle: {
      fontSize: 17,
      fontFamily: fonts.display,
      fontWeight: 'normal',
      color: colors.textDark,
      marginBottom: 2,
    },
    ideasActionDesc: {
      fontSize: 12,
      color: colors.textSubtle,
    },
    arrowCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryArrowCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ideasArrowCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quoteScrap: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderStyle: 'dashed',
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quoteText: {
      fontSize: 14,
      fontFamily: fonts.displayItalic,
      color: colors.textSubtle,
      textAlign: 'center',
    },
    quoteHeart: {
      color: colors.primary,
      fontSize: 14,
    },
  });
