import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, Share } from 'react-native';
import { Heart, Copy, HeartRemove } from 'iconsax-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { coupleAPI } from '../services/api';
import { secureStorage } from '../services/secureStorage';
import { haptics } from '../utils/haptics';
import { FadeInView, PressableScale, ShakeView } from './motion';
import { fonts, shadow } from '../theme/tokens';

const CACHE_KEY_POSTS = 'date_logger_cached_posts';

/**
 * Create-or-enter invite code UI for linking partners. Used in Settings and in the
 * walkthrough shown after sign-up.
 *
 * onJournalChanged: called after linking/unlinking, once the cached journal is dropped.
 * onLinked(partner): called when the accounts become linked.
 */
export function PartnerLinkPanel({ onJournalChanged, onLinked }) {
  const { user, token, updateUser } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [couple, setCouple] = useState({ partner: user?.partner || null, invite: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const applyCouple = useCallback(
    (data) => {
      const next = { partner: data?.partner || null, invite: data?.invite || null };
      setCouple(next);
      updateUser({ partner: next.partner });
      return next;
    },
    [updateUser]
  );

  useEffect(() => {
    let isMounted = true;
    coupleAPI
      .get(token)
      .then((data) => isMounted && applyCouple(data))
      .catch(() => {})
      .finally(() => isMounted && setIsLoading(false));
    return () => {
      isMounted = false;
    };
  }, [token]);

  /** The shared journal just changed shape, so drop the cached list and tell the app to reload. */
  const journalChanged = async () => {
    try {
      await secureStorage.removeItem(CACHE_KEY_POSTS);
    } catch (e) {}
    if (onJournalChanged) onJournalChanged();
  };

  const runAction = async (action, { changesJournal = false } = {}) => {
    setError('');
    setIsBusy(true);
    try {
      const next = applyCouple(await action());
      if (changesJournal) await journalChanged();
      haptics.success();
      if (next.partner && onLinked) onLinked(next.partner);
      return true;
    } catch (err) {
      haptics.error();
      setError(err.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateInvite = () => runAction(() => coupleAPI.createInvite(token));

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Enter the 6-character code your partner shared.');
      haptics.error();
      return;
    }
    const ok = await runAction(() => coupleAPI.join(code, token), { changesJournal: true });
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
          onPress: () => runAction(() => coupleAPI.unlink(token), { changesJournal: true }),
        },
      ]
    );
  };

  const handleShareCode = async () => {
    if (!couple.invite?.code) return;
    try {
      await Share.share({
        message: `Join me on Date Logger ♡ Open Settings → Your partner and enter this code: ${couple.invite.code}`,
      });
    } catch (e) {}
  };

  return (
    <View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      ) : couple.partner ? (
        <FadeInView key="linked" from="scale">
          <View style={styles.linkedBox}>
            <Heart size={18} color={colors.primary} variant="Bold" />
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
          <PressableScale style={styles.subtleDangerBtn} onPress={handleUnlink} disabled={isBusy}>
            <HeartRemove size={14} color={colors.danger} />
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
              disabled={isBusy}
              haptic="press"
            >
              {isBusy ? (
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

          <ShakeView trigger={error}>
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
                disabled={isBusy}
                haptic="press"
              >
                <Text style={styles.primaryBtnText}>Link</Text>
              </PressableScale>
            </View>
          </ShakeView>
        </FadeInView>
      )}

      {error ? (
        <FadeInView key={error} from="scale">
          <Text style={styles.errorText}>{error}</Text>
        </FadeInView>
      ) : null}
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
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
  });
