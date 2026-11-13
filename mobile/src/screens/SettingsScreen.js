import { useCallback, useEffect, useState } from 'react';
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
  Share,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  Heart,
  HeartHandshake,
  Bell,
  Shield,
  LogOut,
  Trash2,
  Moon,
  Copy,
  ChevronRight,
  Unlink,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI, coupleAPI, PRIVACY_POLICY_URL } from '../services/api';
import {
  areRemindersEnabled,
  enableReminders,
  disableReminders,
  syncReminders,
} from '../services/notifications';
import { haptics } from '../utils/haptics';
import { FadeInView, PressableScale, ShakeView } from '../components/motion';
import { fonts, shadow } from '../theme/tokens';

const CACHE_KEY_POSTS = 'date_logger_cached_posts';

export function SettingsScreen({ onNavigateBack, onJournalChanged }) {
  const { user, token, logout, endSession, updateUser } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const styles = getStyles(colors);

  // Partner linking
  const [couple, setCouple] = useState({ partner: user?.partner || null, invite: null });
  const [isLoadingCouple, setIsLoadingCouple] = useState(true);
  const [isCoupleBusy, setIsCoupleBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [coupleError, setCoupleError] = useState('');

  // Reminders
  const [remindersOn, setRemindersOn] = useState(false);

  // Delete account
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const applyCouple = useCallback(
    (data) => {
      const next = { partner: data?.partner || null, invite: data?.invite || null };
      setCouple(next);
      updateUser({ partner: next.partner });
    },
    [updateUser]
  );

  useEffect(() => {
    let isMounted = true;
    coupleAPI
      .get(token)
      .then((data) => isMounted && applyCouple(data))
      .catch(() => {})
      .finally(() => isMounted && setIsLoadingCouple(false));
    areRemindersEnabled().then((on) => isMounted && setRemindersOn(on));
    return () => {
      isMounted = false;
    };
  }, [token]);

  /** The shared journal just changed shape, so drop the cached list and tell the app to reload. */
  const journalChanged = async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY_POSTS);
    } catch (e) {}
    if (onJournalChanged) onJournalChanged();
  };

  const runCoupleAction = async (action, { changesJournal = false } = {}) => {
    setCoupleError('');
    setIsCoupleBusy(true);
    try {
      const data = await action();
      applyCouple(data);
      if (changesJournal) await journalChanged();
      haptics.success();
      return true;
    } catch (err) {
      haptics.error();
      setCoupleError(err.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setIsCoupleBusy(false);
    }
  };

  const handleCreateInvite = () => runCoupleAction(() => coupleAPI.createInvite(token));

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setCoupleError('Enter the 6-character code your partner shared.');
      haptics.error();
      return;
    }
    const ok = await runCoupleAction(() => coupleAPI.join(code, token), { changesJournal: true });
    if (ok) setJoinCode('');
  };

  const handleUnlink = () => {
    Alert.alert(
      'Unlink partner?',
      "You'll each keep your own date logs and ideas, but will no longer see each other's.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => runCoupleAction(() => coupleAPI.unlink(token), { changesJournal: true }),
        },
      ]
    );
  };

  const handleShareCode = async () => {
    if (!couple.invite?.code) return;
    try {
      await Share.share({
        message: `Join me on Date Logger ♡ Open Settings → Link with partner and enter this code: ${couple.invite.code}`,
      });
    } catch (e) {}
  };

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
      const cached = await AsyncStorage.getItem(CACHE_KEY_POSTS);
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
            <HeartHandshake size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Your partner</Text>
          </View>

          {isLoadingCouple ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : couple.partner ? (
            <FadeInView key="linked" from="scale">
              <View style={styles.linkedBox}>
                <Heart size={18} color={colors.primary} fill={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkedLabel}>Sharing a journal with</Text>
                  <Text style={styles.linkedEmail} numberOfLines={1}>
                    {couple.partner.email}
                  </Text>
                </View>
              </View>
              <Text style={styles.helpText}>
                You both see and can edit every date log and bucket list idea.
              </Text>
              <PressableScale style={styles.subtleDangerBtn} onPress={handleUnlink} disabled={isCoupleBusy}>
                <Unlink size={14} color={colors.danger} />
                <Text style={styles.subtleDangerText}>Unlink partner</Text>
              </PressableScale>
            </FadeInView>
          ) : (
            <FadeInView key="unlinked" from="none">
              <Text style={styles.helpText}>
                Link accounts to share one journal and bucket list. One of you creates a code,
                the other enters it.
              </Text>

              {couple.invite ? (
                <FadeInView from="scale" style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Your invite code</Text>
                  <Text style={styles.codeValue} selectable>
                    {couple.invite.code}
                  </Text>
                  <Text style={styles.codeHint}>Valid for 24 hours, one use.</Text>
                  <PressableScale style={styles.secondaryBtn} onPress={handleShareCode}>
                    <Copy size={14} color={colors.primary} />
                    <Text style={styles.secondaryBtnText}>Send to partner</Text>
                  </PressableScale>
                </FadeInView>
              ) : (
                <PressableScale
                  style={styles.primaryBtn}
                  onPress={handleCreateInvite}
                  disabled={isCoupleBusy}
                  haptic="press"
                >
                  {isCoupleBusy ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create invite code</Text>
                  )}
                </PressableScale>
              )}

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or enter their code</Text>
                <View style={styles.dividerLine} />
              </View>

              <ShakeView trigger={coupleError}>
                <View style={styles.joinRow}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="ABC123"
                    placeholderTextColor={colors.textMuted}
                    value={joinCode}
                    onChangeText={(t) => setJoinCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    onSubmitEditing={handleJoin}
                    returnKeyType="done"
                  />
                  <PressableScale
                    style={[styles.joinBtn, joinCode.length !== 6 && { opacity: 0.5 }]}
                    onPress={handleJoin}
                    disabled={isCoupleBusy}
                    haptic="press"
                  >
                    <Text style={styles.primaryBtnText}>Link</Text>
                  </PressableScale>
                </View>
              </ShakeView>
            </FadeInView>
          )}

          {coupleError ? (
            <FadeInView key={coupleError} from="scale">
              <Text style={styles.errorText}>{coupleError}</Text>
            </FadeInView>
          ) : null}
        </FadeInView>

        {/* Preferences */}
        <FadeInView delay={140} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Bell size={17} color={colors.primary} />
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
              <Shield size={17} color={colors.primary} />
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Privacy policy</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </PressableScale>

          <View style={styles.rowDivider} />

          <PressableScale style={styles.row} scaleTo={0.98} onPress={logout}>
            <View style={styles.rowIcon}>
              <LogOut size={17} color={colors.primary} />
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Sign out</Text>
            <ChevronRight size={18} color={colors.textMuted} />
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
            <Trash2 size={16} color={colors.danger} />
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
                <Trash2 size={24} color={colors.danger} />
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
    helpText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSubtle,
      marginBottom: 12,
    },
    linkedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    linkedLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSubtle,
    },
    linkedEmail: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textDark,
      marginTop: 1,
    },
    subtleDangerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    subtleDangerText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.danger,
    },
    codeBox: {
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    codeLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSubtle,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    codeValue: {
      fontSize: 34,
      fontFamily: fonts.displayHeavy,
      color: colors.primary,
      letterSpacing: 6,
      marginVertical: 4,
    },
    codeHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 12,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow(2, colors.primary),
    },
    primaryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primaryLight,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    secondaryBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 14,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderActive,
    },
    dividerText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    joinRow: {
      flexDirection: 'row',
      gap: 10,
    },
    codeInput: {
      flex: 1,
      backgroundColor: colors.surfaceSubtle,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 4,
      color: colors.textDark,
    },
    joinBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
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
