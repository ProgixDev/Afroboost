import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { Text, Button, FloatingBack, Pill, Card, IconTile } from '@/components/ui';
import { PlanCard } from '@/components/domain/PlanCard';
import { PLAN_MONTHLY, PLAN_FEATURES, annualPrice } from '@/lib/plans';
import { startCheckout } from '@/lib/api';
import type { Plan } from '@/types';
import { useTheme } from '@/lib/theme';
import { haptic } from '@/lib/utils';

export default function Upgrade() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ reason?: string }>();
  const [plan, setPlan] = useState<Plan>('performance');
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState(false);

  const slide = useSharedValue(0);
  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(slide.value, { duration: 220 }) }],
  }));

  const price = (n: number) => (annual ? `${annualPrice(n)} $` : `${n} $`);
  const period = annual ? t('auth.plan.perYear') : t('auth.plan.perMonth');
  const planLabel: Record<Plan, string> = {
    decouverte: t('auth.plan.decouverte'),
    performance: t('auth.plan.performance'),
    premium: t('auth.plan.premium'),
  };

  const onCheckout = async () => {
    haptic('medium');
    setBusy(true);
    try {
      const { opened } = await startCheckout(plan, annual);
      if (!opened) {
        router.push({ pathname: '/(auth)/payment-mock', params: { plan, annual: annual ? '1' : '0' } });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FloatingBack />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32, gap: 22 }}>
        <View style={{ gap: 10 }}>
          <IconTile icon={Sparkles} tone="accent" size="lg" gradient />
          <Text variant="display">{t('upgrade.title')}</Text>
          <Text variant="serifItalic" color="muted">{t('upgrade.subtitle')}</Text>
        </View>

        {params.reason ? (
          <Card highlight padding={14}>
            <Text variant="overline" style={{ color: c.warning }}>{t('upgrade.nearLimit')}</Text>
            <Text variant="body" style={{ marginTop: 4 }}>{params.reason}</Text>
          </Card>
        ) : null}

        {/* Billing period toggle */}
        <View
          style={{
            alignSelf: 'flex-start', flexDirection: 'row',
            backgroundColor: c.surfaceElevated, borderRadius: 999,
            borderWidth: 1, borderColor: c.border, padding: 4,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              { position: 'absolute', top: 4, left: 4, bottom: 4, width: 130, backgroundColor: c.accent, borderRadius: 999 },
              sliderStyle,
            ]}
          />
          {(['monthly', 'annual'] as const).map((k, i) => {
            const active = (k === 'annual') === annual;
            return (
              <Pressable
                key={k}
                onPress={() => { setAnnual(k === 'annual'); slide.value = i * 130; haptic('select'); }}
                style={{ width: 130, paddingVertical: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              >
                <Text style={{ color: active ? c.accentFg : c.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                  {t(`auth.plan.${k}`)}
                </Text>
                {k === 'annual' ? (
                  <Pill tone={active ? 'default' : 'success'} dot={!active}>
                    <Text variant="caption" style={{ color: active ? c.accentFg : c.success }}>{t('auth.plan.annualBadge')}</Text>
                  </Pill>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 14 }}>
          <PlanCard
            name={planLabel.decouverte}
            price={price(PLAN_MONTHLY.decouverte)}
            pricePeriod={period}
            features={PLAN_FEATURES.decouverte}
            selected={plan === 'decouverte'}
            onPress={() => { setPlan('decouverte'); haptic('select'); }}
          />
          <PlanCard
            name={planLabel.performance}
            price={price(PLAN_MONTHLY.performance)}
            pricePeriod={period}
            popular
            features={PLAN_FEATURES.performance}
            selected={plan === 'performance'}
            onPress={() => { setPlan('performance'); haptic('select'); }}
          />
          <PlanCard
            name={planLabel.premium}
            price={price(PLAN_MONTHLY.premium)}
            pricePeriod={period}
            comingSoon
            features={PLAN_FEATURES.premium}
          />
        </View>

        <View style={{ gap: 8, marginTop: 4 }}>
          <Button
            title={`${t('upgrade.cta')} · ${planLabel[plan]}`}
            variant="gold"
            onPress={onCheckout}
            loading={busy}
            fullWidth
          />
          <Text variant="caption" color="muted" center>{t('auth.plan.trial')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
