import React, { useState } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Text, Button, FloatingBack } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { connectMeta, ConnectCancelledError } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { celebrate } from '@/stores/celebrationStore';
import { haptic } from '@/lib/utils';
import { useTheme, radius } from '@/lib/theme';

const FACEBOOK_LOGO = require('../../assets/images/facebook.png');
const INSTAGRAM_LOGO = require('../../assets/images/instagram.png');

export default function ConnectSocials() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toggle = useOnboardingStore((s) => s.toggleAccount);
  const connected = useOnboardingStore((s) => !!s.connectedAccounts.facebook);
  const [busy, setBusy] = useState(false);

  // A single Facebook (Login for Business) sign-in connects BOTH Facebook Pages
  // and the linked Instagram accounts, so we present one action — not two.
  const connect = async () => {
    if (busy || connected) return;
    setBusy(true);
    try {
      await connectMeta();
      toggle('facebook', true);
      toggle('instagram', true);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      haptic('success');
      celebrate({ title: t('onboarding.connectSocials.businessTitle') });
    } catch (e) {
      // A plain cancel isn't an error; surface anything else.
      if (!(e instanceof ConnectCancelledError)) {
        toast({
          title: (e as Error).message || t('onboarding.connectSocials.connectFailed'),
          variant: 'danger',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FloatingBack />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32, gap: 24 }}>
        <Logo width={300} />
        <View style={{ gap: 8 }}>
          <Text variant="overline" color="mutedFg">Réseaux sociaux</Text>
          <Text variant="display" style={{ fontSize: 36 }}>
            Vos canaux,{'\n'}
            <Text variant="display" style={{ color: c.accent, fontSize: 36 }}>connectés.</Text>
          </Text>
          <Text variant="serifItalic" color="muted" style={{ marginTop: 6 }}>
            {t('onboarding.connectSocials.subtitle')}
          </Text>
        </View>

        {/* Combined Facebook + Instagram business connect */}
        <View
          style={{
            padding: 18,
            gap: 14,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: connected ? c.primary : c.border,
            backgroundColor: c.surfaceElevated,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={FACEBOOK_LOGO} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <Image source={INSTAGRAM_LOGO} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <View style={{ flex: 1 }} />
            {connected ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} color={c.primaryFg} strokeWidth={3} />
                </View>
                <Text variant="bodyEmphasis" color="success">
                  {t('onboarding.connectSocials.connectedBadge')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="bodyEmphasis">{t('onboarding.connectSocials.businessTitle')}</Text>
          <Text variant="caption" color="muted">
            {connected
              ? t('onboarding.connectSocials.businessConnected')
              : t('onboarding.connectSocials.businessDesc')}
          </Text>
          {!connected ? (
            <Button
              title={t('onboarding.connectSocials.businessCta')}
              loading={busy}
              fullWidth
              pill={false}
              onPress={connect}
            />
          ) : null}
        </View>

        <Text variant="caption" color="muted">{t('onboarding.connectSocials.explainer')}</Text>
        <View style={{ flex: 1 }} />
        <Button
          title={t('common.continue')}
          fullWidth
          pill={false}
          onPress={() => router.push('/(onboarding)/connect-google')}
        />
      </ScrollView>
    </View>
  );
}
