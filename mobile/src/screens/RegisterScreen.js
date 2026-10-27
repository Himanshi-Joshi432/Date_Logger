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
} from 'react-native';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export function RegisterScreen({ onNavigateLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();

  const handleRegister = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email.trim(), password);
      setSuccessMsg('Account created successfully! You can now sign in.');
      setTimeout(() => {
        onNavigateLogin();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
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
        <View style={styles.card}>
          {/* Decorative Paperclip */}
          <View style={styles.paperclipWrapper}>
            <View style={styles.paperclipInner} />
          </View>

          {/* Decorative Washi Tape */}
          <View style={styles.washiTape} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.waxBadge}>
              <Heart size={24} color={colors.primary} fill={colors.primary} />
            </View>
            <Text style={styles.title}>Begin Your Story</Text>
            <Text style={styles.subtitle}>
              Create an account to start documenting your shared dates
            </Text>
          </View>

          {/* Alerts */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
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
                placeholder="Create a strong password"
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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <Lock size={18} color={colors.textSubtle} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Re-type your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Create Account</Text>
                <ArrowRight size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>

          {/* Switch to Login */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateLogin}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: 24,
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
    marginBottom: 20,
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
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSubtle,
    textAlign: 'center',
    paddingHorizontal: 10,
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
  successBox: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
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
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    marginTop: 18,
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

