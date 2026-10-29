import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Vibration,
} from 'react-native';
import {
  PlusCircle,
  History,
  ArrowRight,
  Heart,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  Calendar,
  Clock,
  Compass,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postAPI } from '../services/api';

const CACHE_KEY_POSTS = 'date_logger_cached_posts';

export function DashboardScreen({
  onNavigateLog,
  onNavigateHistory,
  onNavigateIdeas,
  onViewDetails,
}) {
  const { user, logout, token } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [totalMemories, setTotalMemories] = useState(0);
  const [onThisDayMemory, setOnThisDayMemory] = useState(null);
  const [latestMemory, setLatestMemory] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        // Try local cache first for instant load
        const cached = await AsyncStorage.getItem(CACHE_KEY_POSTS);
        if (cached) {
          analyzePosts(JSON.parse(cached));
        }

        // Fetch fresh from API
        if (token) {
          const res = await postAPI.getPosts(token);
          if (res?.posts) {
            await AsyncStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(res.posts));
            analyzePosts(res.posts);
          }
        }
      } catch (err) {
        // quiet error on dashboard stats
      }
    }

    loadStats();
  }, [token]);

  const analyzePosts = (posts) => {
    if (!posts || posts.length === 0) {
      setTotalMemories(0);
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
      const yearsAgo = todayYear - matchYear;
      setOnThisDayMemory({ ...match, yearsAgo });
    }
  };

  const handlePressAction = (fn) => {
    try {
      Vibration.vibrate(20);
    } catch (e) {}
    if (fn) fn();
  };

  const styles = getStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Top Bar with Brand, Theme Toggle & Logout */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Heart size={18} color={colors.primary} fill={colors.primary} />
          <Text style={styles.brandName}>Date Logger</Text>
        </View>

        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => {
              try {
                Vibration.vibrate(15);
              } catch (e) {}
              toggleTheme();
            }}
            activeOpacity={0.7}
          >
            {isDarkMode ? (
              <Sun size={16} color={colors.textDark} />
            ) : (
              <Moon size={16} color={colors.textDark} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            activeOpacity={0.7}
          >
            <LogOut size={14} color={colors.textSubtle} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Full-Screen Dynamic Card */}
      <View style={styles.mainCard}>
        {/* Paperclip top decoration */}
        <View style={styles.paperclipWrapper}>
          <View style={styles.paperclipInner} />
        </View>

        {/* Washi tape decoration */}
        <View style={styles.washiTape} />

        {/* Greeting Header */}
        <View style={styles.header}>
          <View style={styles.waxBadge}>
            <Heart size={24} color={colors.primary} fill={colors.primary} />
          </View>
          <Text style={styles.title}>Our Date Journal</Text>
          <Text style={styles.userSubtitle}>
            Preserving memories for{' '}
            <Text style={styles.userEmail}>{user?.email || 'You'}</Text>
          </Text>

          {/* Quick Stats Pill */}
          <View style={styles.statsPill}>
            <Sparkles size={13} color={colors.primary} />
            <Text style={styles.statsText}>
              {totalMemories === 1
                ? '1 special date captured'
                : `${totalMemories} special dates captured together`}
            </Text>
          </View>
        </View>

        {/* "On This Day" Milestone Banner (if available) */}
        {onThisDayMemory ? (
          <TouchableOpacity
            style={styles.onThisDayCard}
            onPress={() => onViewDetails && onViewDetails(onThisDayMemory)}
            activeOpacity={0.85}
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
          </TouchableOpacity>
        ) : null}

        {/* Action Cards Container */}
        <View style={styles.actionsContainer}>
          {/* Action 1: Log Date */}
          <TouchableOpacity
            style={styles.primaryActionCard}
            onPress={() => handlePressAction(onNavigateLog)}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.primaryIconCircle}>
                <PlusCircle size={32} color="#ffffff" strokeWidth={2.4} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.primaryActionTitle}>Log Date</Text>
                <Text style={styles.primaryActionDesc}>
                  Record music, mood, venue & photos
                </Text>
              </View>
            </View>
            <View style={styles.arrowCircle}>
              <ArrowRight size={20} color="#ffffff" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>

          {/* Action 2: Check History */}
          <TouchableOpacity
            style={styles.secondaryActionCard}
            onPress={() => handlePressAction(onNavigateHistory)}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.secondaryIconCircle}>
                <History size={32} color={colors.primary} strokeWidth={2.4} />
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
          </TouchableOpacity>

          {/* Action 3: Date Bucket List */}
          <TouchableOpacity
            style={styles.ideasActionCard}
            onPress={() => handlePressAction(onNavigateIdeas)}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.ideasIconCircle}>
                <Compass size={28} color={colors.primary} strokeWidth={2.2} />
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
          </TouchableOpacity>
        </View>

        {/* Vintage Quote Scrap */}
        <View style={styles.quoteScrap}>
          <Text style={styles.quoteText}>
            there is beauty in small things.{' '}
            <Text style={styles.quoteHeart}>♡</Text>
          </Text>
        </View>
      </View>
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
      paddingHorizontal: '3%',
      paddingTop: '1%',
      paddingBottom: 85,
    },
    topBar: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 4,
      paddingTop: 4,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textDark,
      letterSpacing: -0.3,
    },
    topActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconCircleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    logoutText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    mainCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      paddingHorizontal: '4%',
      paddingTop: '5%',
      paddingBottom: '4%',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      position: 'relative',
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
      marginBottom: 16,
      marginTop: 4,
    },
    waxBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryLight,
      borderWidth: 2,
      borderColor: 'rgba(141, 61, 47, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textDark,
      letterSpacing: -0.4,
      marginBottom: 3,
    },
    userSubtitle: {
      fontSize: 13,
      color: colors.textSubtle,
      marginBottom: 10,
    },
    userEmail: {
      fontWeight: '700',
      color: colors.primary,
    },
    statsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceSubtle,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    statsText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    onThisDayCard: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      padding: 14,
      marginBottom: 16,
    },
    onThisDayHeader: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    anniversaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    anniversaryBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    onThisDayTitle: {
      fontSize: 16,
      fontWeight: '800',
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
    primaryActionCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
    },
    secondaryActionCard: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ideasActionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.borderActive,
      borderStyle: 'dashed',
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    primaryIconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryIconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(141, 61, 47, 0.2)',
    },
    ideasIconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
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
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
      marginBottom: 2,
    },
    primaryActionDesc: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
    },
    secondaryActionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textDark,
      marginBottom: 2,
    },
    secondaryActionDesc: {
      fontSize: 12,
      color: colors.textSubtle,
    },
    ideasActionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textDark,
      marginBottom: 2,
    },
    ideasActionDesc: {
      fontSize: 12,
      color: colors.textSubtle,
    },
    arrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryArrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ideasArrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quoteScrap: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderStyle: 'dashed',
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quoteText: {
      fontSize: 12,
      fontStyle: 'italic',
      color: colors.textSubtle,
      textAlign: 'center',
    },
    quoteHeart: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
    },
  });
