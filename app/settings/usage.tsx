import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ArrowUpRight, Sparkles } from 'lucide-react-native';
import { ScreenContainer, Header } from '@/components/layout';
import { Card, Text, IconTile } from '@/components/ui';
import { UsageBar } from '@/components/domain/UsageBar';
import { useUsage, useUsageAlerts } from '@/lib/api';
import { mockUsage } from '@/mocks';
import { useTheme } from '@/lib/theme';

const METRIC_LABELS: Record<string, string> = {
  posts: 'Publications',
  calls: 'Appels gérés',
  sms: 'SMS envoyés',
  ai: 'Requêtes IA',
};

export default function UsageSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const { data } = useUsage();
  const usage = data ?? mockUsage;
  const alerts = useUsageAlerts(0.8);

  const upgrade = (reason?: string) =>
    router.push({ pathname: '/settings/upgrade', params: reason ? { reason } : {} });

  return (
    <ScreenContainer scroll>
      <Header back title={t('settings.usage')} />

      {alerts.length > 0 ? (
        <Pressable onPress={() => upgrade(`${METRIC_LABELS[alerts[0]!.key]} : ${Math.round(alerts[0]!.ratio * 100)} % utilisé`)}>
          <Card highlight padding={14}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile icon={Sparkles} tone="accent" size="md" gradient />
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis">{t('upgrade.nearLimit')}</Text>
                <Text variant="caption" color="muted">{t('upgrade.subtitle')}</Text>
              </View>
              <ArrowUpRight size={18} color={c.accent} />
            </View>
          </Card>
        </Pressable>
      ) : null}

      <Card>
        <Text variant="caption" color="muted">Période en cours</Text>
        <Text variant="bodyEmphasis">{usage.periodStart} → {usage.periodEnd}</Text>
      </Card>
      <Card>
        <View style={{ gap: 16 }}>
          <UsageBar label={METRIC_LABELS.posts!} used={usage.posts.used} limit={usage.posts.limit} onUpgrade={() => upgrade()} />
          <UsageBar label={METRIC_LABELS.calls!} used={usage.calls.used} limit={usage.calls.limit} onUpgrade={() => upgrade()} />
          <UsageBar label={METRIC_LABELS.sms!} used={usage.sms.used} limit={usage.sms.limit} onUpgrade={() => upgrade()} />
          <UsageBar label={METRIC_LABELS.ai!} used={usage.ai.used} limit={usage.ai.limit} onUpgrade={() => upgrade()} />
        </View>
      </Card>
    </ScreenContainer>
  );
}
