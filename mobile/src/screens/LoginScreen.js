import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeInView, PressableScale, PulseView, ShakeView } from '../components/motion';
import { haptics } from '../utils/haptics';
import { fonts, gradients, shadow } from '../theme/tokens';

export function LoginScreen({ onNavigateRegister }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      haptics.error();
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main Journal Deckle Card */}
        <ShakeView trigger={errorMsg}>
        <FadeInView distance={40} style={styles.card}>
          {/* Decorative Paperclip */}
          <View style={styles.paperclipWrapper}>
            <View style={styles.paperclipInner} />
          </View>

          {/* Decorative Washi Tape */}
          <View style={styles.washiTape} />

          {/* Header */}
          <FadeInView delay={120} style={styles.header}>
            <PulseView style={styles.waxBadge}>
              <Image
                source={require('../../assets/splash-icon.png')}
                style={{ width: 38, height: 38 }}
                resizeMode="contain"
              />
            </PulseView>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to relive and record your special date memories
            </Text>
          </FadeInView>

          {/* Error Message */}
          {errorMsg ? (
            <FadeInView key={errorMsg} from="scale" style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </FadeInView>
          ) : null}

          {/* Form Fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Mail size={18} color={colors.textSubtle} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Lock size={18} color={colors.textSubtle} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textSubtle} />
                ) : (
                  <Eye size={18} color={colors.textSubtle} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <PressableScale
            style={[styles.submitShadow, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            haptic="press"
          >
            <LinearGradient
              colors={gradients(colors).primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Sign In</Text>
                <ArrowRight size={18} color="#ffffff" />
              </>
            )}
          </LinearGradient>
          </PressableScale>

          {/* Switch to Register */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateRegister}>
              <Text style={styles.switchLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>
        </ShakeView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: 26,
    ...shadow(3),
    position: 'relative',
  },
  paperclipWrapper: {
    position: 'absolute',
    top: -12,
    right: 32,
    width: 22,
    height: 44,
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
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.antiqueBrass,
  },
  washiTape: {
    position: 'absolute',
    top: -8,
    left: '28%',
    width: 90,
    height: 18,
    backgroundColor: colors.washiTape,
    borderRadius: 2,
    transform: [{ rotate: '-2deg' }],
    borderWidth: 1,
    borderColor: 'rgba(216, 190, 155, 0.4)',
    zIndex: 5,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
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
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.displayHeavy,
    fontWeight: 'normal',
    color: colors.textDark,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSubtle,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMedium,
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  submitShadow: {
    borderRadius: 16,
    marginTop: 10,
    ...shadow(2, colors.primary),
  },
  submitBtn: {
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    color: colors.textSubtle,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});

