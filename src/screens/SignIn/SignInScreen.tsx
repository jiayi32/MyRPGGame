import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePlayerStore } from '@/stores';

const DEV_PREFILL_EMAIL = 'testuser@test.com';
const DEV_PREFILL_PASSWORD = '1234567890';

type Mode = 'sign_in' | 'register';

export function SignInScreen() {
  const playerStatus = usePlayerStore((state) => state.status);
  const playerError = usePlayerStore((state) => state.error);
  const signIn = usePlayerStore((state) => state.signIn);
  const register = usePlayerStore((state) => state.register);

  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState<string>(__DEV__ ? DEV_PREFILL_EMAIL : '');
  const [password, setPassword] = useState<string>(__DEV__ ? DEV_PREFILL_PASSWORD : '');

  const isWorking = playerStatus === 'signing_in' || playerStatus === 'initializing';
  const canSubmit = email.length > 0 && password.length > 0 && !isWorking;

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    try {
      if (mode === 'sign_in') {
        await signIn(email, password);
      } else {
        await register(email, password);
      }
    } catch {
      // Error is surfaced via playerStore.error.
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>MyRPGGame</Text>
        <Text style={styles.subtitle}>
          {mode === 'sign_in' ? 'Sign in to continue' : 'Create a new account'}
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!isWorking}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          editable={!isWorking}
        />

        {playerError !== null && <Text style={styles.error}>{playerError}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={() => {
            handleSubmit().catch(() => undefined);
          }}
          disabled={!canSubmit}
        >
          {isWorking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {mode === 'sign_in' ? 'Sign In' : 'Register'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setMode(mode === 'sign_in' ? 'register' : 'sign_in')}
          disabled={isWorking}
        >
          <Text style={styles.secondaryBtnText}>
            {mode === 'sign_in' ? 'Need an account? Register' : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        {__DEV__ && (
          <Text style={styles.devHint}>
            DEV mode: credentials prefilled for the test account.
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.1)',
    padding: 24,
    gap: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: '#aabbcc',
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#889999',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
  },
  error: {
    fontSize: 13,
    color: '#a10f0f',
    backgroundColor: '#fde8e8',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: '#ffb000',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  primaryBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 12, color: '#ffb000', fontWeight: '500' },
  devHint: {
    fontSize: 11,
    color: '#667788',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
