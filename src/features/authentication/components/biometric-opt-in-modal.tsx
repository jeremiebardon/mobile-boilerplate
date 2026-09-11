import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/auth-context';

export function BiometricOptInModal() {
  const {
    showBiometricOptIn,
    biometricLabel,
    enableBiometrics,
    dismissBiometricOptIn,
  } = useAuth();

  if (!showBiometricOptIn) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={showBiometricOptIn}
      onRequestClose={dismissBiometricOptIn}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🔐</Text>
          </View>

          <Text style={styles.title}>Enable {biometricLabel}?</Text>
          <Text style={styles.description}>
            Sign in faster and securely next time using {biometricLabel} without having to re-enter
            your password.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              role="button"
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() => enableBiometrics()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Enable {biometricLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              role="button"
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => dismissBiometricOptIn()}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
