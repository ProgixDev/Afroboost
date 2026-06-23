import React from 'react';
import { View, Pressable } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { Text, ProgressBar } from '@/components/ui';
import { useTheme } from '@/lib/theme';

export function UsageBar({
  label,
  used,
  limit,
  unit,
  onUpgrade,
}: {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  onUpgrade?: () => void;
}) {
  const { c } = useTheme();
  const ratio = Math.max(0, Math.min(1, used / limit));
  const tone = ratio >= 0.95 ? 'danger' : ratio >= 0.8 ? 'warning' : 'default';
  const showUpgrade = !!onUpgrade && ratio >= 0.8;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="overline" color="mutedFg">{label}</Text>
        <Text variant="mono" color="foreground" style={{ fontSize: 13 }}>{used} / {limit} {unit ?? ''}</Text>
      </View>
      <ProgressBar value={ratio} tone={tone as any} />
      {showUpgrade ? (
        <Pressable
          onPress={onUpgrade}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <ArrowUpRight size={14} color={c.accent} />
          <Text style={{ color: c.accent, fontFamily: 'Inter_600SemiBold' }}>Mettre à niveau</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
