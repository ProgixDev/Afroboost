import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { AnimatedCheckmark } from '@/components/animations/AnimatedCheckmark';
import { KenteTexture } from '@/components/brand/KenteTexture';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { celebrate } from '@/stores/celebrationStore';
import { useTheme } from '@/lib/theme';

export default function Done() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const complete = useOnboardingStore((s) => s.complete);

  useEffect(() => {
    complete();
  }, [complete]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LinearGradient
        colors={[c.primary + '33', c.background, c.background] as [string, string, string]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[c.accent + '2A', 'transparent'] as [string, string]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.3 }}
        style={StyleSheet.absoluteFill}
      />
      <KenteTexture tone="mixed" opacity={0.07} />
      <View style={{ flex: 1, padding: 32, paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }}>
        <View style={{ alignItems: 'center' }}>
          <Logo width={300} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <AnimatedCheckmark size={140} />
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text variant="overline" color="mutedFg">Configuration</Text>
            <Text variant="displayLg" center>Vous êtes prêt.</Text>
            <Text variant="serifItalic" color="muted" center style={{ fontSize: 18, lineHeight: 26, paddingHorizontal: 20 }}>
              {t('onboarding.done.subtitle')}
            </Text>
          </View>
        </View>
        <Button
          title={t('onboarding.done.cta')}
          variant="gold"
          fullWidth
          pill={false}
          onPress={() => {
            celebrate({ title: 'Bienvenue !', message: 'Votre console AfroBoost est prête.' });
            router.replace('/(tabs)');
          }}
        />
      </View>
    </View>
  );
}
