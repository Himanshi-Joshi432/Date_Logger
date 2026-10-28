import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { PlusCircle, History, ArrowRight, Heart, LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export function DashboardScreen({ onNavigateLog, onNavigateHistory }) {
  const { user, logout } = useAuth();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Top Bar with Brand & Logout */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Heart size={18} color={colors.primary} fill={colors.primary} />
          <Text style={styles.brandName}>Date Logger</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut size={15} color={colors.textSubtle} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
        </View>

        {/* Dynamic Action Cards Container - Expands to fill available height */}
        <View style={styles.actionsContainer}>
          {/* Action 1: Log Date */}
          <TouchableOpacity
            style={styles.primaryActionCard}
            onPress={onNavigateLog}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.primaryIconCircle}>
                <PlusCircle size={36} color="#ffffff" strokeWidth={2.4} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.primaryActionTitle}>Log Date</Text>
                <Text style={styles.primaryActionDesc}>
                  Record a new memory, venue & photos
                </Text>
              </View>
            </View>
            <View style={styles.arrowCircle}>
              <ArrowRight size={22} color="#ffffff" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>

          {/* Action 2: Check History */}
          <TouchableOpacity
            style={styles.secondaryActionCard}
            onPress={onNavigateHistory}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.secondaryIconCircle}>
                <History size={36} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.secondaryActionTitle}>Check History</Text>
                <Text style={styles.secondaryActionDesc}>
                  Browse & relive all your past dates
                </Text>
              </View>
            </View>
            <View style={styles.secondaryArrowCircle}>
              <ArrowRight size={22} color={colors.primary} strokeWidth={2.4} />
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

const styles = StyleSheet.create({
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
    paddingBottom: '3%',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    letterSpacing: -0.2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  logoutText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textDark,
  },
  mainCard: {
    width: '100%',
    flex: 1,
    minHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: '5%',
    paddingTop: '8%',
    paddingBottom: '5%',
    justifyContent: 'space-between',
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
    position: 'relative',
  },
  paperclipWrapper: {
    position: 'absolute',
    top: -14,
    right: 26,
    width: 20,
    height: 44,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#7a664e',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  paperclipInner: {
    position: 'absolute',
    top: 5,
    left: 2.5,
    width: 10,
    height: 28,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#7a664e',
  },
  washiTape: {
    position: 'absolute',
    top: -9,
    left: '24%',
    width: 90,
    height: 19,
    backgroundColor: 'rgba(238, 224, 196, 0.9)',
    borderRadius: 2,
    transform: [{ rotate: '-2deg' }],
    borderWidth: 1,
    borderColor: 'rgba(202, 178, 145, 0.5)',
    zIndex: 5,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: '3%',
  },
  waxBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: 'rgba(141, 61, 47, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  userSubtitle: {
    fontSize: 13.5,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  userEmail: {
    fontWeight: '700',
    color: colors.primary,
  },
  actionsContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    marginVertical: 14,
  },
  primaryActionCard: {
    width: '100%',
    minHeight: 122,
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#752f23',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 5,
  },
  secondaryActionCard: {
    width: '100%',
    minHeight: 122,
    backgroundColor: '#faf4ea',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  primaryIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  secondaryIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dbcbb6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionTextWrap: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  primaryActionDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  secondaryActionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  secondaryActionDesc: {
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dbcbb6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteScrap: {
    width: '100%',
    backgroundColor: '#fbf7ee',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#dac9b3',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2c241d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quoteText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: '#4e3f31',
    textAlign: 'center',
  },
  quoteHeart: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
