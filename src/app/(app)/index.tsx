import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/authentication/context/auth-context';
import { observability } from '@/services/observability';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    biometricLabel,
    isBiometricsAvailable,
    isBiometricsEnabled,
    enableBiometrics,
    disableBiometrics,
    logout,
    forgetSavedAccount,
  } = useAuth();

  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      await enableBiometrics();
    } else {
      await disableBiometrics();
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 80 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Overview</Text>
        <Text style={styles.headerSubtitle}>Secure Session Active</Text>
      </View>

      {/* Session Status Card */}
      <View style={styles.card}>
        <View style={styles.sessionRow}>
          <View style={styles.sessionIconWrapper}>
            <Text style={styles.sessionIcon}>🛡️</Text>
          </View>
          <View style={styles.sessionDetails}>
            <Text style={styles.sessionTitle}>Active Session</Text>
            <Text style={styles.sessionSubtitle}>Authenticated via OIDC</Text>
            <View style={styles.authBadge}>
              <Text style={styles.authBadgeText}>Session Active</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Biometric Security Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrapper}>
            <Text style={styles.cardIcon}>🔐</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>{biometricLabel} Quick Sign-In</Text>
            <Text style={styles.cardSubtitle}>
              Store refresh token in SecureStore for passwordless re-entry
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {isBiometricsAvailable ? (
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Enable {biometricLabel}</Text>
              <Text style={styles.toggleDesc}>
                Allows signing in with {biometricLabel} even after logging out.
              </Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={isBiometricsEnabled ? '#0066CC' : '#F1F5F9'}
            />
          </View>
        ) : (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Biometric hardware or enrollment is not available on this device.
            </Text>
          </View>
        )}
      </View>

      {/* Observability Diagnostics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Observability Diagnostics</Text>
        <Text style={styles.cardDescription}>
          Verify real-time Sentry exception capture, breadcrumbs, and error reporting.
        </Text>
        <TouchableOpacity
          role="button"
          accessibilityRole="button"
          style={styles.testSentryButton}
          onPress={() => {
            observability.addBreadcrumb({
              category: 'diagnostics',
              level: 'info',
              message: 'Diagnostic test event triggered by user',
            });
            const eventId = observability.captureException(
              new Error('Test Sentry Diagnostic Error from Mobile Boilerplate')
            );
            Alert.alert(
              'Sentry Event Sent',
              `Diagnostic error captured successfully!${eventId ? `\nEvent ID: ${eventId}` : ''}`
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.testSentryButtonText}>Send Test Sentry Event</Text>
        </TouchableOpacity>
      </View>

      {/* Session Management Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity
          role="button"
          accessibilityRole="button"
          style={styles.logoutButton}
          onPress={() => logout()}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
          <Text style={styles.logoutSubtext}>
            {isBiometricsEnabled
              ? 'Keeps biometric token in SecureStore to reconnect without password'
              : 'Clears active session'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          role="button"
          accessibilityRole="button"
          style={styles.forgetButton}
          onPress={() => forgetSavedAccount()}
          activeOpacity={0.7}
        >
          <Text style={styles.forgetButtonText}>Forget Account & Clear SecureStore</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sessionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  sessionIcon: {
    fontSize: 26,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sessionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  authBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  authBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 20,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggleDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
  },
  warningText: {
    color: '#B45309',
    fontSize: 13,
  },
  actionsCard: {
    gap: 12,
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutSubtext: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  forgetButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  forgetButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 14,
  },
  testSentryButton: {
    backgroundColor: '#361543',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  testSentryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
