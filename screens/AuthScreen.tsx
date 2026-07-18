import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Enter your name to start.');
      return;
    }
    setBusy(true);
    try {
      await signIn(name);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🍺</Text>
        <Text style={styles.title}>Beerlingo</Text>
        <Text style={styles.subtitle}>
          Enter your name to start. Same name, same streak — every time.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="go"
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          editable={!busy}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Start drinking 🍺</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logo: { fontSize: 56, textAlign: 'center' },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  error: { color: colors.danger, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#000', fontSize: 17, fontWeight: '700' },
});
