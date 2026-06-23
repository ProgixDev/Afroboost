import React from 'react';
import { View, Pressable } from 'react-native';
import { Check, Lock } from 'lucide-react-native';
import { Text, Pill } from '@/components/ui';
import { useTheme, radius } from '@/lib/theme';

export type PlanCardProps = {
  name: string;
  price: string;
  pricePeriod: string;
  features: string[];
  selected?: boolean;
  popular?: boolean;
  comingSoon?: boolean;
  onPress?: () => void;
};

export function PlanCard({ name, price, pricePeriod, features, selected, popular, comingSoon, onPress }: PlanCardProps) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={comingSoon}
      onPress={onPress}
      style={{
        position: 'relative',
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: selected ? c.accent : c.border,
        backgroundColor: selected ? c.surfaceHigh : c.surfaceElevated,
        padding: 22,
        gap: 14,
        opacity: comingSoon ? 0.5 : 1,
      }}
    >
      {popular ? (
        <View
          style={{
            position: 'absolute',
            top: -1,
            right: 18,
            paddingHorizontal: 12,
            paddingVertical: 4,
            backgroundColor: c.accent,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
          }}
        >
          <Text variant="overline" style={{ color: c.accentFg, fontSize: 10 }}>Le plus populaire</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="h2">{name}</Text>
        {comingSoon ? (
          <Pill tone="muted" leftIcon={<Lock size={12} color={c.muted} />}>Bientôt</Pill>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text variant="metric" style={{ color: c.accent }}>{price}</Text>
        <Text color="muted">{pricePeriod}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: c.border }} />
      <View style={{ gap: 8 }}>
        {features.map((f) => (
          <View key={f} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ width: 18, height: 18, borderRadius: 999, backgroundColor: c.primary + '33', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              <Check size={11} color={c.primary} strokeWidth={3} />
            </View>
            <Text style={{ flex: 1 }}>{f}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
