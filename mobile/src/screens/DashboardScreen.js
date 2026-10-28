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
            activeOpacity={0.88}
          >
            <View style={styles.actionLeft}>
              <View style={styles.primaryIconCircle}>
                <PlusCircle size={32} color="#ffffff" strokeWidth={2.2} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.primaryActionTitle}>Log Date</Text>
                <Text style={styles.primaryActionDesc}>
                  Record a new memory, venue & photos
                </Text>
              </View>
            </View>
            <View style={styles.arrowCircle}>
              <ArrowRight size={20} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Action 2: Check History */}
          <TouchableOpacity
            style={styles.secondaryActionCard}
            onPress={onNavigateHistory}
            activeOpacity={0.88}
          >
            <View style={styles.actionLeft}>
              <View style={styles.secondaryIconCircle}>
                <History size={32} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.secondaryActionTitle}>Check History</Text>
                <Text style={styles.secondaryActionDesc}>
                  Browse & relive all your past dates
                </Text>
              </View>
            </View>
            <View style={styles.secondaryArrowCircle}>
              <ArrowRight size={20} color={colors.primary} />
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
    marginBottom: 10,
    paddingHorizontal: '2%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    letterSpacing: 0.3,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSubtle,
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
    paddingBottom: '6%',
    justifyContent: 'space-between',
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  paperclipWrapper: {
    position: 'absolute',
    top: -14,
    right: 28,
    width: 22,
    height: 46,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: colors.antiqueBrass,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  paperclipInner: {
    position: 'absolute',
    top: 6,
    left: 3,
    width: 11,
    height: 30,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.antiqueBrass,
  },
  washiTape: {
    position: 'absolute',
    top: -8,
    left: '26%',
    width: 95,
    height: 18,
    backgroundColor: colors.washiTape,
    borderRadius: 2,
    transform: [{ rotate: '-2deg' }],
    borderWidth: 1,
    borderColor: 'rgba(216, 190, 155, 0.4)',
    zIndex: 5,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: '4%',
  },
  waxBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'rgba(141, 61, 47, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 6,
    textAlign: 'center',
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
    gap: 16,
    marginVertical: '4%',
  },
  primaryActionCard: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: '5%',
    paddingHorizontal: '5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryActionCard: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingVertical: '5%',
    paddingHorizontal: '5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  primaryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  secondaryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionTextWrap: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  primaryActionDesc: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 16,
  },
  secondaryActionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 3,
  },
  secondaryActionDesc: {
    fontSize: 12.5,
    color: colors.textSubtle,
    lineHeight: 16,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteScrap: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    paddingVertical: '3%',
    paddingHorizontal: '4%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: colors.textMedium,
    textAlign: 'center',
  },
  quoteHeart: {
    color: colors.primary,
    fontSize: 15,
  },
});
