import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  Lovely,
  Notification,
  ShieldTick,
  Logout,
  Trash,
  Moon,
  ArrowRight2,
} from 'iconsax-react-native';
import { secureStorage } from '../services/secureStorage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI, PRIVACY_POLICY_URL } from '../services/api';
import {
  areRemindersEnabled,
  enableReminders,
  disableReminders,
  syncReminders,
} from '../services/notifications';
import { haptics } from '../utils/haptics';
import { FadeInView, PressableScale, ShakeView } from '../components/motion';
import { PartnerLinkPanel } from '../components/PartnerLinkPanel';
import { fonts, shadow } from '../theme/tokens';

const CACHE_KEY_POSTS = 'date_logger_cached_posts';

export function SettingsScreen({ onNavigateBack, onJournalChanged }) {
  const { user, token, logout, endSession } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const styles = getStyles(colors);

  // Reminders
  const [remindersOn, setRemindersOn] = useState(false);

  // Delete account
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    areRemindersEnabled().then((on) => isMounted && setRemindersOn(on));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleReminders = async (value) => {
    haptics.select();
    if (!value) {
      setRemindersOn(false);
      await disableReminders();
      return;
    }
    const granted = await enableReminders();
    if (!granted) {
      setRemindersOn(false);
      Alert.alert(
        'Notifications are off',
        'To get reminders, allow notifications for Date Logger in your phone settings.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings().catch(() => {}) },
        ]
      );
      return;
    }
    setRemindersOn(true);
    try {
      const cached = await secureStorage.getItem(CACHE_KEY_POSTS);
      await syncReminders(cached ? JSON.parse(cached) : []);
    } catch (e) {}
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      haptics.error();
      return;
    }
    setDeleteError('');
    setIsDeleting(true);
    try {
      await authAPI.deleteAccount(deletePassword, token);
      await disableReminders();
      haptics.success();
      setDeleteVisible(false);
      await endSession();
    } catch (err) {
      haptics.error();
      setDeleteError(err.message || 'Could not delete the account. Please try again.');
      setIsDeleting(false);
    }
  };

  const initial = (user?.email || '?').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        <PressableScale style={styles.navBtn} onPress={onNavigateBack} accessibilityLabel="Back">
          <ArrowLeft size={18} color={colors.textDark} />
        </PressableScale>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account */}
        <FadeInView style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileLabel}>Signed in as</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </FadeInView>

        {/* Partner */}
        <FadeInView delay={70} style={styles.card}>
          <View style={styles.cardHeader}>
            <Lovely size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Your partner</Text>
          </View>

          <PartnerLinkPanel onJournalChanged={onJournalChanged} />
        </FadeInView>

        {/* Preferences */}
        <FadeInView delay={140} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Notification size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Reminders</Text>
              <Text style={styles.rowSub}>"On this day" memories and a weekend date nudge</Text>
            </View>
            <Switch
              value={remindersOn}
              onValueChange={handleToggleReminders}
              trackColor={{ true: colors.primary, false: colors.borderSubtle }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Moon size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Dark mode</Text>
              <Text style={styles.rowSub}>Switches automatically in the evening until you set it</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={() => {
                haptics.select();
                toggleTheme();
              }}
              trackColor={{ true: colors.primary, false: colors.borderSubtle }}
              thumbColor="#ffffff"
            />
          </View>
        </FadeInView>

        {/* About & account actions */}
        <FadeInView delay={210} style={styles.card}>
          <PressableScale
            style={styles.row}
            scaleTo={0.98}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
          >
            <View style={styles.rowIcon}>
              <ShieldTick size={17} color={colors.primary} />
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Privacy policy</Text>
            <ArrowRight2 size={18} color={colors.textMuted} />
          </PressableScale>

          <View style={styles.rowDivider} />

          <PressableScale style={styles.row} scaleTo={0.98} onPress={logout}>
            <View style={styles.rowIcon}>
              <Logout size={17} color={colors.primary} />
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Sign out</Text>
            <ArrowRight2 size={18} color={colors.textMuted} />
          </PressableScale>
        </FadeInView>

        <FadeInView delay={280}>
          <PressableScale
            style={styles.deleteRow}
            scaleTo={0.98}
            haptic="warning"
            onPress={() => {
              setDeletePassword('');
              setDeleteError('');
              setDeleteVisible(true);
            }}
          >
            <Trash size={16} color={colors.danger} />
            <Text style={styles.deleteRowText}>Delete my account</Text>
          </PressableScale>
          <Text style={styles.footerNote}>Date Logger · made for two ♡</Text>
        </FadeInView>
      </ScrollView>

      {/* Delete account confirmation */}
      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ShakeView trigger={deleteError} style={{ width: '100%', maxWidth: 420 }}>
            <FadeInView from="scale" style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Trash size={24} color={colors.danger} />
              </View>
              <Text style={styles.modalTitle}>Delete your account?</Text>
              <Text style={styles.modalBody}>
                This permanently deletes your account, every date log you created, their photos,
                and your bucket list ideas. It cannot be undone.
              </Text>

              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password to confirm"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                value={deletePassword}
                onChangeText={setDeletePassword}
                editable={!isDeleting}
              />
              {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}

              <View style={styles.modalActions}>
                <PressableScale
                  style={styles.cancelBtn}
                  onPress={() => setDeleteVisible(false)}
                  disabled={isDeleting}
                >
                  <Text style={styles.cancelBtnText}>Keep my account</Text>
                </PressableScale>
                <PressableScale
                  style={styles.confirmDeleteBtn}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}
                  haptic="warning"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Delete forever</Text>
                  )}
                </PressableScale>
              </View>
            </FadeInView>
          </ShakeView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    topNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      fontSize: 22,
      fontFamily: fonts.display,
      color: colors.textDark,
    },
    scrollContent: {
      paddingBottom: 40,
      gap: 14,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 16,
      ...shadow(2),
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 24,
      fontFamily: fonts.display,
      color: '#ffffff',
    },
    profileLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSubtle,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    profileEmail: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textDark,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderActive,
      padding: 16,
      ...shadow(1),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    cardTitle: {
      fontSize: 19,
      fontFamily: fonts.display,
      color: colors.textDark,
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      fontWeight: '600',
      marginTop: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 6,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textDark,
    },
    rowSub: {
      fontSize: 12,
      color: colors.textSubtle,
      marginTop: 1,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderSubtle,
      marginVertical: 10,
    },
    deleteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerBg,
    },
    deleteRowText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.danger,
    },
    footerNote: {
      textAlign: 'center',
      fontSize: 13,
      fontFamily: fonts.displayItalic,
      color: colors.textMuted,
      marginTop: 18,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 14, 10, 0.62)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 22,
      alignItems: 'center',
      ...shadow(3),
    },
    modalIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.dangerBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 22,
      fontFamily: fonts.display,
      color: colors.textDark,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalBody: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSubtle,
      textAlign: 'center',
      marginBottom: 16,
    },
    passwordInput: {
      alignSelf: 'stretch',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textDark,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      alignSelf: 'stretch',
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textDark,
    },
    confirmDeleteBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.danger,
      alignItems: 'center',
    },
    confirmDeleteText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
