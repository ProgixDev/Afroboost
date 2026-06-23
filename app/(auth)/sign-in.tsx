import React, { useState } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Input, Button, FloatingBack } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useTheme } from '@/lib/theme';

export default function SignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const onboarded = useOnboardingStore((s) => s.isComplete);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    if (!email || !pw) {
      Alert.alert(t('common.error'), t('errors.required'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email, pw);
      router.replace(onboarded ? '/(tabs)' : '/(onboarding)/welcome-video');
    } catch (e) {
      Alert.alert(t('auth.signIn.title'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      if (useAuthStore.getState().isAuthenticated) {
        router.replace(onboarded ? '/(tabs)' : '/(onboarding)/welcome-video');
      }
    } catch (e) {
      Alert.alert('Google sign-in failed', e instanceof Error ? e.message : String(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FloatingBack />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32, gap: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16 }}>
          <Logo width={300} />
          <Text variant="overline" color="mutedFg">Bon retour</Text>
          <Text variant="displayLg" style={{ fontSize: 48, lineHeight: 52 }}>Heureux de{'\n'}vous <Text variant="displayLg" style={{ color: c.accent, fontSize: 48, lineHeight: 52 }}>revoir.</Text></Text>
        </View>
        <View style={{ gap: 22 }}>
          <Input
            label={t('auth.signIn.emailLabel')}
            placeholder="vous@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label={t('auth.signIn.passwordLabel')}
            placeholder="••••••••"
            password
            value={pw}
            onChangeText={setPw}
          />
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: c.accent, fontFamily: 'Inter_500Medium' }}>{t('auth.signIn.forgot')}</Text>
          </Pressable>
        </View>
        <View style={{ gap: 12 }}>
          <Button title={t('auth.signIn.cta')} onPress={submit} loading={loading} fullWidth />
          <Button
            title="Continuer avec Google"
            variant="outline"
            onPress={submitGoogle}
            loading={googleLoading}
            fullWidth
          />
          <Pressable onPress={() => router.replace('/(auth)/sign-up')} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text color="muted">{t('auth.signIn.noAccount')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
