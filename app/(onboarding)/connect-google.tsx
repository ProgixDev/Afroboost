import React from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, FloatingBack } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { MockOAuthButton } from '@/components/domain/MockOAuthButton';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { connectGoogle } from '@/lib/api';
import { useTheme } from '@/lib/theme';

export default function ConnectGoogle() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const toggle = useOnboardingStore((s) => s.toggleAccount);
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FloatingBack />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32, gap: 24 }}>
        <Logo width={300} />
        <View style={{ gap: 8 }}>
          <Text variant="overline" color="mutedFg">Avis Google</Text>
          <Text variant="display" style={{ fontSize: 36 }}>Vos avis,{'\n'}<Text variant="display" style={{ color: c.accent, fontSize: 36 }}>répondus.</Text></Text>
          <Text variant="serifItalic" color="muted" style={{ marginTop: 6 }}>{t('onboarding.connectGoogle.subtitle')}</Text>
        </View>
        <MockOAuthButton provider="google" onConnect={connectGoogle} onPress={() => toggle('google', true)} />
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={t('common.skip')} variant="outline" pill={false} onPress={() => router.push('/(onboarding)/connect-calendar')} />
          <View style={{ flex: 1 }}>
            <Button title={t('common.continue')} fullWidth pill={false} onPress={() => router.push('/(onboarding)/connect-calendar')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
