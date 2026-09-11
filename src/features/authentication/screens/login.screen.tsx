import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/auth-context';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const {
    isLoading,
    isBiometricsEnabled,
    biometricLabel,
    error,
    login,
    loginWithBiometrics,
    forgetSavedAccount,
  } = useAuth();

  // If biometrics is enabled, offer quick sign-in via biometrics
  const hasSavedBiometricSession = isBiometricsEnabled;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      {/* Top Header & Branding */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>⚡</Text>
        </View>
        <Text style={styles.appTitle}>Mobile Boilerplate</Text>
        <Text style={styles.appSubtitle}>Secure Authentication with Biometrics</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {hasSavedBiometricSession ? (
          // Re-authentication state with biometric sign-in
          <View style={styles.userCard}>
            <View style={styles.biometricBadgeWrapper}>
              <View style={styles.biometricIconCircle}>
                <Text style={styles.biometricCircleIcon}>
                  {biometricLabel.includes('Face') ? '👤' : '👆'}
                </Text>
              </View>
              <View style={styles.badgeIndicator}>
                <Text style={styles.badgeText}>🔐</Text>
              </View>
            </View>

            <Text style={styles.welcomeBackText}>Quick Sign-In</Text>
            <Text style={styles.biometricPromptSubtitle}>
              Fast authentication using {biometricLabel}
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actionContainer}>
              <TouchableOpacity
                role="button"
                accessibilityRole="button"
                style={styles.biometricButton}
                onPress={() => loginWithBiometrics()}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.biometricButtonIcon}>
                      {biometricLabel.includes('Face') ? '👤' : '👆'}
                    </Text>
                    <Text style={styles.biometricButtonText}>
                      Log in with {biometricLabel}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                role="button"
                accessibilityRole="button"
                style={styles.switchAccountButton}
                onPress={() => login()}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.switchAccountText}>Sign in with another account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                role="button"
                accessibilityRole="button"
                style={styles.forgetButton}
                onPress={() => forgetSavedAccount()}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.forgetText}>Remove saved credentials</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Initial state: Biometrics is NOT triggered before first login
          <View style={styles.firstLoginContainer}>
            <View style={styles.heroIllustration}>
              <View style={styles.shieldBadge}>
                <Text style={styles.shieldIcon}>🛡️</Text>
              </View>
            </View>

            <Text style={styles.greetingTitle}>Welcome</Text>
            <Text style={styles.greetingDescription}>
              Experience seamless, passwordless login protected by your account provider and device&apos;s biometric security.
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              role="button"
              accessibilityRole="button"
              style={styles.getStartedButton}
              onPress={() => login()}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.getStartedButtonText}>Get started</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.securityFooterText}>
              End-to-end encrypted with SecureStore & PKCE
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  logoBadgeText: {
    fontSize: 28,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  // Saved Biometric User State
  userCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  biometricBadgeWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  biometricIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  biometricCircleIcon: {
    fontSize: 36,
  },
  badgeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F1F5F9',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 12,
  },
  welcomeBackText: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '700',
  },
  biometricPromptSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  biometricButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  biometricButtonIcon: {
    fontSize: 18,
  },
  biometricButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchAccountButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchAccountText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  forgetButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  forgetText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  // First Login State
  firstLoginContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroIllustration: {
    marginBottom: 24,
  },
  shieldBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  shieldIcon: {
    fontSize: 44,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  greetingDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  getStartedButton: {
    backgroundColor: '#0066CC',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  getStartedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  securityFooterText: {
    marginTop: 20,
    fontSize: 12,
    color: '#94A3B8',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
});
