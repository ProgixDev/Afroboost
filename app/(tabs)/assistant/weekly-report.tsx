import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, Checkbox, BlurHeader, EmptyState, Skeleton } from '@/components/ui';
import { GlowCard } from '@/components/brand/GlowCard';
import { AIOrb } from '@/components/brand/AIOrb';
import { MiniBarChart } from '@/components/domain/MiniBarChart';
import { BarChart3 } from 'lucide-react-native';
import { useReports } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTheme } from '@/lib/theme';

export default function WeeklyReport({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const lng = useSettingsStore((s) => s.language);
  const query = useReports();
  const report = query.data?.[0];
  const [checked, setChecked] = useState<boolean[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Seed action checkboxes once the report loads.
  if (report && !seeded) {
    setChecked(report.actions.map((a) => a.done));
    setSeeded(true);
  }

  if (!report) {
    const placeholder = query.isLoading ? (
      <View style={{ padding: 20, gap: 14 }}>
        <Skeleton height={120} style={{ borderRadius: 18 }} />
        <Skeleton height={90} style={{ borderRadius: 18 }} />
        <Skeleton height={90} style={{ borderRadius: 18 }} />
      </View>
    ) : (
      <EmptyState icon={BarChart3} title="Aucun rapport" description="Votre premier rapport hebdomadaire arrive bientôt." />
    );
    if (embedded) return placeholder;
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <BlurHeader back title={t('assistant.tabs.report')} />
        {placeholder}
      </View>
    );
  }

  const Body = (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 110 }}>
      <View>
        <Text variant="overline" color="mutedFg">Rapport hebdomadaire</Text>
        <Text variant="display" style={{ fontSize: 36, marginTop: 6 }}>Votre semaine{'\n'}<Text variant="display" style={{ color: c.accent, fontSize: 36 }}>en chiffres.</Text></Text>
        <Text variant="serifItalic" color="muted" style={{ marginTop: 8 }}>
          {formatDate(report.weekStart, 'PP', lng)} → {formatDate(report.weekEnd, 'PP', lng)}
        </Text>
      </View>

      <GlowCard tone="emerald">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AIOrb size={20} />
          <Text variant="overline" color="muted">{t('assistant.report.trend')}</Text>
        </View>
        <Text variant="serifItalic" style={{ fontSize: 18, lineHeight: 28, marginBottom: 16 }}>
          "{report.trend.summary}"
        </Text>
        <MiniBarChart data={report.trend.series} labels={['L', 'M', 'M', 'J', 'V', 'S', 'D']} />
      </GlowCard>

      <Card>
        <Text variant="overline" color="mutedFg">{t('assistant.report.wins')}</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          {report.wins.map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.success, marginTop: 8 }} />
              <Text style={{ flex: 1 }}>{w}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="overline" color="mutedFg">{t('assistant.report.issues')}</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          {report.issues.map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.warning, marginTop: 8 }} />
              <Text style={{ flex: 1 }}>{w}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="overline" color="mutedFg" style={{ marginBottom: 12 }}>{t('assistant.report.actions')}</Text>
        <View style={{ gap: 14 }}>
          {report.actions.map((a, i) => (
            <Checkbox
              key={a.id}
              checked={checked[i]!}
              onChange={(v) => setChecked((arr) => arr.map((x, j) => (j === i ? v : x)))}
              label={a.text}
            />
          ))}
        </View>
      </Card>

      <Text variant="caption" color="muted" center>
        {t('assistant.report.footer', { date: formatDate(new Date(), 'PP', lng) })}
      </Text>
    </ScrollView>
  );

  if (embedded) return Body;
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader back title={t('assistant.tabs.report')} />
      {Body}
    </View>
  );
}
