import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Lovely,
  Book1,
  MagicStar,
  Setting2,
  ArrowRight,
  ArrowRight2,
  TickCircle,
  Heart,
} from 'iconsax-react-native';
import { useTheme } from '../context/ThemeContext';
import { PartnerLinkPanel } from '../components/PartnerLinkPanel';
import { FadeInView, PressableScale, PulseView, ScreenTransition } from '../components/motion';
import { fonts, shadow } from '../theme/tokens';

const STEP_ORDER = { intro: 0, link: 1, linked: 2, skipped: 2 };

/**
 * Shown once, straight after sign-up: walks the new user through linking with their
 * partner. Skipping explains where the option lives in Settings so it isn't missed.
 */
export function PartnerWalkthroughScreen({ onFinish, onJournalChanged }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [nav, setNav] = useState({ step: 'intro', direction: 0 });
  const [partner, setPartner] = useState(null);

  const goTo = (step) =>
    setNav((prev) => ({ step, direction: Math.sign(STEP_ORDER[step] - STEP_ORDER[prev.step]) || 1 }));

  const progress = (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.dot, i <= STEP_ORDER[nav.step] && { backgroundColor: colors.primary, width: 18 }]}
        />
      ))}
    </View>
  );

  const renderStep = () => {
    switch (nav.step) {
      case 'link':
        return (
          <>
            <FadeInView style={styles.header}>
              <Text style={styles.kicker}>Step 2 of 3</Text>
              <Text style={styles.title}>Link with your partner</Text>
              <Text style={styles.subtitle}>
                Create a code and send it to them, or enter the one they sent you.
              </Text>
            </FadeInView>

            <FadeInView delay={80} style={styles.card}>
              <PartnerLinkPanel
                onJournalChanged={onJournalChanged}
                onLinked={(p) => {
                  setPartner(p);
                  goTo('linked');
                }}
              />
            </FadeInView>

            <FadeInView delay={160}>
              <PressableScale style={styles.ghostBtn} onPress={() => goTo('skipped')} haptic="select">
                <Text style={styles.ghostBtnText}>Skip for now</Text>
              </PressableScale>
              <Text style={styles.footHint}>
                Your partner hasn’t signed up yet? Create a code and send it. It works once they
                join.
              </Text>
            </FadeInView>
          </>
        );

      case 'linked':
        return (
          <View style={styles.centered}>
            <FadeInView from="scale">
              <View style={[styles.bigBadge, { backgroundColor: colors.successBg }]}>
                <TickCircle size={44} color={colors.success} variant="Bold" />
              </View>
            </FadeInView>
            <FadeInView delay={100} style={styles.header}>
              <Text style={[styles.title, { textAlign: 'center' }]}>You’re linked ♡</Text>
              <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                You and {partner?.email || 'your partner'} now share one journal and bucket list.
              </Text>
            </FadeInView>
            <FadeInView delay={180} style={{ alignSelf: 'stretch' }}>
              <PressableScale style={styles.primaryBtn} onPress={onFinish} haptic="press">
                <Text style={styles.primaryBtnText}>Start our journal</Text>
                <ArrowRight size={18} color="#ffffff" />
              </PressableScale>
            </FadeInView>
          </View>
        );

      case 'skipped':
        return (
          <View style={styles.centered}>
            <FadeInView from="scale">
              <PulseView style={styles.bigBadge}>
                <Setting2 size={40} color={colors.primary} variant="Bulk" />
              </PulseView>
            </FadeInView>
            <FadeInView delay={100} style={styles.header}>
              <Text style={[styles.title, { textAlign: 'center' }]}>You can link anytime</Text>
              <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                Whenever you’re ready, tap the settings button at the top of your journal and open
                “Your partner”.
              </Text>
            </FadeInView>

            {/* A miniature of where to tap, so the option is easy to find later. */}
            <FadeInView delay={180} style={styles.mapCard}>
              <View style={styles.mapRow}>
                <View style={styles.mapIcon}>
                  <Setting2 size={16} color={colors.textDark} />
                </View>
                <Text style={styles.mapText}>Settings</Text>
                <ArrowRight2 size={16} color={colors.textMuted} />
                <View style={[styles.mapIcon, { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}>
                  <Lovely size={16} color={colors.primary} />
                </View>
                <Text style={[styles.mapText, { color: colors.primary }]}>Your partner</Text>
              </View>
            </FadeInView>

            <FadeInView delay={240} style={{ alignSelf: 'stretch' }}>
              <PressableScale style={styles.primaryBtn} onPress={onFinish} haptic="press">
                <Text style={styles.primaryBtnText}>Got it</Text>
              </PressableScale>
              <PressableScale style={styles.ghostBtn} onPress={() => goTo('link')} haptic="select">
                <Text style={styles.ghostBtnText}>Actually, link now</Text>
              </PressableScale>
            </FadeInView>
          </View>
        );

      case 'intro':
      default:
        return (
          <>
            <FadeInView from="scale" style={{ alignItems: 'center', marginTop: 12 }}>
              <PulseView style={styles.bigBadge}>
                <Heart size={42} color={colors.primary} variant="Bold" />
              </PulseView>
            </FadeInView>
            <FadeInView delay={80} style={styles.header}>
              <Text style={styles.kicker}>Welcome · Step 1 of 3</Text>
              <Text style={styles.title}>Date Logger is made for two</Text>
              <Text style={styles.subtitle}>
                Link your account with your partner’s and you’ll keep one shared story.
              </Text>
            </FadeInView>

            <FadeInView delay={160} style={styles.card}>
              {[
                { Icon: Book1, title: 'One shared journal', sub: 'Both of you see and add every date.' },
                { Icon: MagicStar, title: 'A joint bucket list', sub: 'Plan your next dates together.' },
                { Icon: Lovely, title: 'Takes a minute', sub: 'One of you makes a code, the other enters it.' },
              ].map(({ Icon, title, sub }, i) => (
                <View key={title} style={[styles.featureRow, i > 0 && styles.featureDivider]}>
                  <View style={styles.featureIcon}>
                    <Icon size={18} color={colors.primary} variant="Bulk" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{title}</Text>
                    <Text style={styles.featureSub}>{sub}</Text>
                  </View>
                </View>
              ))}
            </FadeInView>

            <FadeInView delay={240}>
              <PressableScale style={styles.primaryBtn} onPress={() => goTo('link')} haptic="press">
                <Text style={styles.primaryBtnText}>Link with my partner</Text>
                <ArrowRight size={18} color="#ffffff" />
              </PressableScale>
              <PressableScale style={styles.ghostBtn} onPress={() => goTo('skipped')} haptic="select">
                <Text style={styles.ghostBtnText}>I’ll do it later</Text>
              </PressableScale>
            </FadeInView>
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {progress}
      <ScreenTransition key={nav.step} direction={nav.direction}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </ScreenTransition>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.borderSubtle,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 32,
      gap: 18,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
    },
    header: {
      gap: 6,
    },
    kicker: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.displayHeavy,
      color: colors.textDark,
      lineHeight: 34,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSubtle,
    },
    bigBadge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderActive,
      padding: 16,
      ...shadow(1),
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    featureDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderSubtle,
    },
    featureIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textDark,
    },
    featureSub: {
      fontSize: 12,
      color: colors.textSubtle,
      marginTop: 1,
    },
    primaryBtn: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow(2, colors.primary),
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#ffffff',
    },
    ghostBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    ghostBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSubtle,
    },
    footHint: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    mapCard: {
      alignSelf: 'stretch',
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    mapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    mapIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textDark,
    },
  });
